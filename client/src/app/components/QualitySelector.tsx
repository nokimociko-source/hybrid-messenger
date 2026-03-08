import { logger } from '../utils/logger';
// Компонент для выбора качества изображения перед отправкой

import React, { useState, useEffect } from 'react';
import { Icon, Icons, Button, Spinner } from 'folds';
import { useImageCompressor, formatFileSize, calculateCompressionPercent } from '../hooks/useImageCompressor';
import type { ImageQuality } from '../types/mediaEnhancements';
import './QualitySelector.css';

interface QualitySelectorProps {
  file: File;
  onQualitySelect: (quality: ImageQuality, processedFile: File) => void;
  onCancel: () => void;
}

export function QualitySelector({ file, onQualitySelect, onCancel }: QualitySelectorProps) {
  const { compressImage, shouldCompress, isCompressing, progress } = useImageCompressor();
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [compressedFile, setCompressedFile] = useState<File | null>(null);
  const [compressedSize, setCompressedSize] = useState<number | null>(null);

  useEffect(() => {
    // Создаём preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // Автоматически сжимаем изображение для предпросмотра
    if (shouldCompress(file)) {
      compressImage(file)
        .then((result) => {
          setCompressedFile(result.file);
          setCompressedSize(result.compressedSize);
        })
        .catch((err) => {
          logger.error('Failed to compress image:', err);
        });
    }

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file, compressImage, shouldCompress]);

  const handleSelect = (quality: ImageQuality) => {
    if (quality === 'original') {
      onQualitySelect('original', file);
    } else if (compressedFile) {
      onQualitySelect('compressed', compressedFile);
    } else {
      // Если сжатие ещё не завершено, используем оригинал
      onQualitySelect('original', file);
    }
  };

  const originalSize = file.size;
  const compressionPercent = compressedSize 
    ? calculateCompressionPercent(originalSize, compressedSize)
    : 0;

  const showCompressionOption = shouldCompress(file);

  return (
    <div className="quality-selector">
      <div className="quality-selector__header">
        <h3 className="quality-selector__title">Выберите качество</h3>
        <button
          className="quality-selector__close"
          onClick={onCancel}
          aria-label="Close"
        >
          <Icon src={Icons.Cross} />
        </button>
      </div>

      <div className="quality-selector__preview">
        <img src={previewUrl} alt="Preview" className="quality-selector__image" />
      </div>

      <div className="quality-selector__options">
        <button
          className="quality-selector__option"
          onClick={() => handleSelect('original')}
        >
          <div className="quality-selector__option-icon">
            <Icon src={Icons.Photo} />
          </div>
          <div className="quality-selector__option-content">
            <div className="quality-selector__option-title">Оригинал</div>
            <div className="quality-selector__option-subtitle">
              {formatFileSize(originalSize)}
            </div>
          </div>
          <Icon src={Icons.ChevronRight} />
        </button>

        {showCompressionOption && (
          <button
            className="quality-selector__option quality-selector__option--recommended"
            onClick={() => handleSelect('compressed')}
            disabled={isCompressing}
          >
            <div className="quality-selector__option-icon">
              <Icon src={Icons.Check} />
            </div>
            <div className="quality-selector__option-content">
              <div className="quality-selector__option-title">
                Сжатое
                <span className="quality-selector__badge">Рекомендуется</span>
              </div>
              <div className="quality-selector__option-subtitle">
                {isCompressing ? (
                  <span className="quality-selector__progress">
                    <Spinner size="100" />
                    Сжатие... {Math.round(progress)}%
                  </span>
                ) : compressedSize ? (
                  <>
                    {formatFileSize(compressedSize)}
                    <span className="quality-selector__savings">
                      {' '}(-{compressionPercent}%)
                    </span>
                  </>
                ) : (
                  'Вычисление...'
                )}
              </div>
            </div>
            <Icon src={Icons.ChevronRight} />
          </button>
        )}
      </div>

      {!showCompressionOption && (
        <div className="quality-selector__info">
          <Icon src={Icons.Info} size="100" />
          <span>Файл меньше 200 КБ, сжатие не требуется</span>
        </div>
      )}
    </div>
  );
}

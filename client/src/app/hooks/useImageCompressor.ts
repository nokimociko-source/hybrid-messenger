// Хук для сжатия изображений

import { useState, useCallback } from 'react';
import type { CompressionOptions, CompressionResult } from '../types/mediaEnhancements';

// Минимальный размер файла для сжатия (200KB)
const MIN_SIZE_FOR_COMPRESSION = 200 * 1024;

// Поддерживаемые форматы
const SUPPORTED_FORMATS = ['image/jpeg', 'image/png', 'image/webp'];

export function useImageCompressor() {
  const [isCompressing, setIsCompressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Проверяет, нужно ли сжимать изображение
   */
  const shouldCompress = useCallback((file: File): boolean => {
    // Проверка размера
    if (file.size < MIN_SIZE_FOR_COMPRESSION) {
      return false;
    }

    // Проверка формата
    if (!SUPPORTED_FORMATS.includes(file.type)) {
      return false;
    }

    return true;
  }, []);

  /**
   * Сжимает изображение
   */
  const compressImage = useCallback(
    async (file: File, options?: CompressionOptions): Promise<CompressionResult> => {
      try {
        setIsCompressing(true);
        setProgress(0);
        setError(null);

        const originalSize = file.size;

        // Проверка необходимости сжатия
        if (!shouldCompress(file)) {
          return {
            file,
            originalSize,
            compressedSize: originalSize,
            compressionRatio: 1,
          };
        }

        // Настройки по умолчанию
        const {
          maxSizeMB = 1,
          maxWidthOrHeight = 1920,
          quality = 0.85,
        } = options || {};

        setProgress(10);

        // Создаём canvas для сжатия
        const compressed = await compressImageWithCanvas(
          file,
          maxWidthOrHeight,
          quality,
          (p) => setProgress(10 + p * 0.9)
        );

        setProgress(100);

        const compressedSize = compressed.size;
        const compressionRatio = compressedSize / originalSize;

        return {
          file: compressed,
          originalSize,
          compressedSize,
          compressionRatio,
        };
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to compress image');
        setError(error);
        throw error;
      } finally {
        setIsCompressing(false);
        setProgress(0);
      }
    },
    [shouldCompress]
  );

  /**
   * Получает размеры изображения
   */
  const getImageDimensions = useCallback(
    async (file: File): Promise<{ width: number; height: number }> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
          URL.revokeObjectURL(url);
          resolve({ width: img.width, height: img.height });
        };

        img.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error('Failed to load image'));
        };

        img.src = url;
      });
    },
    []
  );

  return {
    compressImage,
    getImageDimensions,
    shouldCompress,
    isCompressing,
    progress,
    error,
  };
}

/**
 * Сжимает изображение используя Canvas API
 */
async function compressImageWithCanvas(
  file: File,
  maxDimension: number,
  quality: number,
  onProgress: (progress: number) => void
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      try {
        URL.revokeObjectURL(url);
        onProgress(0.3);

        // Вычисляем новые размеры с сохранением пропорций
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = (height / width) * maxDimension;
            width = maxDimension;
          } else {
            width = (width / height) * maxDimension;
            height = maxDimension;
          }
        }

        onProgress(0.5);

        // Создаём canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Failed to get canvas context');
        }

        // Рисуем изображение
        ctx.drawImage(img, 0, 0, width, height);
        onProgress(0.7);

        // Конвертируем в Blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to create blob'));
              return;
            }

            onProgress(0.9);

            // Создаём новый File
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });

            onProgress(1);
            resolve(compressedFile);
          },
          file.type,
          quality
        );
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Форматирует размер файла для отображения
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

/**
 * Вычисляет процент сжатия
 */
export function calculateCompressionPercent(original: number, compressed: number): number {
  if (original === 0) return 0;
  return Math.round(((original - compressed) / original) * 100);
}

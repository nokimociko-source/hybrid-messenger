import { logger } from '../utils/logger';
import React, { useState, useEffect, memo } from 'react';
import { MessageParser, StickerReference } from '../utils/MessageParser';
import { ImageCache } from '../utils/ImageCache';

interface StickerMessageProps {
  content: string;
}

export const StickerMessage = memo(function StickerMessage({ content }: StickerMessageProps) {
  const [parsedMessage, setParsedMessage] = useState(() => MessageParser.parse(content));
  const [validatedRefs, setValidatedRefs] = useState<Map<string, boolean>>(new Map());
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [retryingImages, setRetryingImages] = useState<Set<string>>(new Set());

  useEffect(() => {
    const parsed = MessageParser.parse(content);
    setParsedMessage(parsed);

    // Validate sticker references
    const validateRefs = async () => {
      const refs = parsed.content
        .filter(item => item.type === 'sticker' && item.stickerRef)
        .map(item => item.stickerRef!);

      const validationResults = new Map<string, boolean>();

      for (const ref of refs) {
        const key = `${ref.packId}:${ref.stickerId}`;
        const isValid = await MessageParser.validateStickerRef(ref);
        validationResults.set(key, isValid);

        // Preload valid sticker images
        if (isValid && ref.imageUrl) {
          ImageCache.preload(ref.imageUrl).catch(err => {
            logger.error('Failed to preload sticker:', err);
          });
        }
      }

      setValidatedRefs(validationResults);
    };

    validateRefs();
  }, [content]);

  const handleImageLoad = (imageUrl: string) => {
    setLoadedImages(prev => new Set(prev).add(imageUrl));
    setFailedImages(prev => {
      const next = new Set(prev);
      next.delete(imageUrl);
      return next;
    });
  };

  const handleImageError = (imageUrl: string) => {
    setFailedImages(prev => new Set(prev).add(imageUrl));
  };

  const handleRetry = async (imageUrl: string) => {
    setRetryingImages(prev => new Set(prev).add(imageUrl));
    setFailedImages(prev => {
      const next = new Set(prev);
      next.delete(imageUrl);
      return next;
    });

    try {
      await ImageCache.preload(imageUrl);
      setLoadedImages(prev => new Set(prev).add(imageUrl));
    } catch (err) {
      logger.error('Retry failed:', err);
      setFailedImages(prev => new Set(prev).add(imageUrl));
    } finally {
      setRetryingImages(prev => {
        const next = new Set(prev);
        next.delete(imageUrl);
        return next;
      });
    }
  };

  const isStickerOnly = parsedMessage.type === 'sticker';

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: '4px'
    }}>
      {parsedMessage.content.map((item, index) => {
        if (item.type === 'text') {
          return (
            <span key={`text-${index}`} style={{ whiteSpace: 'pre-wrap' }}>
              {item.value}
            </span>
          );
        }

        if (item.type === 'sticker' && item.stickerRef) {
          const ref = item.stickerRef;
          const key = `${ref.packId}:${ref.stickerId}`;
          const isValid = validatedRefs.get(key);
          const size = isStickerOnly ? 256 : 128;

          // Show loading state while validating
          if (isValid === undefined) {
            return (
              <div
                key={`sticker-${index}`}
                style={{
                  width: `${size}px`,
                  height: `${size}px`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px',
                  color: 'rgba(255, 255, 255, 0.3)',
                  fontSize: '12px'
                }}
              >
                Загрузка...
              </div>
            );
          }

          // Show error placeholder for invalid stickers
          if (!isValid || !ref.imageUrl) {
            return (
              <div
                key={`sticker-${index}`}
                style={{
                  width: `${size}px`,
                  height: `${size}px`,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(255, 0, 0, 0.1)',
                  border: '1px solid rgba(255, 0, 0, 0.3)',
                  borderRadius: '8px',
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontSize: '12px',
                  gap: '4px'
                }}
                title="Стикер не найден"
              >
                <span style={{ fontSize: '24px' }}>❌</span>
                <span>Стикер недоступен</span>
              </div>
            );
          }

          // Show retry button for failed images
          if (failedImages.has(ref.imageUrl)) {
            return (
              <div
                key={`sticker-${index}`}
                style={{
                  width: `${size}px`,
                  height: `${size}px`,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(255, 140, 0, 0.1)',
                  border: '1px solid rgba(255, 140, 0, 0.3)',
                  borderRadius: '8px',
                  color: 'rgba(255, 255, 255, 0.6)',
                  fontSize: '11px',
                  gap: '6px',
                  padding: '8px'
                }}
              >
                <span style={{ fontSize: '20px' }}>⚠️</span>
                <span style={{ textAlign: 'center' }}>Ошибка загрузки</span>
                <button
                  onClick={() => handleRetry(ref.imageUrl!)}
                  disabled={retryingImages.has(ref.imageUrl)}
                  style={{
                    padding: '4px 8px',
                    background: 'rgba(0, 242, 255, 0.2)',
                    border: '1px solid rgba(0, 242, 255, 0.4)',
                    borderRadius: '4px',
                    color: 'rgba(0, 242, 255, 0.9)',
                    fontSize: '10px',
                    cursor: retryingImages.has(ref.imageUrl) ? 'not-allowed' : 'pointer',
                    opacity: retryingImages.has(ref.imageUrl) ? 0.5 : 1
                  }}
                >
                  {retryingImages.has(ref.imageUrl) ? 'Повтор...' : 'Повторить'}
                </button>
              </div>
            );
          }

          // Render valid sticker
          return (
            <div
              key={`sticker-${index}`}
              style={{
                width: `${size}px`,
                height: `${size}px`,
                position: 'relative',
                display: 'inline-block'
              }}
            >
              {!loadedImages.has(ref.imageUrl) && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px',
                  color: 'rgba(255, 255, 255, 0.3)',
                  fontSize: '12px'
                }}>
                  ...
                </div>
              )}
              <img
                src={ref.imageUrl}
                alt="sticker"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  opacity: loadedImages.has(ref.imageUrl) ? 1 : 0,
                  transition: 'opacity 0.2s'
                }}
                onLoad={() => handleImageLoad(ref.imageUrl!)}
                onError={(e) => {
                  handleImageError(ref.imageUrl!);
                  // Hide broken image
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          );
        }

        return null;
      })}
    </div>
  );
});

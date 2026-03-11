import { logger } from '../utils/logger';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useEncryption } from '../context/EncryptionContext';
import { decryptFile } from '../utils/encryption';
import { Spinner } from 'folds';
import { getPresignedViewUrl } from '../utils/s3Client';

type MediaType = 'image' | 'video' | 'audio';
type MediaError = {
  message: string;
  isCodecError?: boolean;
  isKeyError?: boolean;
};

interface EncryptedMediaProps {
  url: string;
  type: MediaType;
  roomId?: string;
  version?: number;
  mimeType?: string;
  encrypted?: boolean;
  style?: React.CSSProperties;
  className?: string;
  controls?: boolean;
  autoPlay?: boolean;
  muted?: boolean;
  playsInline?: boolean;
  onClick?: (url: string) => void;
  circle?: boolean;
  maxWidth?: string | number;
  maxHeight?: string | number;
}

const DEFAULT_MIME_TYPES: Record<MediaType, Record<string, string>> = {
  image: {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
  },
  video: {
    mp4: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime',
  },
  audio: {
    mp3: 'audio/mpeg',
    ogg: 'audio/ogg',
    wav: 'audio/wav',
    m4a: 'audio/mp4',
  },
};

const buttonStyle: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: 8,
  border: '1px solid rgba(0, 242, 255, 0.25)',
  background: 'rgba(0, 242, 255, 0.12)',
  color: '#00f2ff',
  cursor: 'pointer',
  fontSize: 12,
  textDecoration: 'none',
};

export const EncryptedMedia: React.FC<EncryptedMediaProps> = ({
  url,
  type,
  roomId,
  version,
  mimeType,
  encrypted = false,
  style = {},
  className = '',
  controls = true,
  autoPlay = false,
  muted = false,
  playsInline = true,
  onClick,
  circle = false,
  maxWidth,
  maxHeight,
}) => {
  const { getRoomKey, masterKey } = useEncryption();
  const [decryptedUrl, setDecryptedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<MediaError | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const getGuessedMimeType = useCallback((): string | undefined => {
    if (mimeType) return mimeType;

    const cleanUrl = url.split('?')[0].toLowerCase();
    const extension = cleanUrl.split('.').pop()?.toLowerCase();

    if (!extension) return undefined;

    return DEFAULT_MIME_TYPES[type]?.[extension] || undefined;
  }, [url, type, mimeType]);

  const containerStyle = useMemo<React.CSSProperties>(() => ({
    ...style,
    maxWidth: maxWidth || style.maxWidth,
    maxHeight: maxHeight || style.maxHeight,
    borderRadius: circle ? '50%' : style.borderRadius || '12px',
    overflow: 'hidden',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0, 0, 0, 0.2)',
  }), [style, circle, maxWidth, maxHeight]);

  const loadMedia = useCallback(async () => {
    if (!url) {
      setError({ message: 'URL не указан' });
      return;
    }

    // Skip decryption for local blobs (previews) or unencrypted media
    if (!encrypted || url.startsWith('blob:')) {
      try {
        const signedUrl = await getPresignedViewUrl(url);
        setDecryptedUrl(signedUrl);
        logger.debug(`[EncryptedMedia] Using direct (or signed) URL for unencrypted media: ${url}`);
      } catch (err) {
        logger.error('[EncryptedMedia] Failed to get signed URL:', err);
        setError({ message: 'Не удалось получить доступ к медиа' });
      }
      return;
    }

    // Skip decryption if no roomId, version, or masterKey
    if (!roomId || version === undefined || version === null || !masterKey) {
      if (encrypted && masterKey) {
        logger.warn(`[EncryptedMedia] Room is encrypted but message version is ${version}. Using plain URL.`);
      }
      try {
        const signedUrl = await getPresignedViewUrl(url);
        setDecryptedUrl(signedUrl);
      } catch (err) {
        setError({ message: 'Не удалось получить доступ к медиа' });
      }
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Try current version first, then fallback to version 1
      let key = await getRoomKey(roomId, version);
      if (!key && version > 1) {
        key = await getRoomKey(roomId, 1);
      }
      if (!key) {
        throw new Error('Key not found');
      }

      logger.debug(`[EncryptedMedia] Decrypting ${type} with key version ${version}`);

      // Get signed URL for Wasabi
      const fetchUrl = url.includes('wasabisys.com')
        ? await getPresignedViewUrl(url)
        : url;

      const response = await fetch(fetchUrl);
      if (!response.ok) {
        throw new Error(`Ошибка загрузки медиа: ${response.status}`);
      }

      const encryptedBlob = await response.blob();
      const decryptedBlob = await decryptFile(encryptedBlob, key);
      const guessedMime = getGuessedMimeType();

      const blob = guessedMime
        ? new Blob([decryptedBlob], { type: guessedMime })
        : decryptedBlob;

      const objectUrl = URL.createObjectURL(blob);
      objectUrlRef.current = objectUrl;
      setDecryptedUrl(objectUrl);
      logger.debug(`[EncryptedMedia] Decryption successful. MIME: ${guessedMime || 'unknown'}`);
    } catch (err) {
      logger.error('[EncryptedMedia] Decryption failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
      setError({
        message: errorMessage === 'Key not found'
          ? 'Нет ключа для расшифровки'
          : errorMessage.includes('codec')
            ? 'Неподдерживаемый формат медиа'
            : 'Ошибка расшифровки',
        isKeyError: errorMessage === 'Key not found',
        isCodecError: errorMessage.includes('codec'),
      });
    } finally {
      setLoading(false);
    }
  }, [url, type, roomId, version, encrypted, masterKey, getRoomKey, getGuessedMimeType]);

  useEffect(() => {
    loadMedia();

    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [loadMedia]);

  const handleMediaError = useCallback((kind: MediaType, el?: HTMLMediaElement | HTMLImageElement | null) => {
    if (!el) return;

    const mediaError = (el as HTMLMediaElement).error;
    if (!mediaError) return;

    let errorMessage = '';
    const isCodecError = mediaError.code === 4; // MEDIA_ERR_DECODE

    if (isCodecError) {
      errorMessage = kind === 'video'
        ? 'Видео не поддерживается (ошибка кодека). Ваш браузер не может воспроизвести этот формат.'
        : kind === 'audio'
          ? 'Аудио-формат не поддерживается вашим устройством.'
          : 'Не удалось загрузить изображение';
    } else {
      errorMessage = kind === 'video'
        ? 'Не удалось запустить видео'
        : kind === 'audio'
          ? 'Не удалось запустить аудио'
          : 'Не удалось загрузить изображение';
    }

    setError({
      message: errorMessage,
      isCodecError,
    });

    // Prevent clearing the URL if it's a valid unencrypted stream
    if (encrypted || url.startsWith('blob:')) {
      setDecryptedUrl(null);
    }
  }, [encrypted, url]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (onClick && decryptedUrl) {
      e.stopPropagation();
      onClick(decryptedUrl);
    }
  }, [onClick, decryptedUrl]);

  if (loading) {
    return (
      <div style={containerStyle} className={className}>
        <Spinner size="200" color="#00f2ff" />
      </div>
    );
  }

  if (error) {
    return (
      <div style={containerStyle} className={className}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          color: 'rgba(255, 255, 255, 0.7)',
          fontSize: 12,
          textAlign: 'center',
          padding: 8,
          width: '100%',
          height: '100%',
        }}>
          <div>{error.message}</div>

          {(!encrypted || error.isCodecError) && (type === 'video' || type === 'audio') && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => window.open(url, '_blank')}
                style={buttonStyle}
              >
                Открыть
              </button>
              <a
                href={url}
                download
                target="_blank"
                rel="noreferrer"
                style={{ ...buttonStyle, background: 'rgba(255, 255, 255, 0.08)' }}
              >
                Скачать
              </a>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!decryptedUrl) return null;

  const commonProps = {
    src: decryptedUrl,
    style: {
      ...style,
      maxWidth: '100%',
      maxHeight: '100%',
      objectFit: 'contain' as const,
      cursor: onClick ? 'pointer' : 'default',
    },
    className,
    onClick: handleClick,
  };

  if (type === 'image') {
    return (
      <img
        {...commonProps}
        alt="Media"
        onError={(e) => handleMediaError('image', e.currentTarget)}
      />
    );
  }

  if (type === 'video') {
    return (
      <video
        {...commonProps}
        controls={controls}
        autoPlay={autoPlay}
        muted={muted}
        playsInline={playsInline}
        onLoadedMetadata={() => setError(null)}
        onError={(e) => handleMediaError('video', e.currentTarget)}
      />
    );
  }

  if (type === 'audio') {
    return (
      <audio
        {...commonProps}
        controls={controls}
        onLoadedMetadata={() => setError(null)}
        onError={(e) => handleMediaError('audio', e.currentTarget)}
      />
    );
  }

  return null;
};

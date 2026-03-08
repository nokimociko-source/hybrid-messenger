import { logger } from '../utils/logger';
import React, { useState, useEffect, useRef } from 'react';
import { useEncryption } from '../context/EncryptionContext';
import { decryptFile } from '../utils/encryption';
import { Spinner } from 'folds';
import { supabase } from '../../supabaseClient';
import { getPresignedViewUrl } from '../utils/s3Client';

interface EncryptedMediaProps {
    url: string;
    type: 'image' | 'video' | 'audio';
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
}

export const EncryptedMedia: React.FC<EncryptedMediaProps> = ({
    url,
    type,
    roomId,
    version,
    mimeType,
    encrypted,
    style,
    className,
    controls,
    autoPlay,
    muted,
    playsInline,
    onClick,
    circle
}) => {
    const { getRoomKey, masterKey } = useEncryption();
    const [decryptedUrl, setDecryptedUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fallbackTriedRef = useRef(false);
    const fallbackObjectUrlRef = useRef<string | null>(null);

    const getGuessedMime = () => {
        if (mimeType) return mimeType;
        const clean = (url || '').split('?')[0].toLowerCase();

        if (type === 'video') {
            if (clean.endsWith('.mp4')) return 'video/mp4';
            if (clean.endsWith('.webm')) return 'video/webm';
            if (clean.endsWith('.mov')) return 'video/quicktime';
        }
        if (type === 'audio') {
            if (clean.endsWith('.mp3')) return 'audio/mpeg';
            if (clean.endsWith('.ogg')) return 'audio/ogg';
            if (clean.endsWith('.wav')) return 'audio/wav';
            if (clean.endsWith('.m4a')) return 'audio/mp4';
        }
        if (type === 'image') {
            if (clean.endsWith('.png')) return 'image/png';
            if (clean.endsWith('.jpg') || clean.endsWith('.jpeg')) return 'image/jpeg';
            if (clean.endsWith('.gif')) return 'image/gif';
            if (clean.endsWith('.webp')) return 'image/webp';
        }
        return undefined;
    };

    useEffect(() => {
        let isMounted = true;
        let objectUrl: string | null = null;
        fallbackTriedRef.current = false;

        const loadMedia = async () => {
            if (!url) return;

            // Если медиа не зашифровано или это локальный блоб (предпросмотр файла перед отправкой)
            if (!encrypted || url.startsWith('blob:')) {
                logger.debug(`[EncryptedMedia] Using direct (or signed) URL for unencrypted media: ${url}`);
                // Для Wasabi генерируем временную подписанную ссылку даже для незашифрованных файлов
                const viewUrl = await getPresignedViewUrl(url);
                if (isMounted) setDecryptedUrl(viewUrl);
                return;
            }

            // CRITICAL: If the room is encrypted but the message has NO version (null or undefined), 
            // it means it was sent as plain text/media (e.g. before encryption was enabled or during a bug).
            // We MUST NOT try to decrypt plain data.
            if (!roomId || version === undefined || version === null || !masterKey) {
                if (encrypted && masterKey) {
                    logger.warn(`[EncryptedMedia] Room is encrypted but message version is ${version}. Using plain URL.`);
                }
                const viewUrl = await getPresignedViewUrl(url);
                if (isMounted) setDecryptedUrl(viewUrl);
                return;
            }

            setLoading(true);
            setError(null);

            try {
                let key = await getRoomKey(roomId, version);
                if (!key && version > 1) {
                    key = await getRoomKey(roomId, 1);
                }
                if (!key) throw new Error('Key not found');

                logger.debug(`[EncryptedMedia] Decrypting ${type} ${url} with key version ${version}`);
                const response = await fetch(url);
                if (!response.ok) throw new Error(`Failed to fetch media: ${response.status}`);

                const encryptedBlob = await response.blob();
                const decryptedBlob = await decryptFile(encryptedBlob, key);

                if (isMounted) {
                    const guessed = getGuessedMime();
                    const blobForUrl = guessed
                        ? new Blob([decryptedBlob], { type: guessed })
                        : decryptedBlob;

                    logger.debug(`[EncryptedMedia] Decryption successful. MIME: ${guessed || 'unknown'}`);
                    objectUrl = URL.createObjectURL(blobForUrl);
                    setDecryptedUrl(objectUrl);
                }
            } catch (err) {
                logger.error('[EncryptedMedia] Decryption failed:', err);
                if (isMounted) {
                    setError((err as any)?.message === 'Key not found' ? 'Нет ключа для расшифровки' : 'Ошибка расшифровки');
                    setDecryptedUrl(null);
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        loadMedia();

        return () => {
            isMounted = false;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
            if (fallbackObjectUrlRef.current) {
                URL.revokeObjectURL(fallbackObjectUrlRef.current);
                fallbackObjectUrlRef.current = null;
            }
        };
    }, [url, roomId, version, masterKey, encrypted, type, mimeType, getRoomKey]);

    if (loading) {
        return (
            <div style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: circle ? '50%' : '12px' }} className={className}>
                <Spinner size="200" color="#00f2ff" />
            </div>
        );
    }

    if (error) {
        return (
            <div
                style={{
                    ...style,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                    gap: 8,
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: circle ? '50%' : '12px',
                    color: 'rgba(255,255,255,0.7)',
                    fontSize: 12,
                    textAlign: 'center',
                    padding: 8,
                }}
                className={className}
            >
                <div>{error}</div>
                {!encrypted && (type === 'video' || type === 'audio') && url && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                        <button
                            type="button"
                            onClick={() => window.open(url, '_blank')}
                            style={{
                                padding: '6px 10px',
                                borderRadius: 8,
                                border: '1px solid rgba(0, 242, 255, 0.25)',
                                background: 'rgba(0, 242, 255, 0.12)',
                                color: '#00f2ff',
                                cursor: 'pointer',
                                fontSize: 12,
                            }}
                        >
                            Открыть
                        </button>
                        <a
                            href={url}
                            download
                            target="_blank"
                            rel="noreferrer"
                            style={{
                                padding: '6px 10px',
                                borderRadius: 8,
                                border: '1px solid rgba(255, 255, 255, 0.18)',
                                background: 'rgba(255, 255, 255, 0.08)',
                                color: 'rgba(255,255,255,0.85)',
                                cursor: 'pointer',
                                fontSize: 12,
                                textDecoration: 'none'
                            }}
                        >
                            Скачать
                        </a>
                    </div>
                )}
            </div>
        );
    }

    if (!decryptedUrl) return null;

    const handleClick = (e: React.MouseEvent) => {
        if (onClick) {
            e.stopPropagation();
            onClick(decryptedUrl);
        }
    };

    const handleMediaError = async (kind: 'video' | 'audio' | 'image', el?: HTMLMediaElement | HTMLImageElement | null) => {
        let mediaErrorCode: number | undefined;
        try {
            mediaErrorCode = (el as HTMLMediaElement | undefined)?.error?.code;
        } catch (e) { }

        if ((kind === 'video' || kind === 'audio') && mediaErrorCode === 4) {
            setError(kind === 'video'
                ? 'Видео не поддерживается (ошибка кодека). Ваш браузер не может воспроизвести этот формат (возможно, требуется HEVC или другой платный кодек).'
                : 'Аудио-формат не поддерживается вашим устройством.');
        } else {
            setError(kind === 'video' ? 'Не удалось запустить видео' : kind === 'audio' ? 'Не удалось запустить аудио' : 'Не удалось загрузить медиа');
        }

        // Prevent clearing the URL if it's a valid unencrypted stream, which sometimes throws transient errors in dev
        if (encrypted || url.startsWith('blob:')) {
            setDecryptedUrl(null);
        }
    };

    if (type === 'image') {
        return (
            <img
                src={decryptedUrl}
                alt="Media"
                style={{ ...style, cursor: onClick ? 'pointer' : 'default' }}
                className={className}
                onClick={handleClick}
                onError={(e) => handleMediaError('image', e.currentTarget)}
            />
        );
    }

    if (type === 'video') {
        return (
            <video
                src={decryptedUrl}
                style={{ ...style, cursor: onClick ? 'pointer' : 'default' }}
                className={className}
                controls={controls}
                autoPlay={autoPlay}
                muted={muted}
                playsInline={playsInline}
                onClick={handleClick}
                onLoadedMetadata={() => {
                    setError(null);
                }}
                onError={(e) => handleMediaError('video', e.currentTarget)}
            />
        );
    }

    if (type === 'audio') {
        return (
            <audio
                src={decryptedUrl}
                controls={controls}
                style={style}
                className={className}
                onLoadedMetadata={() => {
                    setError(null);
                }}
                onError={(e) => handleMediaError('audio', e.currentTarget)}
            />
        );
    }

    return null;
};

import { logger } from '../../utils/logger';
import React, { useRef, useState, useEffect } from 'react';
import { Icon, Icons, Spinner } from 'folds';
import { decryptFile } from '../../utils/encryption';
import { useEncryption } from '../../context/EncryptionContext';
import { getPresignedViewUrl } from '../../utils/s3Client';

type AudioPlayerProps = {
    src: string;
    roomId?: string;
    version?: number;
    encrypted?: boolean;
};

export function CatloverAudioPlayer({ src, roomId, version, encrypted }: AudioPlayerProps) {
    const { getRoomKey, masterKey } = useEncryption();
    const [decryptedSrc, setDecryptedSrc] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let objectUrl: string | null = null;
        let isMounted = true;

        const loadAudio = async () => {
            if (!src) return;

            // Get signed URL for Wasabi
            let audioUrl = src;
            if (src.includes('wasabisys.com')) {
                try {
                    audioUrl = await getPresignedViewUrl(src);
                } catch (err) {
                    logger.error('Failed to get signed URL for audio:', err);
                }
            }

            if (audioUrl.startsWith('blob:') || !encrypted) {
                setDecryptedSrc(audioUrl);
                return;
            }

            if (!roomId || version === undefined || !masterKey) {
                setDecryptedSrc(audioUrl);
                return;
            }

            setIsLoading(true);
            setError(null);
            try {
                const key = await getRoomKey(roomId, version);
                if (!key) throw new Error('Key not found');

                const response = await fetch(audioUrl);
                const encryptedBlob = await response.blob();
                const decryptedBlob = await decryptFile(encryptedBlob, key);

                if (isMounted) {
                    objectUrl = URL.createObjectURL(decryptedBlob);
                    setDecryptedSrc(objectUrl);
                }
            } catch (err) {
                logger.error('Audio decryption failed:', err);
                if (isMounted) {
                    setError((err as any)?.message === 'Key not found' ? 'Нет ключа для расшифровки' : 'Ошибка расшифровки');
                    setDecryptedSrc(null);
                }
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        loadAudio();

        return () => {
            isMounted = false;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [src, roomId, version, masterKey, encrypted, getRoomKey]);

    if (error) {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                backgroundColor: 'rgba(0, 0, 0, 0.2)',
                borderRadius: '16px',
                padding: '10px 12px',
                minWidth: '200px',
                color: 'rgba(255,255,255,0.75)',
                fontSize: '12px'
            }}>
                <div>{error}</div>
                {!encrypted && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button
                            type="button"
                            onClick={() => window.open(src, '_blank')}
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
                            href={src}
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

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || !decryptedSrc) return;

        const setAudioData = () => {
            // Chrome WebM duration bug workaround
            if (audio.duration === Infinity || isNaN(audio.duration)) {
                audio.currentTime = 1e101;
                audio.addEventListener('timeupdate', function getDuration() {
                    audio.removeEventListener('timeupdate', getDuration);
                    audio.currentTime = 0;
                    setDuration(audio.duration);
                    setCurrentTime(0);
                });
            } else {
                setDuration(audio.duration);
                setCurrentTime(audio.currentTime);
            }
        };

        const setAudioTime = () => {
            setCurrentTime(audio.currentTime);
            if (audio.duration && audio.duration !== Infinity) {
                setProgress((audio.currentTime / audio.duration) * 100);
            }
        };

        const onEnded = () => {
            setIsPlaying(false);
            setProgress(0);
            setCurrentTime(0);
        };

        audio.addEventListener('loadedmetadata', setAudioData);
        audio.addEventListener('timeupdate', setAudioTime);
        audio.addEventListener('ended', onEnded);

        return () => {
            audio.removeEventListener('loadedmetadata', setAudioData);
            audio.removeEventListener('timeupdate', setAudioTime);
            audio.removeEventListener('ended', onEnded);
        };
    }, []);

    const togglePlay = () => {
        const audio = audioRef.current;
        if (!audio) return;

        if (isPlaying) {
            audio.pause();
        } else {
            audio.play();
        }
        setIsPlaying(!isPlaying);
    };

    const formatTime = (time: number) => {
        if (!time || isNaN(time)) return '0:00';
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        const audio = audioRef.current;
        if (!audio) return;

        const bounds = e.currentTarget.getBoundingClientRect();
        const percent = (e.clientX - bounds.left) / bounds.width;
        audio.currentTime = percent * audio.duration;
        setProgress(percent * 100);
    };

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            borderRadius: '24px',
            padding: '8px 12px',
            minWidth: '200px',
            gap: '12px',
            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)'
        }}>
            <audio ref={audioRef} src={decryptedSrc || undefined} preload="metadata" />

            <div
                onClick={isLoading ? undefined : togglePlay}
                style={{
                    width: '36px', height: '36px',
                    borderRadius: '50%',
                    backgroundColor: isLoading ? 'rgba(0, 242, 255, 0.2)' : '#00f2ff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: isLoading ? 'default' : 'pointer',
                    color: '#000',
                    flexShrink: 0,
                    boxShadow: isLoading ? 'none' : '0 0 10px rgba(0, 242, 255, 0.3)'
                }}
            >
                {isLoading ? (
                    <Spinner size="100" color="#00f2ff" />
                ) : (
                    <Icon size="200" src={isPlaying ? Icons.Pause : Icons.Play} />
                )}
            </div>

            <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {/* Waveform / Progress Line */}
                <div
                    onClick={handleSeek}
                    style={{
                        height: '4px',
                        width: '100%',
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        borderRadius: '2px',
                        cursor: 'pointer',
                        position: 'relative',
                        overflow: 'hidden'
                    }}
                >
                    <div style={{
                        position: 'absolute',
                        top: 0, left: 0, bottom: 0,
                        width: `${progress}%`,
                        backgroundColor: '#00f2ff',
                        borderRadius: '2px',
                        transition: 'width 0.1s linear'
                    }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#aaa', fontWeight: 'bold' }}>
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                </div>
            </div>
        </div>
    );
}

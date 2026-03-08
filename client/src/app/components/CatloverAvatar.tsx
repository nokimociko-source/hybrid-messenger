import React, { useState, useEffect } from 'react';
import { getPresignedViewUrl } from '../utils/s3Client';

interface CatloverAvatarProps {
    url?: string | null;
    displayName?: string;
    size?: number | string;
    className?: string;
    style?: React.CSSProperties;
    onClick?: () => void;
    onError?: () => void;
    children?: React.ReactNode;
}

export function CatloverAvatar({
    url,
    displayName,
    size = 40,
    className,
    style,
    onClick,
    onError,
    children
}: CatloverAvatarProps) {
    const [displayUrl, setDisplayUrl] = useState<string | undefined>(url || undefined);

    useEffect(() => {
        if (!url) {
            setDisplayUrl(undefined);
            return;
        }

        if (url.includes('wasabisys.com')) {
            getPresignedViewUrl(url).then(setDisplayUrl).catch(() => setDisplayUrl(url));
        } else {
            setDisplayUrl(url);
        }
    }, [url]);

    const isVideo = displayUrl?.match(/\.(mp4|webm|mov|ogg)$|avatar_video/i);
    const initial = displayName?.[0]?.toUpperCase() || '?';

    const containerStyle: React.CSSProperties = {
        width: typeof size === 'number' ? `${size}px` : size,
        height: typeof size === 'number' ? `${size}px` : size,
        minWidth: typeof size === 'number' ? `${size}px` : size,
        minHeight: typeof size === 'number' ? `${size}px` : size,
        borderRadius: '50%',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 242, 255, 0.1)',
        color: '#00f2ff',
        fontWeight: 'bold',
        fontSize: typeof size === 'number' ? `${size * 0.4}px` : 'inherit',
        border: '1px solid rgba(0, 242, 255, 0.2)',
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        ...style
    };

    if (!displayUrl) {
        return (
            <div className={className} style={containerStyle} onClick={onClick}>
                {initial}
                {children}
            </div>
        );
    }

    return (
        <div className={className} style={containerStyle} onClick={onClick}>
            {isVideo ? (
                <video
                    src={displayUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    onError={onError}
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                    }}
                />
            ) : (
                <img
                    src={displayUrl}
                    alt={displayName}
                    onError={onError}
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                    }}
                />
            )}
            {children}
        </div>
    );
}

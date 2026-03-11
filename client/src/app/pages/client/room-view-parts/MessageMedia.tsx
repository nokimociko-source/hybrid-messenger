import React from 'react';
import { Message, Room } from '../../../hooks/supabaseHelpers';
import { MediaGrid } from '../../../components/MediaGrid';
import { CatloverAudioPlayer } from '../CatloverAudioPlayer';
import { EncryptedMedia } from '../../../components/EncryptedMedia';
import { getMediaType, isVideoCircleUrl } from '../../../utils/chatUtils';
import { isAlbumMessage } from '../../../utils/albumSerializer';
import { getPresignedViewUrl } from '../../../utils/s3Client';

interface MessageMediaProps {
    msg: Message;
    room: Room | null;
    allMessages: Message[];
    isEncryptedRoom: boolean;
    onViewMedia: (url: string) => void;
}

export const MessageMedia: React.FC<MessageMediaProps> = ({
    msg,
    room,
    allMessages,
    isEncryptedRoom,
    onViewMedia
}) => {
    const mediaType = msg.media_url ? getMediaType(msg.media_url, msg.file_type) : null;
    const isVideoCircle = mediaType === 'video' && msg.media_url?.includes('video_circle');

    if (msg.media_group_id && isAlbumMessage(msg)) {
        if (msg.media_order !== 0) return null;
        return (
            <div style={{ marginBottom: msg.content ? '8px' : '0' }}>
                <MediaGrid
                    mediaItems={
                        allMessages
                            .filter(m => m.media_group_id === msg.media_group_id)
                            .sort((a, b) => (a.media_order || 0) - (b.media_order || 0))
                            .map(m => ({
                                id: m.id,
                                url: m.media_url!,
                                type: m.media_url!.match(/\.(mp4|webm)$/i) ? 'video' as const : 'image' as const,
                                width: m.original_width,
                                height: m.original_height,
                                roomId: room?.id,
                                version: m.key_version,
                                mimeType: m.file_type
                            }))
                    }
                />
            </div>
        );
    }

    if (!msg.media_url) return null;

    if (msg.file_name && !mediaType) {
        return (
            <div
                style={{
                    marginBottom: msg.content ? '8px' : '0',
                    padding: '12px 16px',
                    background: 'rgba(0, 242, 255, 0.1)',
                    border: '1px solid rgba(0, 242, 255, 0.2)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                }}
                onClick={async () => {
                    if (!msg.media_url) return;
                    let finalUrl = msg.media_url;
                    if (msg.media_url.includes('wasabisys.com')) {
                        finalUrl = await getPresignedViewUrl(msg.media_url);
                    }
                    window.open(finalUrl, '_blank');
                }}
            >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00f2ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                    <polyline points="13 2 13 9 20 9" />
                </svg>
                <div style={{ flexGrow: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {msg.file_name}
                    </div>
                    {msg.file_size && <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>{(msg.file_size / 1024).toFixed(1)} KB</div>}
                </div>
            </div>
        );
    }

    if (mediaType === 'audio') {
        return (
            <CatloverAudioPlayer
                src={msg.media_url}
                roomId={room?.id}
                version={msg.key_version}
                encrypted={isEncryptedRoom}
            />
        );
    }

    if (mediaType === 'video') {
        return (
            <div
                style={{
                    marginBottom: msg.content ? '8px' : '0',
                    borderRadius: isVideoCircle ? '50%' : '12px',
                    overflow: 'hidden',
                    width: isVideoCircle ? '180px' : 'auto',
                    height: isVideoCircle ? '180px' : 'auto',
                    maxWidth: '400px',
                    cursor: 'pointer',
                    position: 'relative',
                    backgroundColor: 'rgba(20,20,20,0.5)',
                }}
            >
                <EncryptedMedia
                    url={msg.media_url}
                    type="video"
                    roomId={room?.id}
                    version={msg.key_version}
                    mimeType={msg.file_type}
                    encrypted={isEncryptedRoom}
                    controls={!isVideoCircle}
                    style={{ width: '100%', height: isVideoCircle ? '100%' : 'auto', maxHeight: '400px', objectFit: isVideoCircle ? 'cover' : 'contain', display: 'block' }}
                    onClick={(url) => onViewMedia(url)}
                    autoPlay={isVideoCircle}
                    muted={isVideoCircle}
                    playsInline={true}
                    circle={isVideoCircle}
                />
                {isVideoCircle && (
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(0, 0, 0, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z" /></svg>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div style={{ marginBottom: msg.content ? '8px' : '0', borderRadius: '12px', overflow: 'hidden', cursor: 'pointer' }}>
            <EncryptedMedia
                url={msg.media_url}
                type="image"
                roomId={room?.id}
                version={msg.key_version}
                mimeType={msg.file_type}
                encrypted={isEncryptedRoom}
                style={{ maxWidth: '100%', maxHeight: '400px', display: 'block' }}
                onClick={(url) => onViewMedia(url)}
            />
        </div>
    );
};

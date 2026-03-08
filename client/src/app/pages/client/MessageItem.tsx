import React from 'react';
import { Icon, Icons, Spinner } from 'folds';
import * as css from './CatloverRoomView.css';
import { Message, Room } from '../../hooks/supabaseHelpers';
import { CatloverAvatar } from '../../components/CatloverAvatar';
import { FormattedMessage } from '../../components/FormattedMessage';
import { MediaGrid } from '../../components/MediaGrid';
import { PollMessage } from '../../components/PollMessage';
import { PreviewCard } from '../../components/PreviewCard';
import { ChannelViewStatistics } from '../../components/ChannelViewStatistics';
import { CatloverAudioPlayer } from './CatloverAudioPlayer';
import { getMediaType } from '../../utils/chatUtils';
import { highlightMentions } from '../../utils/mentionUtils';
import { isAlbumMessage } from '../../utils/albumSerializer';
import { EncryptedMedia } from '../../components/EncryptedMedia';
import { getPresignedViewUrl } from '../../utils/s3Client';
import { useEncryption } from '../../context/EncryptionContext';

interface MessageItemProps {
    msg: Message;
    currentUser: string | null;
    room: Room | null;
    isLayoutSelf: boolean;
    isMultiSelectMode: boolean;
    isSelected: boolean;
    onSelect: (id: string) => void;
    onLongPress: (id: string) => void;
    onReaction: (id: string, emoji: string) => void;
    onForward: (msg: Message) => void;
    onReply: (msg: Message) => void;
    onDelete: (id: string) => void;
    onEdit: (msg: Message) => void;
    onPin: (id: string) => void;
    onUnpin: (id: string) => void;
    onViewProfile: (id: string) => void;
    onViewMedia: (url: string) => void;
    onVote: (pollId: string, optionId: string) => void;
    onUnvote: (pollId: string, optionId: string) => void;
    polls: any[];
    linkPreviews: Map<string, any>;
    channelPermissions: any;
    allMessages: Message[]; // Needed for album filtering and reply preview
    isSavedMessages: boolean;
    lastSelectedId: string | null;
    onSelectUntilHere: (id: string) => void;
    onReport: (msg: Message) => void;
}

export const MessageItem = React.memo<MessageItemProps>(({
    msg,
    currentUser,
    room,
    isLayoutSelf,
    isMultiSelectMode,
    isSelected,
    onSelect,
    onLongPress,
    onReaction,
    onForward,
    onReply,
    onDelete,
    onEdit,
    onPin,
    onUnpin,
    onViewProfile,
    onViewMedia,
    onVote,
    onUnvote,
    polls,
    linkPreviews,
    channelPermissions,
    allMessages,
    isSavedMessages,
    lastSelectedId,
    onSelectUntilHere,
    onReport
}) => {
    const isSelf = msg.user_id === currentUser;
    const mediaType = msg.media_url ? getMediaType(msg.media_url, msg.file_type) : null;
    const isVideoCircle = mediaType === 'video' && msg.media_url?.includes('video_circle');
    const isVideoFile = mediaType === 'video' && msg.file_name && msg.file_name.toLowerCase().endsWith('.mp4');

    const isEncryptedRoom = !!(room?.is_encrypted || isSavedMessages);

    const handleContextMenu = (e: React.MouseEvent) => {
        if (isMultiSelectMode) {
            e.preventDefault();
            return;
        }
        e.preventDefault();

        // Remove old menu if exists
        const oldMenu = document.getElementById('context-menu');
        if (oldMenu) document.body.removeChild(oldMenu);

        const menu = document.createElement('div');
        menu.id = 'context-menu';
        menu.style.cssText = `
            position: fixed;
            left: ${e.clientX}px;
            top: ${e.clientY}px;
            background: rgba(15, 15, 15, 0.98);
            border: 1px solid rgba(0, 242, 255, 0.2);
            border-radius: 12px;
            padding: 6px;
            z-index: 99999;
            backdrop-filter: blur(20px);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(0, 242, 255, 0.1);
            min-width: 180px;
            animation: menuFadeIn 0.15s ease-out;
        `;

        const actions = [
            { label: 'Ответить', icon: 'reply', action: () => onReply(msg), color: '#00f2ff' },
            {
                label: 'Копировать', icon: 'copy', action: () => {
                    navigator.clipboard.writeText(msg.content);
                }, color: '#00f2ff'
            },
            {
                label: 'Выбрать', icon: 'select', action: () => {
                    const menu = document.getElementById('context-menu');
                    if (menu && document.body.contains(menu)) {
                        document.body.removeChild(menu);
                    }
                    onLongPress(msg.id);
                }, color: '#00f2ff'
            },
            ...(lastSelectedId && lastSelectedId !== msg.id ? [
                { label: 'Выбрать до этого места', icon: 'select_range', action: () => onSelectUntilHere(msg.id), color: '#00f2ff' }
            ] : []),
            {
                label: msg.is_pinned ? 'Открепить' : 'Закрепить', icon: 'pin', action: () => {
                    if (msg.is_pinned) {
                        onUnpin(msg.id);
                    } else {
                        onPin(msg.id);
                    }
                }, color: '#00f2ff'
            },
            { label: 'Переслать', icon: 'forward', action: () => onForward(msg), color: '#00f2ff' },
            { label: 'Пожаловаться', icon: 'report', action: () => onReport(msg), color: '#ff4d4d' },
            ...(isSelf ? [
                { label: 'Редактировать', icon: 'edit', action: () => onEdit(msg), color: '#00f2ff' },
                { label: 'Удалить', icon: 'delete', action: () => onDelete(msg.id), color: '#ff4d4d' }
            ] : [])
        ];

        const getIconSvg = (iconName: string) => {
            const icons: Record<string, string> = {
                reply: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
                copy: '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
                select: '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
                select_range: '<path d="M7 11v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 11l-3-3L2 18"/><path d="M2 13v5h5"/>',
                pin: '<path d="M12 17v5M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/>',
                forward: '<path d="M5 12h14M12 5l7 7-7 7"/>',
                edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>',
                delete: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
                report: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>'
            };
            return icons[iconName] || '';
        };

        actions.forEach(({ label, icon, action, color }) => {
            const item = document.createElement('div');
            item.innerHTML = `
                <div style="display: flex; align-items: center; gap: 12px;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        ${getIconSvg(icon)}
                    </svg>
                    <span style="font-size: 14px; font-weight: 500;">${label}</span>
                </div>
            `;
            item.style.cssText = `
                padding: 10px 14px;
                cursor: pointer;
                color: #fff;
                border-radius: 8px;
                transition: all 0.15s ease;
                user-select: none;
            `;
            item.onmouseover = () => {
                item.style.background = 'rgba(0, 242, 255, 0.15)';
                item.style.transform = 'translateX(2px)';
            };
            item.onmouseout = () => {
                item.style.background = 'transparent';
                item.style.transform = 'translateX(0)';
            };
            item.onclick = () => {
                action();
                if (document.body.contains(menu)) {
                    document.body.removeChild(menu);
                }
            };
            menu.appendChild(item);
        });

        document.body.appendChild(menu);

        // Screen boundary checks
        const rect = menu.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            menu.style.left = `${window.innerWidth - rect.width - 10}px`;
        }
        if (rect.bottom > window.innerHeight) {
            menu.style.top = `${window.innerHeight - rect.height - 10}px`;
        }

        const closeMenu = (event: MouseEvent) => {
            if (!menu.contains(event.target as Node)) {
                if (document.body.contains(menu)) {
                    document.body.removeChild(menu);
                }
                document.removeEventListener('click', closeMenu);
            }
        };

        setTimeout(() => document.addEventListener('click', closeMenu), 0);
    };

    return (
        <div id={`message-${msg.id}`} className={`${css.MessageWrapper} ${isLayoutSelf ? css.MessageWrapperSelf : ''}`} style={{
            marginBottom: (msg as any).reactions && (msg as any).reactions.length > 0 ? '14px' : '4px',
            position: 'relative'
        }}>
            {isMultiSelectMode && (
                <div
                    onClick={(e) => {
                        e.stopPropagation();
                        onSelect(msg.id);
                    }}
                    style={{
                        marginRight: '12px',
                        marginTop: '8px',
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        border: `2px solid ${isSelected ? '#00f2ff' : 'rgba(255, 255, 255, 0.4)'}`,
                        background: isSelected ? '#00f2ff' : 'rgba(0, 0, 0, 0.3)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        transition: 'all 0.2s',
                        backdropFilter: 'blur(10px)',
                        boxShadow: isSelected ? '0 0 12px rgba(0, 242, 255, 0.5)' : 'none',
                        zIndex: 10
                    }}
                >
                    {isSelected && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                    )}
                </div>
            )}

            <div
                className={`${room?.type === 'channel' ? css.ChannelPost : css.MessageBubble} ${isLayoutSelf ? css.MessageBubbleSelf : css.MessageBubbleOther}`}
                style={{
                    position: 'relative',
                    paddingBottom: room?.type === 'channel' ? '24px' : '20px',
                    minWidth: '80px',
                    cursor: isMultiSelectMode ? 'pointer' : 'default',
                    transition: 'transform 0.2s, background 0.2s',
                    transform: isSelected ? 'scale(0.98)' : 'scale(1)',
                    background: isSelected
                        ? (isLayoutSelf ? 'rgba(0, 242, 255, 0.25)' : 'rgba(0, 242, 255, 0.15)')
                        : undefined
                }}
                onClick={() => {
                    if (isMultiSelectMode) {
                        onSelect(msg.id);
                    }
                }}
                onContextMenu={handleContextMenu}
            >
                {room?.type === 'channel' && (
                    <div className={css.PostHeader}>
                        <CatloverAvatar
                            url={room?.avatar_url}
                            displayName={room?.name || 'Channel'}
                            size={36}
                            style={{
                                borderRadius: '50%',
                                border: '1px solid rgba(0, 242, 255, 0.2)'
                            }}
                        />
                        <div className={css.HeaderInfo}>
                            <div className={css.HeaderTitle}>{room?.name || 'Канал'}</div>
                            <div className={css.HeaderStatus}>канал • {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                    </div>
                )}

                {msg.forwarded_from && (
                    <div style={{
                        fontSize: '12px',
                        color: '#00f2ff',
                        fontWeight: '500',
                        marginBottom: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        opacity: 0.9
                    }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="15 17 20 12 15 7" />
                            <path d="M4 18v-2a4 4 0 0 1 4-4h12" />
                        </svg>
                        Пересланное сообщение
                    </div>
                )}

                {/* Quick reactions panel - visible on hover via CSS if needed, or JS */}
                <div className="quick-reactions-panel" style={{
                    position: 'absolute',
                    top: '-45px',
                    [isLayoutSelf ? 'right' : 'left']: '0',
                    display: 'none', // Handle visibility via CSS class in parent or local state
                    gap: '6px',
                    padding: '8px 12px',
                    backgroundColor: 'rgba(20, 20, 20, 0.95)',
                    borderRadius: '24px',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    zIndex: 10,
                    backdropFilter: 'blur(10px)'
                }}>
                    {['👍', '❤️', '😂', '😮', '😢', '🔥'].map(emoji => (
                        <span key={emoji} onClick={(e) => { e.stopPropagation(); onReaction(msg.id, emoji); }}>{emoji}</span>
                    ))}
                </div>

                {!isSelf && room?.type !== 'direct' && room?.type !== 'channel' && (
                    <div
                        style={{
                            fontSize: '12px',
                            color: '#00f2ff',
                            fontWeight: 'bold',
                            marginBottom: '4px',
                            cursor: 'pointer',
                            display: 'inline-block'
                        }}
                        onClick={(e) => { e.stopPropagation(); onViewProfile(msg.user_id); }}
                    >
                        {msg.users?.username}
                    </div>
                )}

                {/* Reply preview */}
                {msg.reply_to && (
                    <div
                        style={{
                            padding: '6px 10px',
                            marginBottom: '6px',
                            borderLeft: '2px solid #00f2ff',
                            backgroundColor: isLayoutSelf ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                        onClick={() => {
                            const element = document.getElementById(`msg-${msg.reply_to}`);
                            element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }}
                    >
                        {(() => {
                            const replyMsg = allMessages.find(m => m.id === msg.reply_to);
                            return replyMsg ? (
                                <>
                                    <div style={{ fontSize: '12px', color: '#00f2ff', fontWeight: '600', marginBottom: '2px' }}>
                                        {replyMsg.users?.username || 'Неизвестно'}
                                    </div>
                                    <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {replyMsg.content || '📎 Медиа'}
                                    </div>
                                </>
                            ) : (
                                <div style={{ fontSize: '13px', color: '#888', fontStyle: 'italic' }}>Сообщение удалено</div>
                            );
                        })()}
                    </div>
                )}

                {/* Media grid / media item */}
                {msg.media_group_id && isAlbumMessage(msg) ? (
                    msg.media_order === 0 ? (
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
                    ) : null
                ) : (
                    msg.media_url && (
                        (msg.file_name && !mediaType) ? (
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
                        ) : mediaType === 'audio' ? (
                            <CatloverAudioPlayer
                                src={msg.media_url}
                                roomId={room?.id}
                                version={msg.key_version}
                                encrypted={isEncryptedRoom}
                            />
                        ) : mediaType === 'video' ? (
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
                        ) : (
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
                        )
                    )
                )}

                {/* Polls */}
                {msg.poll_id && (() => {
                    const poll = polls.find(p => p.id === msg.poll_id);
                    if (!poll) return null;
                    return <PollMessage poll={poll} onVote={(optionId) => onVote(poll.id, optionId)} onUnvote={(optionId) => onUnvote(poll.id, optionId)} canVote={true} />;
                })()}

                {/* Content */}
                {msg.content && (
                    <div style={{ wordBreak: 'break-word', paddingRight: '50px' }}>
                        <FormattedMessage content={highlightMentions(msg.content, 'mention-highlight')} />
                    </div>
                )}

                {/* Link Preview */}
                {!msg.media_url && linkPreviews.has(msg.id) && (
                    <div style={{ marginTop: '8px' }}>
                        <PreviewCard preview={linkPreviews.get(msg.id)} />
                    </div>
                )}

                {/* Footer (Time & Read status) */}
                <div style={{
                    position: 'absolute',
                    bottom: '4px',
                    right: '8px',
                    fontSize: '11px',
                    color: 'rgba(255, 255, 255, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    whiteSpace: 'nowrap'
                }}>
                    {room?.type === 'channel' && channelPermissions.canViewStats && (
                        <ChannelViewStatistics messageId={msg.id} isAdmin={channelPermissions.canViewStats} />
                    )}
                    {msg.is_edited && <span style={{ fontSize: '10px' }}>изм.</span>}
                    <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {isSelf && (
                        <span style={{ fontSize: '14px' }}>
                            {(msg.is_read || (msg.read_by && msg.read_by.length > 0)) ? (
                                <span style={{ color: '#00f2ff' }}>✓✓</span>
                            ) : (
                                <span style={{ color: '#888' }}>✓</span>
                            )}
                        </span>
                    )}
                </div>
            </div>

            {/* Reactions */}
            {msg.reactions && msg.reactions.length > 0 && (
                <div style={{
                    position: 'absolute',
                    bottom: '-10px',
                    right: '4px',
                    display: 'flex',
                    gap: '3px',
                    flexWrap: 'wrap',
                    maxWidth: '180px',
                    zIndex: 2
                }}>
                    {Object.entries(
                        msg.reactions.reduce((acc: any, r: any) => {
                            if (!acc[r.emoji]) acc[r.emoji] = { count: 0, hasCurrentUser: false };
                            acc[r.emoji].count += 1;
                            if (r.user_id === currentUser) acc[r.emoji].hasCurrentUser = true;
                            return acc;
                        }, {})
                    ).map(([emoji, data]: [string, any]) => (
                        <div
                            key={emoji}
                            onClick={() => onReaction(msg.id, emoji)}
                            style={{
                                padding: '2px 6px',
                                borderRadius: '10px',
                                backgroundColor: data.hasCurrentUser ? 'rgba(0, 242, 255, 0.2)' : 'rgba(30, 30, 30, 0.95)',
                                border: data.hasCurrentUser ? '1px solid rgba(0, 242, 255, 0.5)' : '1px solid rgba(255, 255, 255, 0.15)',
                                fontSize: '12px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                                transition: 'all 0.15s',
                                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
                                minHeight: '20px'
                            }}
                        >
                            <span style={{ fontSize: '13px', lineHeight: '1' }}>{emoji}</span>
                            {data.count > 1 && (
                                <span style={{ fontSize: '10px', color: data.hasCurrentUser ? '#00f2ff' : '#999', fontWeight: '500' }}>{data.count}</span>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}, (prevProps, nextProps) => {
    // Custom comparison for better performance
    return (
        prevProps.msg.id === nextProps.msg.id &&
        prevProps.msg.content === nextProps.msg.content &&
        prevProps.msg.is_read === nextProps.msg.is_read &&
        prevProps.msg.read_by?.length === nextProps.msg.read_by?.length &&
        prevProps.msg.is_pinned === nextProps.msg.is_pinned &&
        prevProps.msg.reactions?.length === nextProps.msg.reactions?.length &&
        prevProps.isSelected === nextProps.isSelected &&
        prevProps.isMultiSelectMode === nextProps.isMultiSelectMode &&
        prevProps.isLayoutSelf === nextProps.isLayoutSelf &&
        prevProps.lastSelectedId === nextProps.lastSelectedId
    );
});

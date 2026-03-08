import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { Icon, Icons, Spinner } from 'folds';
import { useNavigate } from 'react-router-dom';
import * as css from './CatloverChatList.css';
import { useSupabaseRooms } from '../../hooks/useSupabaseChat';
import { useRateLimit } from '../../hooks/useRateLimit';
import { HOME_PATH } from '../paths';
import { useChatFolders } from '../../hooks/useChatFolders';
import { usePinnedChats } from '../../hooks/usePinnedChats';
import { useArchive } from '../../hooks/useArchive';
import { useMuteSettings } from '../../hooks/useMuteSettings';
import { useMentions } from '../../hooks/useMentions';
import { useMessageDrafts } from '../../hooks/useMessageDrafts';
import { useUnreadCount } from '../../hooks/useUnreadCount';
import { useUserPresence } from '../../hooks/useUserPresence';
import { useRoomTyping } from '../../hooks/useRoomTyping';
import { FolderDialog } from '../../components/FolderDialog';
import { FolderSettings } from '../../components/FolderSettings';
import { GlobalSearch } from '../../components/GlobalSearch';
import { TypingIndicator } from '../../components/TypingIndicator';
import { MessageStatusIcon } from '../../components/MessageStatusIcon';
import { SwipeableChat } from '../../components/SwipeableChat';
import { ChannelDiscovery } from '../../components/ChannelDiscovery';
import { formatMessageTime } from '../../utils/timeUtils';
import { useI18n } from '../../hooks/useI18n';
import { CatloverAvatar } from '../../components/CatloverAvatar';
import { CatloverModal } from '../../components/CatloverModal';
import { useDebounce } from '../../hooks/useDebounce';

const getIcon = (name: string) => {
    return (Icons as any)[name] || Icons.Hash;
};

// --- Specialized components for performance ---

const ChatListItem = React.memo(({
    room,
    isOnline,
    unreadCount,
    onNavigate,
    onArchive,
    onUnarchive,
    onPin,
    onUnpin,
    onMute,
    onUnmute,
    canPin,
    setContextMenuRoom,
    setContextMenuPosition,
    setHoveredRoomId,
    isHovered,
    setModalConfig,
    t
}: any) => {
    const { isTyping } = useRoomTyping(room.id);
    return (
        <SwipeableChat
            onSwipeLeft={() => {
                if (!room.roomIsArchived) {
                    onArchive();
                }
            }}
            leftActions={
                <div style={{ display: 'flex', gap: '8px' }}>
                    <Icon size="200" src={getIcon('Archive')} style={{ color: '#ff4444' }} />
                    <span style={{ color: '#ff4444', fontSize: '14px', fontWeight: 'bold' }}>
                        {t('ui.archive')}
                    </span>
                </div>
            }
        >
            <div
                className={css.ChatTile}
                onClick={onNavigate}
                onMouseEnter={() => setHoveredRoomId(room.id)}
                onMouseLeave={() => setHoveredRoomId(null)}
                onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenuRoom(room.id);
                    setContextMenuPosition({ x: e.clientX, y: e.clientY });
                }}
                style={{ cursor: 'pointer', position: 'relative' }}
            >
                <CatloverAvatar
                    url={room.avatarUrl}
                    displayName={room.initial}
                    className={css.AvatarBox}
                    style={{
                        backgroundColor: room.avatarUrl ? 'transparent' : (room.roomIsSavedMessages ? '#00f2ff' : undefined),
                        position: 'relative',
                        border: 'none',
                        fontSize: '16px'
                    }}
                >
                    {!room.avatarUrl && <span style={{ color: room.roomIsSavedMessages ? '#000' : '#00f2ff', fontWeight: 'bold', fontSize: room.roomIsSavedMessages ? '20px' : undefined }}>{room.roomIsSavedMessages ? <Icon size="200" src={Icons.Bookmark} /> : (room.type === 'channel' ? <Icon size="200" src={Icons.VolumeHigh} /> : undefined)}</span>}

                    {room.isDirect && room.target_user_id && isOnline && (
                        <div style={{
                            position: 'absolute',
                            bottom: '0',
                            right: '0',
                            width: '14px',
                            height: '14px',
                            backgroundColor: '#00ff00',
                            borderRadius: '50%',
                            border: '2px solid #0d0d0d',
                            boxShadow: '0 0 8px rgba(0, 255, 0, 0.6)',
                            zIndex: 2
                        }} />
                    )}
                </CatloverAvatar>

                <div className={css.ChatInfoBox}>
                    <div className={css.ChatHeaderLine}>
                        <span className={css.ChatName} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {room.roomIsPinned && <Icon size="100" src={getIcon('Pin')} style={{ color: '#00f2ff' }} />}
                            {room.is_encrypted && <Icon size="100" src={Icons.Lock} style={{ color: '#00f2ff', opacity: 0.8 }} />}
                            {room.displayName}
                        </span>
                        <span className={css.ChatTime}>
                            {(room as any).last_message_at ? formatMessageTime((room as any).last_message_at) : formatMessageTime(room.created_at)}
                        </span>
                    </div>
                    <div className={css.ChatMessageLine}>
                        <span className={css.ChatPreview}>
                            {isTyping ? (
                                <>
                                    {t('chat.typing')} <TypingIndicator />
                                </>
                            ) : room.roomIsMuted ? (
                                <>
                                    <Icon size="100" src={getIcon('BellOff')} style={{ color: '#888', marginRight: '4px' }} />
                                    {room.draft && !room.last_message_preview ? (
                                        <span style={{ color: '#ff4444' }}>
                                            {t('chat.draft', { content: room.draft.content.length > 30 ? room.draft.content.substring(0, 30) + '...' : room.draft.content })}
                                        </span>
                                    ) : room.last_message_preview ? (
                                        <>{room.last_message_preview}</>
                                    ) : (
                                        <span>{t('chat.no_messages')}</span>
                                    )}
                                </>
                            ) : room.draft && !room.last_message_preview ? (
                                <span style={{ color: '#ff4444' }}>
                                    {t('chat.draft', { content: room.draft.content.length > 30 ? room.draft.content.substring(0, 30) + '...' : room.draft.content })}
                                </span>
                            ) : room.last_message_preview ? (
                                <>{room.last_message_preview}</>
                            ) : (
                                <span>{t('chat.no_messages')}</span>
                            )}
                        </span>

                        {unreadCount > 0 && !room.roomIsMuted && (
                            <div className={css.UnreadBadgeList}>
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </div>
                        )}
                        {unreadCount > 0 && room.roomIsMuted && (
                            <div style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                backgroundColor: '#666',
                            }} />
                        )}
                    </div>
                </div>

                {isHovered && (
                    <div style={{
                        display: 'flex',
                        gap: '4px',
                        alignItems: 'center',
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        backgroundColor: 'rgba(13, 13, 13, 0.95)',
                        padding: '4px',
                        borderRadius: '8px',
                        border: '1px solid rgba(0, 242, 255, 0.2)',
                    }}>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (room.roomIsPinned) {
                                    onUnpin();
                                } else if (canPin) {
                                    onPin();
                                } else {
                                    setModalConfig({
                                        isOpen: true,
                                        type: 'alert',
                                        title: 'Внимание',
                                        message: t('ui.max_pinned_chats')
                                    });
                                }
                            }}
                            className={css.ActionButton}
                            style={{ color: room.roomIsPinned ? '#00f2ff' : '#666' }}
                            title={room.roomIsPinned ? t('ui.unpin') : t('ui.pin')}
                        >
                            <Icon size="100" src={getIcon('Pin')} />
                        </button>

                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (room.roomIsArchived) {
                                    onUnarchive();
                                } else {
                                    onArchive();
                                }
                            }}
                            className={css.ActionButton}
                            title={room.roomIsArchived ? t('ui.unarchive') : t('ui.archive')}
                        >
                            <Icon size="100" src={room.roomIsArchived ? getIcon('Inbox') : getIcon('Archive')} />
                        </button>

                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (room.roomIsMuted) {
                                    onUnmute();
                                } else {
                                    onMute();
                                }
                            }}
                            className={css.ActionButton}
                            style={{ color: room.roomIsMuted ? '#888' : '#666' }}
                            title={room.roomIsMuted ? t('ui.unmute') : t('ui.mute')}
                        >
                            <Icon size="100" src={room.roomIsMuted ? getIcon('BellOff') : Icons.Bell} />
                        </button>
                    </div>
                )}
            </div>
        </SwipeableChat>
    );
});

export function CatloverChatList() {
    const [activeTab, setActiveTab] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearchQuery = useDebounce(searchQuery, 300);
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
    const [showArchive, setShowArchive] = useState(false);
    const [hoveredRoomId, setHoveredRoomId] = useState<string | null>(null);

    const { rooms, loading, createRoom } = useSupabaseRooms();
    const { checkRateLimit, lastError: rateLimitError } = useRateLimit();
    const navigate = useNavigate();
    const { t } = useI18n();

    // Organization hooks
    const { folders, getChatsInFolder, createFolder, assignChatToFolder, removeChatFromFolder, updateFolder, deleteFolder } = useChatFolders();
    const { pinnedChats, pinChat, unpinChat, isPinned, canPin } = usePinnedChats();
    const { archiveChat, unarchiveChat, isArchived } = useArchive();
    const { muteChat, unmuteChat, isMuted } = useMuteSettings();
    const { unreadMentionsByRoom } = useMentions();
    const { getDraft } = useMessageDrafts();
    const { getUnreadCount } = useUnreadCount();
    const { isOnline } = useUserPresence();


    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newRoomName, setNewRoomName] = useState('');
    const [roomType, setRoomType] = useState<'community' | 'channel'>('community');
    const [isPublicChannel, setIsPublicChannel] = useState(true);
    const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
    const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);
    const [isFolderSettingsOpen, setIsFolderSettingsOpen] = useState(false);
    const [editingFolder, setEditingFolder] = useState<any>(null);
    const [contextMenuRoom, setContextMenuRoom] = useState<string | null>(null);
    const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null);
    const [showChannelDiscovery, setShowChannelDiscovery] = useState(false);
    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean;
        type: 'alert' | 'confirm' | 'prompt';
        title: string;
        message: string;
    }>({
        isOpen: false,
        type: 'alert',
        title: '',
        message: ''
    });

    const handleCreateRoomClick = useCallback(() => {
        setIsCreateModalOpen(true);
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setIsGlobalSearchOpen(true);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const submitCreateRoom = async () => {
        if (newRoomName.trim()) {
            const allowed = await checkRateLimit('api_request');
            if (!allowed) {
                setModalConfig({
                    isOpen: true,
                    type: 'alert',
                    title: 'Внимание',
                    message: rateLimitError || 'Rate limit exceeded. Please try again later.'
                });
                return;
            }

            const newRoom = await createRoom(
                newRoomName.trim(),
                roomType,
                roomType === 'channel' ? isPublicChannel : undefined
            );
            if (newRoom) {
                navigate(`${HOME_PATH}room/${newRoom.id}`);
            }
        }
        setIsCreateModalOpen(false);
        setNewRoomName('');
        setRoomType('community');
        setIsPublicChannel(true);
    };

    const processedRooms = useMemo(() => {
        return rooms
            .map(room => {
                const isDirect = room.is_direct;
                const isSavedMessages = isDirect && room.created_by === room.target_user_id;

                let displayName = room.name || t('ui.unnamed_chat');
                let avatarUrl = null;
                let initial = '?';

                if (room.roomIsSavedMessages) {
                    displayName = t('ui.saved_messages');
                    initial = '⭐';
                } else if (isDirect) {
                    displayName = room.other_user?.username || t('ui.unknown_user');
                    avatarUrl = room.other_user?.avatar_url;
                    initial = displayName[0]?.toUpperCase() || '?';
                } else {
                    avatarUrl = room.avatar_url;
                    initial = displayName[0]?.toUpperCase() || '?';
                }

                return {
                    ...room,
                    displayName,
                    avatarUrl,
                    initial,
                    isSavedMessages,
                    isDirect,
                    roomIsPinned: isPinned(room.id),
                    roomIsArchived: isArchived(room.id),
                    roomIsMuted: isMuted(room.id),
                    unreadMentions: unreadMentionsByRoom.get(room.id) || 0,
                    draft: getDraft(room.id),
                    pinOrder: pinnedChats.find(p => p.room_id === room.id)?.order_index || 0,
                };
            })
            .filter(room => {
                if (showArchive) return room.roomIsArchived;
                return !room.roomIsArchived;
            })
            .filter(room => {
                if (!selectedFolderId) return true;
                return getChatsInFolder(selectedFolderId).includes(room.id);
            })
            .filter(room => {
                if (activeTab === 'personal') return room.is_direct;
                if (activeTab === 'spaces') return !room.is_direct;
                return true;
            })
            .filter(room => {
                if (!debouncedSearchQuery.trim()) return true;
                return room.displayName.toLowerCase().includes(debouncedSearchQuery.toLowerCase());
            })
            .sort((a, b) => {
                if (a.roomIsPinned && !b.roomIsPinned) return -1;
                if (!a.roomIsPinned && b.roomIsPinned) return 1;
                if (a.roomIsPinned && b.roomIsPinned) return a.pinOrder - b.pinOrder;

                const timeA = a.last_message_at ? new Date(a.last_message_at).getTime() : new Date(a.created_at).getTime();
                const timeB = b.last_message_at ? new Date(b.last_message_at).getTime() : new Date(b.created_at).getTime();
                return timeB - timeA;
            });
    }, [rooms, pinnedChats, folders, activeTab, selectedFolderId, debouncedSearchQuery, showArchive, t, isPinned, isArchived, isMuted, unreadMentionsByRoom, getDraft, getChatsInFolder]);

    return (
        <div className={css.ChatListContainer}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div className={css.SearchBarWrapper} style={{ display: 'flex', gap: '8px', paddingRight: '8px' }}>
                    <div style={{ flexGrow: 1, position: 'relative' }}>
                        <div className={css.SearchIcon}>
                            <Icon size="200" src={Icons.Search} />
                        </div>
                        <input
                            id="chat-list-search-input"
                            type="text"
                            placeholder={t('chat.search_placeholder')}
                            className={css.SearchInput}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ width: '100%', boxSizing: 'border-box' }}
                        />
                    </div>
                    <button
                        onClick={handleCreateRoomClick}
                        style={{ background: 'linear-gradient(45deg, #a200ff, #00f2ff)', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer', padding: '0 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title={t('chat.create_chat')}
                    >
                        <Icon size="200" src={Icons.Plus} />
                    </button>
                </div>

                <div style={{ padding: '8px 12px' }}>
                    <button
                        onClick={() => setShowChannelDiscovery(true)}
                        style={{
                            width: '100%',
                            padding: '10px 16px',
                            background: 'rgba(0, 242, 255, 0.1)',
                            border: '1px solid rgba(0, 242, 255, 0.3)',
                            borderRadius: '8px',
                            color: '#00f2ff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            fontSize: '14px',
                            fontWeight: '500',
                            transition: 'all 0.2s ease',
                        }}
                    >
                        <Icon size="200" src={Icons.VolumeHigh} />
                        <span>{t('channels.discover')}</span>
                    </button>
                </div>

                <div className={css.ChatFolderTabs}>
                    <div
                        className={`${css.FolderTab} ${activeTab === 'all' && !showArchive && !selectedFolderId ? css.FolderTabActive : ''}`}
                        onClick={() => { setActiveTab('all'); setShowArchive(false); setSelectedFolderId(null); }}
                    >
                        💬 {t('folders.all')}
                    </div>
                    <div
                        className={`${css.FolderTab} ${activeTab === 'personal' ? css.FolderTabActive : ''}`}
                        onClick={() => { setActiveTab('personal'); setShowArchive(false); setSelectedFolderId(null); }}
                    >
                        👤 {t('folders.personal')}
                    </div>
                    <div
                        className={`${css.FolderTab} ${activeTab === 'spaces' ? css.FolderTabActive : ''}`}
                        onClick={() => { setActiveTab('spaces'); setShowArchive(false); setSelectedFolderId(null); }}
                    >
                        👥 {t('folders.groups')}
                    </div>
                    <div
                        className={`${css.FolderTab} ${showArchive ? css.FolderTabActive : ''}`}
                        onClick={() => { setShowArchive(true); setActiveTab('all'); setSelectedFolderId(null); }}
                    >
                        📦 {t('folders.archive')}
                    </div>

                    {folders.length > 0 && <div style={{ width: '1px', height: '20px', backgroundColor: 'rgba(255, 255, 255, 0.1)', margin: '0 4px' }} />}

                    {folders.map(folder => (
                        <div
                            key={folder.id}
                            className={`${css.FolderTab} ${selectedFolderId === folder.id ? css.FolderTabActive : ''}`}
                            onClick={() => { setSelectedFolderId(folder.id); setActiveTab('all'); setShowArchive(false); }}
                            onContextMenu={(e) => { e.preventDefault(); setEditingFolder(folder); setIsFolderSettingsOpen(true); }}
                        >
                            {folder.icon && <span>{folder.icon}</span>}
                            {folder.name}
                        </div>
                    ))}

                    <div
                        className={css.FolderTab}
                        onClick={() => { setEditingFolder(null); setIsFolderSettingsOpen(true); }}
                        style={{ color: 'rgba(0, 242, 255, 0.7)', border: '1px dashed rgba(0, 242, 255, 0.3)' }}
                    >
                        <Icon size="100" src={Icons.Plus} />
                    </div>
                </div>

                <div className={css.ChatListScrollArea}>
                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
                            <Spinner variant="Secondary" />
                        </div>
                    ) : processedRooms.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '20px', color: 'rgba(255,255,255,0.3)' }}>
                            {t('chat.no_chats')}
                        </div>
                    ) : (
                        <Virtuoso
                            data={processedRooms}
                            style={{ height: '100%', width: '100%' }}
                            itemContent={(index, room) => (
                                <div style={{ paddingBottom: '8px' }}>
                                    <ChatListItem
                                        room={room}
                                        isOnline={isOnline(room.target_user_id || '')}
                                        unreadCount={getUnreadCount(room.id)}
                                        onNavigate={() => navigate(`${HOME_PATH}room/${room.id}`)}
                                        onArchive={() => archiveChat(room.id)}
                                        onUnarchive={() => unarchiveChat(room.id)}
                                        onPin={() => pinChat(room.id)}
                                        onUnpin={() => unpinChat(room.id)}
                                        onMute={() => muteChat(room.id, '1h')}
                                        onUnmute={() => unmuteChat(room.id)}
                                        canPin={pinnedChats.length < 5}
                                        setContextMenuRoom={setContextMenuRoom}
                                        setContextMenuPosition={setContextMenuPosition}
                                        setHoveredRoomId={setHoveredRoomId}
                                        isHovered={hoveredRoomId === room.id}
                                        setModalConfig={setModalConfig}
                                        t={t}
                                    />
                                </div>
                            )}
                        />
                    )}
                </div>
            </div>

            {isGlobalSearchOpen && <GlobalSearch onClose={() => setIsGlobalSearchOpen(false)} />}
            {showChannelDiscovery && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ background: '#0a0a0a', borderRadius: '16px', border: '1px solid rgba(0, 242, 255, 0.3)', width: '100%', maxWidth: '800px', maxHeight: '90vh', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0, 242, 255, 0.2)', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                            <h2 style={{ margin: 0, color: '#00f2ff', fontSize: '20px' }}>{t('channels.discover')}</h2>
                            <button onClick={() => setShowChannelDiscovery(false)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>
                                <Icon size="200" src={Icons.Cross} />
                            </button>
                        </div>
                        <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}><ChannelDiscovery /></div>
                    </div>
                </div>
            )}

            {isCreateModalOpen && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: '#0a0a0a', padding: '24px', borderRadius: '16px', border: '1px solid #1a1a1a', width: '400px', boxShadow: '0 8px 32px rgba(0, 242, 255, 0.1)' }}>
                        <h3 style={{ color: '#00f2ff', marginTop: 0, marginBottom: '16px' }}>{roomType === 'channel' ? t('channels.new_channel') : t('chat.new_group')}</h3>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ color: '#888', fontSize: '12px', display: 'block', marginBottom: '8px' }}>{t('ui.type')}</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button type="button" onClick={() => setRoomType('community')} style={{ flex: 1, padding: '12px', background: roomType === 'community' ? 'linear-gradient(45deg, #a200ff, #00f2ff)' : '#141414', border: roomType === 'community' ? 'none' : '1px solid #333', borderRadius: '8px', color: '#fff', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                    <Icon size="200" src={Icons.User} /><span style={{ fontSize: '14px', fontWeight: '500' }}>{t('ui.group')}</span>
                                </button>
                                <button type="button" onClick={() => setRoomType('channel')} style={{ flex: 1, padding: '12px', background: roomType === 'channel' ? 'linear-gradient(45deg, #a200ff, #00f2ff)' : '#141414', border: roomType === 'channel' ? 'none' : '1px solid #333', borderRadius: '8px', color: '#fff', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                    <Icon size="200" src={Icons.VolumeHigh} /><span style={{ fontSize: '14px', fontWeight: '500' }}>{t('ui.channel')}</span>
                                </button>
                            </div>
                        </div>
                        <input type="text" placeholder={roomType === 'channel' ? t('channels.channel_name_placeholder') : t('chat.group_name_placeholder')} value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)} style={{ width: '100%', padding: '10px', boxSizing: 'border-box', background: '#141414', border: '1px solid #333', borderRadius: '8px', color: '#fff', marginBottom: '16px' }} autoFocus />
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setIsCreateModalOpen(false)} style={{ padding: '8px 16px', background: 'transparent', border: 'none', color: '#888', cursor: 'pointer' }}>{t('ui.cancel')}</button>
                            <button onClick={submitCreateRoom} disabled={!newRoomName.trim()} style={{ padding: '8px 16px', background: newRoomName.trim() ? 'linear-gradient(45deg, #a200ff, #00f2ff)' : '#333', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}>{t('ui.create')}</button>
                        </div>
                    </div>
                </div>
            )}

            <FolderSettings
                open={isFolderSettingsOpen}
                folder={editingFolder}
                allRooms={rooms}
                selectedRoomIds={editingFolder ? getChatsInFolder(editingFolder.id) : []}
                onClose={() => { setIsFolderSettingsOpen(false); setEditingFolder(null); }}
                onSave={async (name, icon, roomIds) => {
                    if (editingFolder) {
                        await updateFolder(editingFolder.id, { name, icon });
                        const currentRooms = getChatsInFolder(editingFolder.id);
                        for (const id of roomIds.filter(id => !currentRooms.includes(id))) await assignChatToFolder(id, editingFolder.id);
                        for (const id of currentRooms.filter(id => !roomIds.includes(id))) await removeChatFromFolder(id, editingFolder.id);
                    } else {
                        const newFolder = await createFolder(name, icon);
                        for (const id of roomIds) await assignChatToFolder(id, newFolder.id);
                    }
                }}
                onDelete={editingFolder ? async () => { await deleteFolder(editingFolder.id); if (selectedFolderId === editingFolder.id) { setSelectedFolderId(null); setActiveTab('all'); } } : undefined}
            />

            {contextMenuRoom && contextMenuPosition && (
                <>
                    <div onClick={() => { setContextMenuRoom(null); setContextMenuPosition(null); }} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }} />
                    <div style={{ position: 'fixed', top: contextMenuPosition.y, left: contextMenuPosition.x, backgroundColor: '#1a1a1a', border: '1px solid rgba(0, 242, 255, 0.3)', borderRadius: '8px', padding: '8px 0', minWidth: '200px', zIndex: 1000, boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)' }}>
                        {folders.length > 0 && (
                            <>
                                <div style={{ padding: '8px 16px', fontSize: '12px', color: '#888', fontWeight: 'bold' }}>Добавить в папку:</div>
                                {folders.map(folder => {
                                    const isInFolder = getChatsInFolder(folder.id).includes(contextMenuRoom);
                                    return (
                                        <div key={folder.id} onClick={async () => { if (isInFolder) await removeChatFromFolder(contextMenuRoom, folder.id); else await assignChatToFolder(contextMenuRoom, folder.id); setContextMenuRoom(null); setContextMenuPosition(null); }} style={{ padding: '10px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: isInFolder ? '#00f2ff' : '#fff' }}>
                                            {folder.icon} {folder.name}
                                        </div>
                                    );
                                })}
                                <div style={{ height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.1)', margin: '8px 0' }} />
                            </>
                        )}
                        <div onClick={() => { setContextMenuRoom(null); setContextMenuPosition(null); }} style={{ padding: '10px 16px', cursor: 'pointer', color: '#ff4444' }}>Закрыть</div>
                    </div>
                </>
            )}

            <CatloverModal
                isOpen={modalConfig.isOpen}
                onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
                type={modalConfig.type}
                title={modalConfig.title}
                message={modalConfig.message}
            />
        </div>
    );
}

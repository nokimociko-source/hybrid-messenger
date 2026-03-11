import { logger } from '../../utils/logger';
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { useParams, useNavigate } from 'react-router-dom';
import { Icon, Icons, Spinner, Scroll } from 'folds';
import * as css from './CatloverRoomView.css';
import { useSupabaseRoom } from '../../hooks/useSupabaseRoom';
import { useSupabaseMessages } from '../../hooks/useSupabaseMessages';
import { useSupabaseRooms } from '../../hooks/useSupabaseRooms';
import { Message } from '../../hooks/supabaseHelpers';
import { useSupabaseCall } from '../../hooks/useSupabaseCall';
import { useRoomTyping } from '../../hooks/useRoomTyping';
import { useReadReceipts } from '../../hooks/useReadReceipts';
import { useUnreadCount } from '../../hooks/useUnreadCount';
import { CatloverAudioPlayer } from './CatloverAudioPlayer';
import { CatloverProfilePanel } from './CatloverProfilePanel';
import { CatloverCallModal } from './CatloverCallModal';
import { SimpleGroupCallModal } from './SimpleGroupCallModal';
import { CatloverAvatar } from '../../components/CatloverAvatar';
import { CatloverConfirmModal } from '../../components/CatloverConfirmModal';
import { MessageSearch } from '../../components/MessageSearch';
import { EmojiPicker } from '../../components/EmojiPicker';
import { StickerMessage } from '../../components/StickerMessage';
import { FormattedMessage } from '../../components/FormattedMessage';
import { FormattingToolbar } from '../../components/FormattingToolbar';
import { MentionAutocomplete } from '../../components/MentionAutocomplete';
import { PollMessage } from '../../components/PollMessage';
import { useMentions } from '../../hooks/useMentions';
import { useMessageDrafts } from '../../hooks/useMessageDrafts';
import { usePolls } from '../../hooks/usePolls';
import { getCurrentMention, replaceMention, highlightMentions } from '../../utils/mentionUtils';
import { supabase } from '../../../supabaseClient';
import { MediaGrid } from '../../components/MediaGrid';
import { PreviewCard } from '../../components/PreviewCard';
import { useLinkPreview } from '../../hooks/useLinkPreview';
import { extractFirstUrl } from '../../utils/linkPreviewParser';
import { isAlbumMessage } from '../../utils/albumSerializer';
import { UserProfileModal } from '../../components/UserProfileModal';
import { HOME_PATH } from '../paths';
import { ChannelHeader } from '../../components/ChannelHeader';
import { ChannelMessageInput } from '../../components/ChannelMessageInput';
import { ChannelViewStatistics } from '../../components/ChannelViewStatistics';
import { useChannelPermissions } from '../../hooks/useChannelPermissions';
import { useChannelViewStats } from '../../hooks/useChannelViewStats';
import { MessageItem } from './MessageItem';
import { getMediaType, formatDateHeader, isVideoCircleUrl } from '../../utils/chatUtils';
import { getPresignedViewUrl } from '../../utils/s3Client';
import { useEncryption } from '../../context/EncryptionContext';
import { MasterPasswordModal } from '../../components/MasterPasswordModal';
import { ReportModal } from '../../components/ReportModal';
import { EncryptedMedia } from '../../components/EncryptedMedia';
import { RoomHeader } from './room-view-parts/RoomHeader';
import { MessageInputArea } from './room-view-parts/MessageInputArea';
import { MessageList } from './room-view-parts/MessageList';
import type { MessageListItem } from './room-view-parts/MessageList.types';
import { useRoomMessageInput } from '../../hooks/useRoomMessageInput';
import { ForwardMessageModal } from '../../components/ForwardMessageModal';
import { EncryptionSetupModal } from '../../components/EncryptionSetupModal';
import { ChannelSettingsModal } from '../../components/ChannelSettingsModal';
import { GroupSettingsModal } from '../../components/GroupSettingsModal';

const getIcon = (name: string) => {
    return (Icons as any)[name] || (Icons as any).X || (Icons as any).Message || (Icons as any).Home;
};

export function CatloverRoomView() {
    const { roomId } = useParams<{ roomId: string }>();
    const navigate = useNavigate();

    const [uploadProgress, setUploadProgress] = useState(0);

    // Detect mobile screen
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const { rooms, loading: roomsLoading } = useSupabaseRooms();
    const { room, loading: roomLoading } = useSupabaseRoom(roomId);
    const {
        messages,
        loading: messagesLoading,
        sendMessage,
        insertMessages,
        updateMessage,
        deleteMessage,
        uploadMedia,
        addReaction,
        pinMessage,
        unpinMessage,
        forwardMessage,
        currentUser
    } = useSupabaseMessages(roomId);

    const callHook = useSupabaseCall(roomId);
    const { startCall, callStatus } = callHook;
    const { typingUsers, startTyping, stopTyping } = useRoomTyping(roomId || '');
    const { markRoomAsRead } = useReadReceipts(roomId, currentUser);
    const { getUnreadCount, getLastReadMessageId, markAsRead } = useUnreadCount();

    // Organization hooks
    const { getRoomMembers } = useMentions(roomId);
    const { saveDraft, getDraft, deleteDraft } = useMessageDrafts();

    // Polls hook
    const { polls, vote, unvote } = usePolls(roomId || '');

    // Message input hook
    const inputState = useRoomMessageInput({
        roomId,
        sendMessage,
        updateMessage,
        uploadMedia,
        insertMessages,
        currentUser,
        startTyping,
        stopTyping,
        getDraft,
        saveDraft,
        deleteDraft,
        getRoomMembers
    });

    const {
        inputValue, setInputValue, cursorPosition, setCursorPosition,
        editingMessage, setEditingMessage, replyingTo, setReplyingTo,
        isRecording, recordingTime, isCircleMode, isUploading,
        showEmojiPicker, setShowEmojiPicker, showFormattingToolbar, setShowFormattingToolbar,
        showMentionAutocomplete, setShowMentionAutocomplete, mentionMembers, mentionQuery, mentionPosition,
        inputRef, fileInputRef, videoPreviewRef, handleSendText, handleInputChange, handleKeyDown,
        handleFormat, handleFileSelect, handleMentionSelect, handleActionButtonClick, toggleMode, cancelRecording,
        startRecording, stopRecording
    } = inputState;

    // Link preview hook
    const { fetchPreviewFromText } = useLinkPreview();
    const [linkPreviews, setLinkPreviews] = useState<Map<string, any>>(new Map());

    // Channel hooks
    const { permissions: channelPermissions } = useChannelPermissions(roomId || '');
    const { recordView } = useChannelViewStats(''); // Will be called per message

    // Track viewed messages for channels
    const viewedMessagesRef = useRef<Set<string>>(new Set());
    const viewRecordTimeoutsRef = useRef<Map<string, any>>(new Map());

    const loading = roomLoading || messagesLoading;

    // Virtuoso ref and flattened items
    const virtuosoRef = useRef<VirtuosoHandle>(null);

    const filteredMessages = useMemo(() => {
        return messages.filter((msg) => {
            if (!(msg as any).media_group_id) return true;
            if ((msg as any).media_order === 0) return true;
            return false;
        });
    }, [messages]);

    const virtualItems = useMemo((): MessageListItem[] => {
        const items: MessageListItem[] = [];
        let lastDate = '';

        filteredMessages.forEach((msg) => {
            const dateStr = formatDateHeader(msg.created_at);
            if (dateStr !== lastDate) {
                items.push({ type: 'date', date: dateStr, id: `date-${dateStr}-${msg.id}` });
                lastDate = dateStr;
            }
            items.push({ type: 'message', message: msg, id: msg.id });
        });

        if (isUploading) {
            items.push({ type: 'uploading', id: 'uploading-indicator', fileName: 'Загрузка...' });
        }

        return items;
    }, [filteredMessages, isUploading]);

    // E2EE hooks
    const { isLocked, decrypt, encrypt, masterKey } = useEncryption();
    const [isEncryptionModalOpen, setIsEncryptionModalOpen] = useState(false);
    const isSavedMessages = !!(room?.is_direct && room?.created_by === room?.target_user_id);

    useEffect(() => {
        if (isSavedMessages && isLocked) {
            setIsEncryptionModalOpen(true);
        }
    }, [isSavedMessages, isLocked]);

    const [showProfile, setShowProfile] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [viewingMedia, setViewingMedia] = useState<string | null>(null);
    const [showUserProfile, setShowUserProfile] = useState<string | null>(null);
    const [showJumpToUnread, setShowJumpToUnread] = useState(false);
    const [firstUnreadMessageId, setFirstUnreadMessageId] = useState<string | null>(null);
    const [showForwardModal, setShowForwardModal] = useState(false);
    const [messageToForward, setMessageToForward] = useState<Message | null>(null);
    const [showChannelSettings, setShowChannelSettings] = useState(false);
    const [showGroupSettings, setShowGroupSettings] = useState(false);
    const [reportConfig, setReportConfig] = useState<{
        isOpen: boolean;
        message: Message | null;
        decryptedContent?: string;
    }>({
        isOpen: false,
        message: null
    });

    // Multi-select and Toasts
    const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
    const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
    const [showActionToast, setShowActionToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');

    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean;
        type: 'alert' | 'confirm' | 'prompt';
        title: string;
        message: string;
        confirmLabel?: string;
        cancelLabel?: string;
        defaultValue?: string;
        placeholder?: string;
        onConfirm?: (value?: string) => void;
        isDanger?: boolean;
    }>({
        isOpen: false,
        type: 'alert',
        title: '',
        message: ''
    });

    const backgroundStyle = {
        ...(room?.background_url ? {
            '--chat-bg-image': `url(${room.background_url})`,
            '--chat-bg-opacity': room.background_config?.opacity ?? '0.04',
            '--chat-bg-overlay': room.background_config?.overlay ?? 'transparent',
            '--chat-bg-pattern': room.background_config?.pattern ? `url(${room.background_config.pattern})` : 'none',
        } : {}),
        backgroundColor: room?.background_color || '#0d0d0d',
    } as React.CSSProperties;

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const lastSelectedIdRef = useRef<string | null>(null);

    const handleReport = useCallback(async (msg: Message) => {
        let content = msg.content;

        // If content is likely encrypted and we have masterKey, try to decrypt it for the report
        if (masterKey && content && content.length > 50 && !content.includes(' ')) {
            try {
                content = await decrypt(content);
            } catch (e) {
                logger.error('Failed to decrypt message for report:', e);
            }
        }

        setReportConfig({
            isOpen: true,
            message: msg,
            decryptedContent: content
        });
    }, [masterKey, decrypt]);

    // Close emoji picker when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (showEmojiPicker) {
                setShowEmojiPicker(false);
            }
        };

        if (showEmojiPicker) {
            document.addEventListener('click', handleClickOutside);
        }

        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, [showEmojiPicker]);

    // Virtuoso handles scrolling via followOutput, so we can simplify this
    useEffect(() => {
        // virtuosoRef.current?.scrollToIndex({ index: virtualItems.length - 1 });
    }, [virtualItems.length]);

    // Check for unread messages and show jump button
    useEffect(() => {
        if (!roomId) return;

        const unreadCount = getUnreadCount(roomId);
        if (unreadCount > 0 && messages.length > 0) {
            // Find the first unread message based on last_read_message_id
            const lastReadId = getLastReadMessageId(roomId);

            if (lastReadId) {
                // Find the index of last read message
                const lastReadIndex = messages.findIndex(m => m.id === lastReadId);

                if (lastReadIndex >= 0 && lastReadIndex < messages.length - 1) {
                    // First unread is the next message after last read
                    const firstUnread = messages[lastReadIndex + 1];
                    setFirstUnreadMessageId(firstUnread.id);
                    setShowJumpToUnread(true);
                } else {
                    // Last read not found or is the last message, show button anyway
                    setShowJumpToUnread(true);
                    setFirstUnreadMessageId(null);
                }
            } else {
                // No last read message, all messages are unread
                if (messages.length > 0) {
                    setFirstUnreadMessageId(messages[0].id);
                    setShowJumpToUnread(true);
                }
            }
        } else {
            setShowJumpToUnread(false);
            setFirstUnreadMessageId(null);
        }
    }, [roomId, messages, getUnreadCount, getLastReadMessageId]);

    // Load link previews for messages
    useEffect(() => {
        messages.forEach(async (msg) => {
            if (msg.content && !msg.media_url && !linkPreviews.has(msg.id)) {
                const url = extractFirstUrl(msg.content);
                if (url) {
                    const preview = await fetchPreviewFromText(msg.content);
                    if (preview) {
                        setLinkPreviews(prev => new Map(prev).set(msg.id, preview));
                    }
                }
            }
        });
    }, [messages]);

    // Record message views for channels with debouncing
    useEffect(() => {
        // Only record views for channels
        if (room?.type !== 'channel') {
            return;
        }

        // Get visible messages (simplified - in production you'd use IntersectionObserver)
        const visibleMessages = messages.slice(-10); // Last 10 messages as approximation

        visibleMessages.forEach((msg) => {
            // Skip if already viewed
            if (viewedMessagesRef.current.has(msg.id)) {
                return;
            }

            // Clear any existing timeout for this message
            const existingTimeout = viewRecordTimeoutsRef.current.get(msg.id);
            if (existingTimeout) {
                clearTimeout(existingTimeout);
            }

            // Set new timeout to record view after 3 seconds
            const timeout = setTimeout(async () => {
                if (!viewedMessagesRef.current.has(msg.id)) {
                    viewedMessagesRef.current.add(msg.id);

                    // Record the view
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                        const { error } = await supabase.rpc('record_message_view', {
                            p_message_id: msg.id,
                            p_user_id: user.id,
                        });

                        if (error) {
                            logger.error('Error recording message view:', error);
                            // Remove from viewed set on error so it can be retried
                            viewedMessagesRef.current.delete(msg.id);
                        }
                    }
                }

                // Clean up timeout reference
                viewRecordTimeoutsRef.current.delete(msg.id);
            }, 3000);

            viewRecordTimeoutsRef.current.set(msg.id, timeout);
        });

        // Cleanup function
        return () => {
            viewRecordTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
            viewRecordTimeoutsRef.current.clear();
        };
    }, [room, messages]);

    const handleViewMedia = async (url: string) => {
        let finalUrl = url;
        if (url.includes('wasabisys.com')) {
            finalUrl = await getPresignedViewUrl(url);
        }
        setViewingMedia(finalUrl);
    };

    const handleDeleteMessage = (msgId: string) => {
        setModalConfig({
            isOpen: true,
            type: 'confirm',
            title: 'Удалить сообщение',
            message: 'Вы уверены, что хотите удалить это сообщение?',
            confirmLabel: 'Удалить',
            cancelLabel: 'Отмена',
            isDanger: true,
            onConfirm: () => {
                deleteMessage(msgId);
            }
        });
    };

    const handleForwardMessage = (msg: Message) => {
        setMessageToForward(msg);
        setShowForwardModal(true);
    };

    const handlePinMessage = async (msgId: string) => {
        await pinMessage(msgId);
        showToast('Сообщение закреплено');
    };

    const handleUnpinMessage = async (msgId: string) => {
        await unpinMessage(msgId);
        showToast('Сообщение откреплено');
    };

    const toggleMessageSelection = (msgId: string) => {
        setSelectedMessages(prev => {
            const newSet = new Set(prev);
            if (newSet.has(msgId)) {
                newSet.delete(msgId);
            } else {
                newSet.add(msgId);
                lastSelectedIdRef.current = msgId;
            }
            return newSet;
        });
        setIsMultiSelectMode(true);
    };

    const cancelMultiSelect = () => {
        setIsMultiSelectMode(false);
        setSelectedMessages(new Set());
    };

    const handleLongPress = (msgId: string) => {
        if (!isMultiSelectMode) {
            setIsMultiSelectMode(true);
            setSelectedMessages(new Set([msgId]));
            lastSelectedIdRef.current = msgId;
        }
    };

    const handleSelectUntilHere = (msgId: string) => {
        if (!lastSelectedIdRef.current) return;
        
        const lastIdx = filteredMessages.findIndex(m => m.id === lastSelectedIdRef.current);
        const currentIdx = filteredMessages.findIndex(m => m.id === msgId);
        
        if (lastIdx === -1 || currentIdx === -1) return;
        
        const start = Math.min(lastIdx, currentIdx);
        const end = Math.max(lastIdx, currentIdx);
        
        const newSelected = new Set(selectedMessages);
        for (let i = start; i <= end; i++) {
            newSelected.add(filteredMessages[i].id);
        }
        setSelectedMessages(newSelected);
        lastSelectedIdRef.current = msgId;
    };

    const deleteSelectedMessages = async () => {
        const count = selectedMessages.size;
        for (const msgId of Array.from(selectedMessages)) {
            await deleteMessage(msgId);
        }
        showToast(`Удалено сообщений: ${count}`);
        cancelMultiSelect();
    };

    const forwardSelectedMessages = () => {
        const firstMsgId = Array.from(selectedMessages)[0];
        const msg = messages.find(m => m.id === firstMsgId);
        if (msg) {
            setMessageToForward(msg);
            setShowForwardModal(true);
        }
    };

    const startEditMessage = (msg: Message) => {
        setEditingMessage(msg);
        setInputValue(msg.content);
        if (inputRef.current) inputRef.current.focus();
    };

    const showToast = (message: string) => {
        setToastMessage(message);
        setShowActionToast(true);
        setTimeout(() => setShowActionToast(false), 3000);
    };

    const pinnedMessages = useMemo(() => messages.filter(m => m.is_pinned), [messages]);

    if (!roomId) {
        return (
            <div style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', background: '#0d0d0d' }}>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '18px' }}>Выберите чат слева, чтобы начать общение</div>
            </div>
        );
    }

    const isDirect_room = room?.type === 'direct';

    let displayName = room?.name || 'Безымянный чат';
    let avatarUrl = null;
    let initial: React.ReactNode = '?';

    if (isSavedMessages) {
        displayName = 'Избранное';
        initial = (
            <div style={{
                width: '100%',
                height: '100%',
                backgroundImage: 'url(/res/neko_girl.png)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                borderRadius: '50%'
            }} />
        );
    } else if (isDirect_room) {
        displayName = room?.other_user?.username || 'Неизвестный пользователь';
        avatarUrl = room?.other_user?.avatar_url;
        initial = displayName[0]?.toUpperCase() || '?';
    } else {
        avatarUrl = room?.avatar_url;
        initial = displayName[0]?.toUpperCase() || '?';
    }

    return (
        <div className={css.ChatContainer} style={backgroundStyle}>
            <div className={css.ChatMain}>
                <RoomHeader
                    room={room}
                    displayName={displayName}
                    avatarUrl={avatarUrl}
                    initial={initial}
                    isSavedMessages={isSavedMessages}
                    isDirect_room={isDirect_room}
                    typingUsers={typingUsers}
                    isMobile={isMobile}
                    showProfile={showProfile}
                    setShowProfile={setShowProfile}
                    setShowSearch={setShowSearch}
                    startCall={startCall}
                />

                {pinnedMessages.length > 0 && !isMultiSelectMode && (
                    <div className={css.PinnedBanner} onClick={() => {
                        const element = document.getElementById(`msg-${pinnedMessages[0].id}`);
                        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', flex: 1, gap: '12px', overflow: 'hidden' }}>
                            <Icon size="100" src={Icons.Pin} style={{ color: '#00f2ff' }} />
                            <div style={{ overflow: 'hidden' }}>
                                <div style={{ fontSize: '12px', color: '#00f2ff', fontWeight: 'bold' }}>Закрепленное сообщение</div>
                                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {pinnedMessages[0].content || '📎 Медиа'}
                                </div>
                            </div>
                        </div>
                        <div onClick={(e) => { e.stopPropagation(); handleUnpinMessage(pinnedMessages[0].id); }} style={{ padding: '8px', cursor: 'pointer' }}>
                            <Icon size="100" src={Icons.Cross} />
                        </div>
                    </div>
                )}

                <div className={css.ChatMessages} style={{ flex: 1, position: 'relative' }}>
                    <MessageList
                        virtualItems={virtualItems}
                        roomId={roomId}
                        loading={loading}
                        showJumpToUnread={showJumpToUnread}
                        handleJumpToUnread={() => {
                            if (firstUnreadMessageId) {
                                const element = document.getElementById(`msg-${firstUnreadMessageId}`);
                                element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            } else {
                                virtuosoRef.current?.scrollToIndex({ index: virtualItems.length - 1, behavior: 'smooth' });
                            }
                            setShowJumpToUnread(false);
                        }}
                        getUnreadCount={getUnreadCount}
                        room={room}
                        virtuosoRef={virtuosoRef}
                        currentUser={currentUser}
                        isMultiSelectMode={isMultiSelectMode}
                        selectedMessages={selectedMessages}
                        toggleMessageSelection={toggleMessageSelection}
                        handleLongPress={handleLongPress}
                        addReaction={addReaction}
                        handleForwardMessage={handleForwardMessage}
                        setReplyingTo={setReplyingTo}
                        handleDeleteMessage={handleDeleteMessage}
                        startEditMessage={startEditMessage}
                        handlePinMessage={handlePinMessage}
                        handleUnpinMessage={handleUnpinMessage}
                        setShowUserProfile={setShowUserProfile}
                        handleViewMedia={handleViewMedia}
                        vote={vote}
                        unvote={unvote}
                        polls={polls}
                        linkPreviews={linkPreviews}
                        channelPermissions={channelPermissions}
                        messages={messages}
                        isSavedMessages={isSavedMessages}
                        lastSelectedId={lastSelectedIdRef.current}
                        handleSelectUntilHere={handleSelectUntilHere}
                        handleReport={handleReport}
                        isEncryptionModalOpen={isEncryptionModalOpen}
                        setIsEncryptionModalOpen={setIsEncryptionModalOpen}
                    />
                    {showJumpToUnread && (
                        <div className={css.JumpToUnread} onClick={() => {
                            if (firstUnreadMessageId) {
                                const element = document.getElementById(`msg-${firstUnreadMessageId}`);
                                element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            } else {
                                virtuosoRef.current?.scrollToIndex({ index: virtualItems.length - 1, behavior: 'smooth' });
                            }
                            setShowJumpToUnread(false);
                        }}>
                            <Icon size="100" src={Icons.ChevronBottom} />
                            <span>К непрочитанным</span>
                        </div>
                    )}
                </div>

                <MessageInputArea
                    {...inputState}
                    roomId={roomId || ''}
                    isMobile={isMobile}
                />
            </div>

            {/* Modals & Overlays */}
            {isMultiSelectMode && (
                <div className={css.MultiSelectToolbar}>
                    <div className={css.MultiSelectInfo}>
                        <button onClick={cancelMultiSelect} style={{ background: 'none', border: 'none', color: '#00f2ff', cursor: 'pointer' }}>
                            <Icon size="200" src={Icons.Cross} />
                        </button>
                        <span>Выбрано: {selectedMessages.size}</span>
                    </div>
                    <div className={css.MultiSelectActions}>
                        <button onClick={forwardSelectedMessages} disabled={selectedMessages.size === 0}>
                            <Icon size="100" src={Icons.ArrowGoRight} /> Переслать
                        </button>
                        <button onClick={deleteSelectedMessages} disabled={selectedMessages.size === 0} className={css.DangerAction}>
                            <Icon size="100" src={Icons.Delete} /> Удалить
                        </button>
                    </div>
                </div>
            )}

            {showSearch && (
                <MessageSearch
                    messages={messages}
                    onClose={() => setShowSearch(false)}
                    onSelectMessage={(msgId) => {
                        const element = document.getElementById(`msg-${msgId}`);
                        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                />
            )}

            {showProfile && room && (
                <CatloverProfilePanel
                    room={room}
                    messages={messages}
                    onClose={() => setShowProfile(false)}
                    currentUserId={currentUser || undefined}
                    onDeleteMessage={deleteMessage}
                    setShowChannelSettings={setShowChannelSettings}
                    setShowGroupSettings={setShowGroupSettings}
                />
            )}

            {showUserProfile && (
                <UserProfileModal
                    userId={showUserProfile}
                    onClose={() => setShowUserProfile(null)}
                    onStartChat={(roomId) => navigate(`/room/${roomId}`)}
                />
            )}

            {showForwardModal && messageToForward && (
                <ForwardMessageModal
                    message={messageToForward}
                    onClose={() => setShowForwardModal(false)}
                    onForward={async (targetRoomIds: string[]) => {
                        for (const targetId of targetRoomIds) {
                            await sendMessage(`[Переслано]: ${messageToForward.content || ''}`, messageToForward.media_url, targetId);
                        }
                        setShowForwardModal(false);
                        showToast('Сообщение переслано');
                    }}
                />
            )}

            {reportConfig.isOpen && reportConfig.message && (
                <ReportModal
                    isOpen={reportConfig.isOpen}
                    onClose={() => setReportConfig(prev => ({ ...prev, isOpen: false }))}
                    reportType="message"
                    targetId={reportConfig.message.id}
                    targetName={
                        room?.type === 'channel' || room?.type === 'community'
                            ? `Автор в ${room?.name || 'канале'}`
                            : `Автор ${reportConfig.message.users?.username || 'пользователь'}`
                    }
                    reportedContent={reportConfig.decryptedContent}
                />
            )}

            {modalConfig.isOpen && (
                <CatloverConfirmModal
                    isOpen={modalConfig.isOpen}
                    title={modalConfig.title}
                    message={modalConfig.message}
                    confirmLabel={modalConfig.confirmLabel}
                    cancelLabel={modalConfig.cancelLabel}
                    onConfirm={() => {
                        modalConfig.onConfirm?.();
                        setModalConfig(prev => ({ ...prev, isOpen: false }));
                    }}
                    onCancel={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
                    isDanger={modalConfig.isDanger}
                />
            )}

            {showChannelSettings && room && (
                <ChannelSettingsModal
                    room={room}
                    onClose={() => setShowChannelSettings(false)}
                    onUpdate={() => {
                        setShowChannelSettings(false);
                    }}
                />
            )}

            {showGroupSettings && room && (
                <GroupSettingsModal
                    room={room}
                    onClose={() => setShowGroupSettings(false)}
                    onUpdate={() => {
                        setShowGroupSettings(false);
                    }}
                />
            )}

            {showActionToast && (
                <div className={css.ActionToast}>
                    {toastMessage}
                </div>
            )}

            {isEncryptionModalOpen && isSavedMessages && (
                <EncryptionSetupModal
                    isOpen={isEncryptionModalOpen}
                    onClose={() => setIsEncryptionModalOpen(false)}
                    roomId={roomId}
                />
            )}

            {callStatus !== 'idle' && room && (
                room.is_direct ? (
                    <CatloverCallModal room={room} callHook={callHook} onClose={() => { }} />
                ) : (
                    <SimpleGroupCallModal room={room} onClose={() => callHook.endCall?.()} />
                )
            )}

            {viewingMedia && (
                <div
                    className={css.MediaOverlay}
                    onClick={() => setViewingMedia(null)}
                >
                    <div className={css.MediaClose}>
                        <Icon size="400" src={getIcon('Close')} />
                    </div>
                    {viewingMedia.match(/\.(mp4|webm)$/i) ? (
                        <video src={viewingMedia} controls autoPlay onClick={(e) => e.stopPropagation()} />
                    ) : (
                        <img src={viewingMedia} alt="Media" onClick={(e) => e.stopPropagation()} />
                    )}
                </div>
            )}

            <style>{`
                @keyframes toastSlideUp {
                    from { opacity: 0; transform: translate(-50%, 20px); }
                    to { opacity: 1; transform: translate(-50%, 0); }
                }
            `}</style>
        </div>
    );
}

export default CatloverRoomView;

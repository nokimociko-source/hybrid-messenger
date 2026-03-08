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

const getIcon = (name: string) => {
    return (Icons as any)[name] || (Icons as any).X || (Icons as any).Message || (Icons as any).Home;
};

export function CatloverRoomView() {
    const { roomId } = useParams<{ roomId: string }>();
    const navigate = useNavigate();

    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [inputValue, setInputValue] = useState('');

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

    const virtualItems = useMemo(() => {
        const items: any[] = [];
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
            items.push({ type: 'uploading', id: 'uploading-indicator' });
        }

        return items;
    }, [filteredMessages, isUploading]);

    const [cursorPosition, setCursorPosition] = useState(0);
    const [showMentionAutocomplete, setShowMentionAutocomplete] = useState(false);
    const [mentionMembers, setMentionMembers] = useState<any[]>([]);
    const [mentionQuery, setMentionQuery] = useState('');
    const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
    const inputRef = useRef<HTMLInputElement>(null);

    // E2EE hooks
    const { isLocked, decrypt, encrypt, masterKey } = useEncryption();
    const [isEncryptionModalOpen, setIsEncryptionModalOpen] = useState(false);
    const isSavedMessages = room?.is_direct && room?.created_by === room?.target_user_id;

    useEffect(() => {
        if (isSavedMessages && isLocked) {
            setIsEncryptionModalOpen(true);
        }
    }, [isSavedMessages, isLocked]);

    const [showProfile, setShowProfile] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [viewingMedia, setViewingMedia] = useState<string | null>(null);
    const [showUserProfile, setShowUserProfile] = useState<string | null>(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showFormattingToolbar, setShowFormattingToolbar] = useState(false);
    const [showJumpToUnread, setShowJumpToUnread] = useState(false);
    const [firstUnreadMessageId, setFirstUnreadMessageId] = useState<string | null>(null);
    const [showForwardModal, setShowForwardModal] = useState(false);
    const [messageToForward, setMessageToForward] = useState<Message | null>(null);
    const [reportConfig, setReportConfig] = useState<{
        isOpen: boolean;
        message: Message | null;
        decryptedContent?: string;
    }>({
        isOpen: false,
        message: null
    });

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

    const [editingMessage, setEditingMessage] = useState<Message | null>(null);
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);

    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [isCircleMode, setIsCircleMode] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
    const draftTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const inputValueRef = useRef('');
    const lastSelectedIdRef = useRef<string | null>(null);

    // Load draft when room changes
    useEffect(() => {
        if (roomId && !editingMessage) {
            const draft = getDraft(roomId);
            if (draft) {
                setInputValue(draft.content);
                inputValueRef.current = draft.content;
                // TODO: Handle reply_to context if needed
            }
        }
    }, [roomId, getDraft, editingMessage]);

    // Save draft when leaving room - FIXED: Use ref to avoid race condition with clearDraft in sendText
    useEffect(() => {
        return () => {
            if (roomId && inputValueRef.current.trim()) {
                saveDraft(roomId, inputValueRef.current, replyingTo?.id);
            }
        };
    }, [roomId, replyingTo, saveDraft]);

    // Cleanup on unmount — prevent memory leaks
    useEffect(() => {
        return () => {
            // Clear draft timeout
            if (draftTimeoutRef.current) {
                clearTimeout(draftTimeoutRef.current);
            }

            // Clear recording timer
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
                mediaRecorderRef.current.stop();
            }
            if (videoPreviewRef.current) {
                videoPreviewRef.current.srcObject = null;
            }
        };
    }, []);

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

    const handleJumpToUnread = async () => {
        if (roomId && firstUnreadMessageId) {
            // Scroll to first unread message
            const messageElement = document.getElementById(`message-${firstUnreadMessageId}`);
            if (messageElement) {
                messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

                // Highlight the message briefly
                messageElement.style.backgroundColor = 'rgba(0, 242, 255, 0.1)';
                setTimeout(() => {
                    messageElement.style.backgroundColor = '';
                }, 2000);
            }

            // Mark all as read
            if (messages.length > 0) {
                const lastMessage = messages[messages.length - 1];
                await markAsRead(roomId, lastMessage.id);
                await markRoomAsRead(); // Also trigger read receipts hook
            }

            setShowJumpToUnread(false);
        } else if (roomId) {
            // Fallback: scroll to bottom if no specific unread message
            if (messagesEndRef.current) {
                messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
            }

            if (messages.length > 0) {
                const lastMessage = messages[messages.length - 1];
                await markAsRead(roomId, lastMessage.id);
                await markRoomAsRead(); // Also trigger read receipts hook
            }

            setShowJumpToUnread(false);
        }
    };

    const handleSendText = async () => {
        if (!inputValue.trim()) return;
        const text = inputValue.trim();
        setInputValue('');
        inputValueRef.current = ''; // Clear ref immediately to prevent unmount saving it

        // Clear any pending draft save
        if (draftTimeoutRef.current) {
            clearTimeout(draftTimeoutRef.current);
            draftTimeoutRef.current = null;
        }

        // Delete draft when sending message - await to ensure it's gone before any concurrent saves
        if (roomId) {
            await deleteDraft(roomId);
        }

        // Clear typing status immediately
        stopTyping();

        if (editingMessage) {
            await updateMessage(editingMessage.id, text);
            setEditingMessage(null);
        } else {
            await sendMessage(text, undefined, replyingTo?.id);
            setReplyingTo(null);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (showMentionAutocomplete) {
            // Handle mention autocomplete navigation
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === 'Escape') {
                // Let MentionAutocomplete handle these
                return;
            }
        }

        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            stopTyping();
            handleSendText();
        } else if (e.key === 'Escape' && (editingMessage || replyingTo)) {
            setEditingMessage(null);
            setReplyingTo(null);
            setInputValue('');
            inputValueRef.current = '';
            stopTyping();
        }
    };

    const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        const newCursorPosition = e.target.selectionStart || 0;

        setInputValue(newValue);
        inputValueRef.current = newValue; // Sync ref immediately
        setCursorPosition(newCursorPosition);

        // Check for mentions
        if (roomId) {
            const currentMention = getCurrentMention(newValue, newCursorPosition);

            if (currentMention) {
                setMentionQuery(currentMention.username);

                // Get room members for autocomplete
                try {
                    const members = await getRoomMembers(roomId);
                    const filteredMembers = members.filter(member =>
                        member.username.toLowerCase().includes(currentMention.username.toLowerCase())
                    );
                    setMentionMembers(filteredMembers);

                    // Position autocomplete with scroll awareness
                    if (inputRef.current) {
                        const rect = inputRef.current.getBoundingClientRect();
                        setMentionPosition({
                            top: rect.top + window.scrollY - 200,
                            left: rect.left
                        });
                    }

                    setShowMentionAutocomplete(true);
                } catch (error) {
                    logger.error('Error fetching room members:', error);
                }
            } else {
                setShowMentionAutocomplete(false);
            }

            // Auto-save draft with proper debounce
            if (draftTimeoutRef.current) {
                clearTimeout(draftTimeoutRef.current);
            }

            if (newValue.trim()) {
                draftTimeoutRef.current = setTimeout(() => {
                    // Check if input is still non-empty before saving (prevents race with send)
                    if (inputValueRef.current.trim() && roomId) {
                        saveDraft(roomId, inputValueRef.current, replyingTo?.id);
                    }
                }, 500);
            } else {
                deleteDraft(roomId);
            }
        }

        if (newValue.trim()) {
            startTyping();
        } else {
            stopTyping();
        }
    };

    // Handle mention selection
    const handleMentionSelect = (username: string) => {
        if (!roomId) return;

        const currentMention = getCurrentMention(inputValue, cursorPosition);
        if (currentMention) {
            const result = replaceMention(inputValue, currentMention.start, cursorPosition, username);
            setInputValue(result.content);
            inputValueRef.current = result.content;
            setCursorPosition(result.cursorPosition);

            // Focus input and set cursor position
            if (inputRef.current) {
                inputRef.current.focus();
                setTimeout(() => {
                    if (inputRef.current) {
                        inputRef.current.setSelectionRange(result.cursorPosition, result.cursorPosition);
                    }
                }, 0);
            }
        }

        setShowMentionAutocomplete(false);
    };

    // Handle text formatting
    const handleFormat = (type: 'bold' | 'italic' | 'code' | 'strikethrough' | 'link') => {
        if (!inputRef.current) return;

        const start = inputRef.current.selectionStart || 0;
        const end = inputRef.current.selectionEnd || 0;
        const selectedText = inputValue.substring(start, end);

        let formattedText = '';
        let cursorOffset = 0;

        switch (type) {
            case 'bold':
                formattedText = `**${selectedText}**`;
                cursorOffset = selectedText ? 0 : 2;
                break;
            case 'italic':
                formattedText = `*${selectedText}*`;
                cursorOffset = selectedText ? 0 : 1;
                break;
            case 'code':
                formattedText = `\`${selectedText}\``;
                cursorOffset = selectedText ? 0 : 1;
                break;
            case 'strikethrough':
                formattedText = `~~${selectedText}~~`;
                cursorOffset = selectedText ? 0 : 2;
                break;
            case 'link':
                setModalConfig({
                    isOpen: true,
                    type: 'prompt',
                    title: 'Вставить ссылку',
                    message: 'Введите URL для выбранного текста:',
                    confirmLabel: 'Вставить',
                    cancelLabel: 'Отмена',
                    placeholder: 'https://...',
                    onConfirm: (url) => {
                        if (url) {
                            const ft = `[${selectedText || 'ссылка'}](${url})`;
                            const nv = inputValue.substring(0, start) + ft + inputValue.substring(end);
                            setInputValue(nv);
                            inputValueRef.current = nv;
                            setTimeout(() => {
                                if (inputRef.current) {
                                    const np = start + ft.length;
                                    inputRef.current.focus();
                                    inputRef.current.setSelectionRange(np, np);
                                }
                            }, 0);
                        }
                    }
                });
                return;
        }

        const newValue = inputValue.substring(0, start) + formattedText + inputValue.substring(end);
        setInputValue(newValue);
        inputValueRef.current = newValue;

        // Set cursor position
        setTimeout(() => {
            if (inputRef.current) {
                const newPosition = selectedText ? start + formattedText.length : start + cursorOffset;
                inputRef.current.focus();
                inputRef.current.setSelectionRange(newPosition, newPosition);
            }
        }, 0);
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        // Перевірка на альбом (2-10 зображень/відео)
        const mediaFiles = files.filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'));
        const shouldCreateAlbum = mediaFiles.length >= 2 && mediaFiles.length <= 10;

        setIsUploading(true);
        try {
            if (shouldCreateAlbum) {
                // Створюємо альбом
                const groupId = `album_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

                const albumMessages = await Promise.all(
                    mediaFiles.map(async (file, index) => {
                        const url = await uploadMedia(file, (p) => {
                            if (index === 0) setUploadProgress(p);
                        });
                        if (!url) throw new Error('Upload failed');

                        // Отримуємо розміри для зображень
                        let width: number | undefined;
                        let height: number | undefined;

                        if (file.type.startsWith('image/')) {
                            try {
                                const img = await new Promise<HTMLImageElement>((resolve, reject) => {
                                    const image = new Image();
                                    image.onload = () => resolve(image);
                                    image.onerror = reject;
                                    image.src = URL.createObjectURL(file);
                                });
                                width = img.naturalWidth;
                                height = img.naturalHeight;
                                URL.revokeObjectURL(img.src);
                            } catch (err) {
                                logger.warn('Failed to get image dimensions:', err);
                            }
                        }

                        return {
                            room_id: roomId,
                            user_id: currentUser,
                            content: index === 0 ? '' : '', // Можна додати підпис до першого
                            media_url: url,
                            media_group_id: groupId,
                            media_order: index,
                            file_type: file.type,
                            file_size: file.size,
                            original_width: width,
                            original_height: height,
                        };
                    })
                );

                // Відправляємо альбом
                await insertMessages(albumMessages);

                // Відправляємо не-медіа файли окремо
                const nonMediaFiles = files.filter(f => !f.type.startsWith('image/') && !f.type.startsWith('video/'));
                for (const file of nonMediaFiles) {
                    const url = await uploadMedia(file, (p) => setUploadProgress(p));
                    if (url) {
                        const isDocument = !file.type.match(/^(image|video|audio)\//);

                        if (isDocument) {
                            await insertMessages({
                                content: '',
                                media_url: url,
                                file_name: file.name,
                                file_size: file.size,
                                file_type: file.type || 'application/octet-stream'
                            });
                        } else {
                            await sendMessage('', url, undefined, {
                                file_type: file.type,
                                file_size: file.size,
                                file_name: file.name
                            });
                        }
                    }
                }
            } else {
                // Відправляємо файли окремо (старий спосіб)
                for (const file of files) {
                    const url = await uploadMedia(file, (percent) => setUploadProgress(percent));
                    if (url) {
                        const isDocument = !file.type.match(/^(image|video|audio)\//);

                        if (isDocument) {
                            await insertMessages({
                                content: '',
                                media_url: url,
                                file_name: file.name,
                                file_size: file.size,
                                file_type: file.type || 'application/octet-stream'
                            });
                        } else {
                            await sendMessage('', url, undefined, {
                                file_type: file.type,
                                file_size: file.size,
                                file_name: file.name
                            });
                        }
                    }
                }
            }
        } catch (err) {
            logger.error('Upload failed:', err);
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
            // Очищаємо input для можливості вибрати ті ж файли знову
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: isCircleMode
            });

            if (isCircleMode && videoPreviewRef.current) {
                videoPreviewRef.current.srcObject = stream;
            }

            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: isCircleMode ? 'video/webm' : 'audio/webm'
            });

            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = async () => {
                const blob = new Blob(audioChunksRef.current, { type: isCircleMode ? 'video/webm' : 'audio/webm' });
                const prefix = isCircleMode ? 'video_circle_' : 'voice_';
                const fileName = `${prefix}${Date.now()}.webm`;
                const file = new File([blob], fileName, { type: isCircleMode ? 'video/webm' : 'audio/webm' });

                setIsUploading(true);
                const url = await uploadMedia(file);
                if (url) {
                    await sendMessage('', url, undefined, {
                        file_type: file.type,
                        file_size: file.size,
                        file_name: file.name
                    });
                }
                setIsUploading(false);

                stream.getTracks().forEach(track => track.stop());
                if (videoPreviewRef.current) videoPreviewRef.current.srcObject = null;
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);
            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        } catch (err) {
            logger.error('Recording failed:', err);
            setModalConfig({
                isOpen: true,
                type: 'alert',
                title: 'Ошибка',
                message: 'Не удалось получить доступ к медиа-устройствам',
                isDanger: true
            });
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }
    };

    // Fixed: grab stream reference before stopping
    const cancelRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            const stream = mediaRecorderRef.current.stream;
            mediaRecorderRef.current.onstop = () => {
                stream.getTracks().forEach(track => track.stop());
                if (videoPreviewRef.current) videoPreviewRef.current.srcObject = null;
            };
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }
    };

    const formatRecordingTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const handleActionButtonClick = () => {
        if (inputValue.trim()) {
            handleSendText();
        } else if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    const handleViewMedia = async (url: string) => {
        let finalUrl = url;
        if (url.includes('wasabisys.com')) {
            finalUrl = await getPresignedViewUrl(url);
        }
        setViewingMedia(finalUrl);
    };

    const toggleMode = () => setIsCircleMode(!isCircleMode);

    const startEditMessage = (msg: Message) => {
        setEditingMessage(msg);
        setInputValue(msg.content);
        inputValueRef.current = msg.content;
    };

    // Multi-select mode
    const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
    const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
    const [showActionToast, setShowActionToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');

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

    const handleSelectUntilHere = (msgId: string) => {
        if (!lastSelectedIdRef.current || !roomId) return;

        const startId = lastSelectedIdRef.current;
        const endId = msgId;

        const startIndex = messages.findIndex(m => m.id === startId);
        const endIndex = messages.findIndex(m => m.id === endId);

        if (startIndex === -1 || endIndex === -1) return;

        const rangeStart = Math.min(startIndex, endIndex);
        const rangeEnd = Math.max(startIndex, endIndex);

        const newSelected = new Set(selectedMessages);
        for (let i = rangeStart; i <= rangeEnd; i++) {
            newSelected.add(messages[i].id);
        }

        setSelectedMessages(newSelected);
        setIsMultiSelectMode(true);
        lastSelectedIdRef.current = msgId;
    };

    const showDateHeader = (currentMsg: Message, prevMsg: Message | null) => {
        if (!prevMsg) return true;
        const currentDate = new Date(currentMsg.created_at).toDateString();
        const prevDate = new Date(prevMsg.created_at).toDateString();
        return currentDate !== prevDate;
    };

    // Get pinned messages with useMemo for performance
    const pinnedMessages = React.useMemo(
        () => messages.filter(m => m.is_pinned),
        [messages]
    );

    // Multi-select handlers
    const toggleMessageSelection = (msgId: string) => {
        setSelectedMessages(prev => {
            const newSet = new Set(prev);
            if (newSet.has(msgId)) {
                newSet.delete(msgId);
            } else {
                newSet.add(msgId);
                lastSelectedIdRef.current = msgId;
            }
            // Don't auto-exit multi-select mode when selection is empty
            return newSet;
        });
    };

    const handleLongPress = (msgId: string) => {
        setIsMultiSelectMode(true);
        setSelectedMessages(new Set([msgId]));
    };

    const cancelMultiSelect = () => {
        setIsMultiSelectMode(false);
        setSelectedMessages(new Set());
    };

    const deleteSelectedMessages = async () => {
        const count = selectedMessages.size;
        const msgIds = Array.from(selectedMessages);

        // Sequential execution instead of parallel to avoid deadlocks on the room trigger
        for (const msgId of msgIds) {
            await deleteMessage(msgId);
        }

        showToast(`Удалено сообщений: ${count}`);
        setSelectedMessages(new Set());
    };

    const forwardSelectedMessages = () => {
        const firstMsgId = Array.from(selectedMessages)[0];
        const msg = messages.find(m => m.id === firstMsgId);
        if (msg) {
            handleForwardMessage(msg);
        }
    };

    const pinSelectedMessages = async () => {
        const count = selectedMessages.size;
        const msgIds = Array.from(selectedMessages);

        // Sequential execution instead of parallel
        for (const msgId of msgIds) {
            await pinMessage(msgId);
        }

        showToast(`Закреплено сообщений: ${count}`);
        setSelectedMessages(new Set());
    };

    const showToast = (message: string) => {
        setToastMessage(message);
        setShowActionToast(true);
        setTimeout(() => {
            setShowActionToast(false);
        }, 3000);
    };

    if (!roomId) {
        return (
            <div style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', background: '#0d0d0d' }}>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '18px' }}>Выберите чат слева, чтобы начать общение</div>
            </div>
        );
    }

    const isDirect_room = room?.is_direct;

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
        // Group chat
        avatarUrl = room?.avatar_url;
        initial = displayName[0]?.toUpperCase() || '?';
    }

    // Get initial character for avatar
    const initialCharacter = displayName[0]?.toUpperCase() || '?';

    const renderMessageContent = (msg: Message, isSelf: boolean, mediaType: string | null, isVideoCircle: boolean) => {
        return (
            <>
                {/* Reply preview - как в Telegram */}
                {(msg as any).reply_to && (
                    <div
                        style={{
                            padding: '6px 10px',
                            marginBottom: '6px',
                            borderLeft: '2px solid #00f2ff',
                            backgroundColor: isSelf ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                        onClick={() => {
                            const element = document.getElementById(`msg-${(msg as any).reply_to}`);
                            element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }}
                    >
                        {(() => {
                            const replyMsg = messages.find(m => m.id === (msg as any).reply_to);
                            return replyMsg ? (
                                <>
                                    <div style={{
                                        fontSize: '12px',
                                        color: '#00f2ff',
                                        fontWeight: '600',
                                        marginBottom: '2px'
                                    }}>
                                        {replyMsg.users?.username || 'Неизвестно'}
                                    </div>
                                    <div style={{
                                        fontSize: '13px',
                                        color: 'rgba(255, 255, 255, 0.7)',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        <FormattedMessage content={replyMsg.content || '📎 Медиа'} />
                                    </div>
                                </>
                            ) : (
                                <div style={{ fontSize: '13px', color: '#888', fontStyle: 'italic' }}>
                                    Сообщение удалено
                                </div>
                            );
                        })()}
                    </div>
                )}

                {/* Media rendering with album support */}
                {msg.media_group_id && isAlbumMessage(msg) ? (
                    // Show only first message of album
                    msg.media_order === 0 ? (
                        <div style={{ marginBottom: msg.content ? '8px' : '0' }}>
                            <MediaGrid
                                mediaItems={
                                    messages
                                        .filter(m => m.media_group_id === msg.media_group_id)
                                        .sort((a, b) => ((a as any).media_order || 0) - ((b as any).media_order || 0))
                                        .map(m => ({
                                            id: m.id,
                                            url: m.media_url!,
                                            type: m.media_url!.match(/\.(mp4|webm)$/i) ? 'video' as const : 'image' as const,
                                            width: (m as any).original_width,
                                            height: (m as any).original_height,
                                        }))
                                }
                            />
                        </div>
                    ) : null
                ) : (
                    msg.media_url && (
                        // Check if it's a document
                        msg.file_name ? (
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
                                    let finalUrl = msg.media_url!;
                                    if (finalUrl.includes('wasabisys.com')) {
                                        finalUrl = await getPresignedViewUrl(finalUrl);
                                    }
                                    window.open(finalUrl, '_blank');
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(0, 242, 255, 0.15)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(0, 242, 255, 0.1)';
                                }}
                            >
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00f2ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                                    <polyline points="13 2 13 9 20 9" />
                                </svg>
                                <div style={{ flexGrow: 1, minWidth: 0 }}>
                                    <div style={{
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        color: '#fff',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {msg.file_name}
                                    </div>
                                    {msg.file_size && (
                                        <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                                            {(msg.file_size / 1024).toFixed(1)} KB
                                        </div>
                                    )}
                                </div>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255, 255, 255, 0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <polyline points="7 10 12 15 17 10" />
                                    <line x1="12" y1="15" x2="12" y2="3" />
                                </svg>
                            </div>
                        ) : mediaType === 'audio' ? (
                            <EncryptedMedia
                                url={msg.media_url!}
                                type="audio"
                                roomId={roomId}
                                version={msg.encryption_version}
                                encrypted={msg.is_encrypted}
                                controls
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
                                    backgroundColor: 'var(--bg-tertiary)',
                                }}
                                onClick={() => handleViewMedia(msg.media_url!)}
                            >
                                <EncryptedMedia
                                    url={msg.media_url!}
                                    type="video"
                                    roomId={roomId}
                                    version={msg.encryption_version}
                                    encrypted={msg.is_encrypted}
                                    controls={!isVideoCircle}
                                    autoPlay={isVideoCircle}
                                    muted={isVideoCircle}
                                    playsInline
                                    circle={isVideoCircle}
                                    style={{
                                        width: '100%',
                                        height: isVideoCircle ? '100%' : 'auto',
                                        maxHeight: '400px',
                                        objectFit: isVideoCircle ? 'cover' : 'contain',
                                        display: 'block',
                                    }}
                                />
                                {isVideoCircle && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '50%',
                                        left: '50%',
                                        transform: 'translate(-50%, -50%)',
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '50%',
                                        backgroundColor: 'rgba(0, 0, 0, 0.6)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        pointerEvents: 'none',
                                    }}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                                            <path d="M8 5v14l11-7z" />
                                        </svg>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div
                                style={{
                                    marginBottom: msg.content ? '8px' : '0',
                                    borderRadius: '12px',
                                    overflow: 'hidden',
                                    cursor: 'pointer'
                                }}
                                onClick={() => handleViewMedia(msg.media_url!)}
                            >
                                <EncryptedMedia
                                    url={msg.media_url!}
                                    type="image"
                                    roomId={roomId}
                                    version={msg.encryption_version}
                                    encrypted={msg.is_encrypted}
                                    style={{
                                        maxWidth: '400px',
                                        maxHeight: '400px',
                                        display: 'block',
                                        objectFit: 'contain',
                                    }}
                                />
                            </div>
                        )
                    )
                )}

                {msg.content && (
                    <div className={css.MessageContent}>
                        <FormattedMessage content={msg.content} />
                    </div>
                )}

                <div className={css.MessageFooter}>
                    {msg.is_edited && <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginRight: '4px' }}>изм.</span>}
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {isSelf && (
                        <span style={{ marginLeft: '4px', color: msg.is_read ? '#00f2ff' : 'rgba(255,255,255,0.5)' }}>
                            {msg.is_read ? '✓✓' : '✓'}
                        </span>
                    )}
                </div>

                {(msg as any).reactions && (msg as any).reactions.length > 0 && (
                    <div className={css.ReactionsContainer}>
                        {(msg as any).reactions.map((reaction: any) => (
                            <div
                                key={reaction.emoji}
                                className={css.ReactionBubble}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    addReaction(msg.id, reaction.emoji);
                                }}
                                style={{
                                    backgroundColor: reaction.users.includes(currentUser) ? 'rgba(0, 242, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                                    border: reaction.users.includes(currentUser) ? '1px solid #00f2ff' : '1px solid rgba(255, 255, 255, 0.2)'
                                }}
                            >
                                {reaction.emoji} {reaction.count}
                            </div>
                        ))}
                    </div>
                )}
            </>
        );
    };

    return (
        <div style={{ display: 'flex', width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
            <div className={css.ChatAreaContainer} style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                {/* Background */}
                <div className={css.ChatBackground} style={backgroundStyle} />

                {/* Header Subcomponent */}
                <RoomHeader
                    room={room as any}
                    displayName={displayName}
                    avatarUrl={avatarUrl}
                    initial={initial}
                    isSavedMessages={!!isSavedMessages}
                    isDirect_room={!!isDirect_room}
                    typingUsers={typingUsers}
                    isMobile={isMobile}
                    showProfile={showProfile}
                    setShowProfile={setShowProfile}
                    setShowSearch={setShowSearch}
                    startCall={startCall}
                />

                {/* Pinned Messages Banner */}
                {pinnedMessages.length > 0 && !isMultiSelectMode && (
                    <div className="glass-panel" style={{
                        padding: '8px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        cursor: 'pointer',
                        zIndex: 50,
                        position: 'relative',
                        minHeight: '54px',
                        margin: '8px 16px',
                        borderRadius: '12px'
                    }}
                        onClick={() => {
                            const element = document.getElementById(`msg-${pinnedMessages[0].id}`);
                            element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00f2ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 17v5M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
                        </svg>
                        <div style={{ flexGrow: 1 }}>
                            <div style={{ fontSize: '13px', color: '#00f2ff', fontWeight: '600' }}>
                                Закрепленное сообщение {pinnedMessages.length > 1 && `(${pinnedMessages.length})`}
                            </div>
                            <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {pinnedMessages[0].content || '📎 Медиа'}
                            </div>
                        </div>
                        <div
                            onClick={(e) => {
                                e.stopPropagation();
                                handleUnpinMessage(pinnedMessages[0].id);
                            }}
                            style={{
                                padding: '4px',
                                cursor: 'pointer',
                                color: 'rgba(255, 255, 255, 0.5)',
                                transition: 'color 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.color = '#00f2ff'}
                            onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)'}
                        >
                            <Icon size="200" src={Icons.Cross} />
                        </div>
                    </div>
                )}

                {/* Upload Progress Overlay */}
                {isUploading && (
                    <div style={{
                        position: 'absolute',
                        top: pinnedMessages.length > 0 ? '108px' : '60px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 1000,
                        backgroundColor: 'rgba(13, 13, 13, 0.9)',
                        padding: '12px 20px',
                        borderRadius: '16px',
                        border: '1px solid rgba(0, 242, 255, 0.3)',
                        backdropFilter: 'blur(10px)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        minWidth: '200px',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: '#00f2ff', fontSize: '12px', fontWeight: '600' }}>Загрузка медиа...</span>
                            <span style={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}>{uploadProgress}%</span>
                        </div>
                        <div style={{
                            width: '100%',
                            height: '6px',
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            borderRadius: '3px',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                width: `${uploadProgress}%`,
                                height: '100%',
                                backgroundColor: '#00f2ff',
                                transition: 'width 0.3s ease-out',
                                boxShadow: '0 0 8px #00f2ff'
                            }} />
                        </div>
                    </div>
                )}

                {/* Multi-select toolbar */}
                {isMultiSelectMode && (
                    <div className="glass-panel" style={{
                        padding: '14px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '20px',
                        animation: 'slideDown 0.3s ease-out',
                        boxShadow: '0 8px 32px rgba(0, 242, 255, 0.2)',
                        zIndex: 100,
                        margin: '8px 16px',
                        borderRadius: '12px'
                    }}>
                        <div
                            onClick={cancelMultiSelect}
                            style={{
                                cursor: 'pointer',
                                color: '#00f2ff',
                                padding: '8px',
                                borderRadius: '50%',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(0, 242, 255, 0.2)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent';
                            }}
                        >
                            <Icon size="200" src={Icons.Cross} />
                        </div>
                        <div style={{
                            flexGrow: 1,
                            color: '#00f2ff',
                            fontWeight: '700',
                            fontSize: '16px',
                            letterSpacing: '0.3px'
                        }}>
                            {selectedMessages.size === 0 ? 'Выберите сообщения' : `Выбрано: ${selectedMessages.size}`}
                        </div>
                        {selectedMessages.size > 0 && (
                            <>
                                <div
                                    onClick={pinSelectedMessages}
                                    style={{
                                        cursor: 'pointer',
                                        color: '#00f2ff',
                                        padding: '10px 16px',
                                        borderRadius: '12px',
                                        transition: 'all 0.2s',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        background: 'rgba(0, 242, 255, 0.1)',
                                        border: '1px solid rgba(0, 242, 255, 0.3)'
                                    }}
                                    title="Закрепить"
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'rgba(0, 242, 255, 0.2)';
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'rgba(0, 242, 255, 0.1)';
                                        e.currentTarget.style.transform = 'translateY(0)';
                                    }}
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 17v5M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
                                    </svg>
                                    <span style={{ fontSize: '14px', fontWeight: '600' }}>Закрепить</span>
                                </div>
                                <div
                                    onClick={forwardSelectedMessages}
                                    style={{
                                        cursor: 'pointer',
                                        color: '#00f2ff',
                                        padding: '10px 16px',
                                        borderRadius: '12px',
                                        transition: 'all 0.2s',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        background: 'rgba(0, 242, 255, 0.1)',
                                        border: '1px solid rgba(0, 242, 255, 0.3)'
                                    }}
                                    title="Переслать"
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'rgba(0, 242, 255, 0.2)';
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'rgba(0, 242, 255, 0.1)';
                                        e.currentTarget.style.transform = 'translateY(0)';
                                    }}
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M5 12h14M12 5l7 7-7 7" />
                                    </svg>
                                    <span style={{ fontSize: '14px', fontWeight: '600' }}>Переслать</span>
                                </div>
                                <div
                                    onClick={deleteSelectedMessages}
                                    style={{
                                        cursor: 'pointer',
                                        color: '#ff4d4d',
                                        padding: '10px 16px',
                                        borderRadius: '12px',
                                        transition: 'all 0.2s',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        background: 'rgba(255, 77, 77, 0.1)',
                                        border: '1px solid rgba(255, 77, 77, 0.3)'
                                    }}
                                    title="Удалить"
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'rgba(255, 77, 77, 0.2)';
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'rgba(255, 77, 77, 0.1)';
                                        e.currentTarget.style.transform = 'translateY(0)';
                                    }}
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                    </svg>
                                    <span style={{ fontSize: '14px', fontWeight: '600' }}>Удалить</span>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Timeline Subcomponent */}
                <MessageList
                    roomId={roomId || ''}
                    loading={loading}
                    showJumpToUnread={showJumpToUnread}
                    handleJumpToUnread={handleJumpToUnread}
                    getUnreadCount={getUnreadCount}
                    virtualItems={virtualItems}
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
                    isSavedMessages={!!isSavedMessages}
                    lastSelectedId={lastSelectedIdRef.current}
                    handleSelectUntilHere={handleSelectUntilHere}
                    handleReport={handleReport}
                    isEncryptionModalOpen={isEncryptionModalOpen}
                    setIsEncryptionModalOpen={setIsEncryptionModalOpen}
                />

                {/* Input Area */}
                <MessageInputArea
                    roomId={roomId || ''}
                    replyingTo={replyingTo}
                    setReplyingTo={setReplyingTo}
                    editingMessage={editingMessage}
                    setEditingMessage={setEditingMessage}
                    inputValue={inputValue}
                    setInputValue={setInputValue}
                    inputRef={inputRef as any}
                    fileInputRef={fileInputRef}
                    videoPreviewRef={videoPreviewRef}
                    isRecording={isRecording}
                    isCircleMode={isCircleMode}
                    recordingTime={recordingTime}
                    showFormattingToolbar={showFormattingToolbar}
                    setShowFormattingToolbar={setShowFormattingToolbar}
                    showEmojiPicker={showEmojiPicker}
                    setShowEmojiPicker={setShowEmojiPicker}
                    showMentionAutocomplete={showMentionAutocomplete}
                    setShowMentionAutocomplete={setShowMentionAutocomplete}
                    mentionMembers={mentionMembers}
                    mentionQuery={mentionQuery}
                    mentionPosition={mentionPosition}
                    isMobile={isMobile}
                    cancelRecording={cancelRecording}
                    handleInputChange={handleInputChange}
                    handleKeyDown={handleKeyDown}
                    setCursorPosition={setCursorPosition}
                    handleFileSelect={handleFileSelect}
                    handleFormat={handleFormat}
                    handleMentionSelect={handleMentionSelect}
                    handleActionButtonClick={handleActionButtonClick}
                    toggleMode={toggleMode}
                />
            </div>

            {
                showSearch && (
                    <MessageSearch
                        messages={messages}
                        onClose={() => setShowSearch(false)}
                        onSelectMessage={(msgId) => {
                            const element = document.getElementById(`msg-${msgId}`);
                            element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }}
                    />
                )
            }

            {/* Call Modal — fixed: no window.location.reload() */}
            {
                (() => {
                    if (!room || callStatus === 'idle') return null;

                    if (room.is_direct) {
                        return <CatloverCallModal room={room} callHook={callHook} onClose={() => { }} />;
                    }

                    return <SimpleGroupCallModal room={room} onClose={() => {
                        callHook.endCall?.();
                    }} />;
                })()
            }

            {/* Media Viewer Modal */}
            {
                viewingMedia && (
                    <div
                        onClick={() => setViewingMedia(null)}
                        style={{
                            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                            backgroundColor: 'rgba(0,0,0,0.95)', zIndex: 9999,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', backdropFilter: 'blur(10px)'
                        }}
                    >
                        <div style={{ position: 'absolute', top: '24px', right: '24px', color: '#fff' }}>
                            <Icon size="400" src={getIcon('Close')} />
                        </div>
                        {isVideoCircleUrl(viewingMedia) || viewingMedia.match(/\.(mp4|webm)$/i) ? (
                            <video src={viewingMedia} controls autoPlay style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: viewingMedia.includes('video_circle') ? '50%' : '12px' }} onClick={(e) => e.stopPropagation()} />
                        ) : (
                            <img src={viewingMedia} alt="Media" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '12px', boxShadow: '0 0 50px rgba(0,0,0,0.5)' }} onClick={(e) => e.stopPropagation()} />
                        )}
                    </div>
                )
            }

            {/* Chat Status / Call Status (already handled) */}

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

            {/* Forward Message Modal */}
            {showForwardModal && messageToForward && (
                <div
                    className={css.ModalOverlay}
                    onClick={() => { setShowForwardModal(false); setMessageToForward(null); }}
                    style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 2500, backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.6)'
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: 'linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%)',
                            border: '1px solid rgba(0, 242, 255, 0.3)',
                            borderRadius: '24px',
                            padding: '24px',
                            maxWidth: '440px',
                            width: '90%',
                            maxHeight: '80vh',
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(0, 242, 255, 0.1)',
                            animation: 'modalSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                        }}
                    >
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#fff', letterSpacing: '-0.5px' }}>
                                Переслать
                            </h2>
                            <button
                                onClick={() => { setShowForwardModal(false); setMessageToForward(null); }}
                                style={{
                                    background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%',
                                    width: '32px', height: '32px', color: '#888', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px'
                                }}
                            >
                                <Icon size="100" src={Icons.Cross} />
                            </button>
                        </div>

                        {/* Message Preview */}
                        <div style={{
                            padding: '12px 16px', background: 'rgba(0, 242, 255, 0.05)',
                            borderLeft: '3px solid #00f2ff', borderRadius: '8px', marginBottom: '20px',
                            maxHeight: '100px', overflow: 'hidden'
                        }}>
                            <p style={{
                                margin: 0, fontSize: '13px', color: 'rgba(255, 255, 255, 0.7)',
                                lineHeight: '1.4', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical'
                            }}>
                                {messageToForward.content || '📎 Медиа-файл'}
                            </p>
                        </div>

                        {/* Room List */}
                        <div style={{
                            flex: 1,
                            overflowY: 'auto',
                            margin: '0 -10px',
                            padding: '0 10px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px'
                        }} className="custom-scrollbar">
                            {rooms.filter((r: any) => r.id !== roomId).map((r: any) => (
                                <div
                                    key={r.id}
                                    onClick={async () => {
                                        await forwardMessage(messageToForward.id, r.id);
                                        setShowForwardModal(false);
                                        setMessageToForward(null);
                                    }}
                                    style={{
                                        padding: '10px 12px',
                                        borderRadius: '12px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        background: 'transparent'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'transparent';
                                    }}
                                >
                                    <CatloverAvatar
                                        url={r.is_direct ? r.other_user?.avatar_url : r.avatar_url}
                                        displayName={r.displayName || r.name}
                                        size={36}
                                    />
                                    <div style={{ flex: 1, overflow: 'hidden' }}>
                                        <div style={{ color: '#fff', fontSize: '14px', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {r.displayName || r.name || 'Безымянный чат'}
                                        </div>
                                        {r.is_direct && r.other_user?.status && (
                                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                                                {r.other_user.status}
                                            </div>
                                        )}
                                    </div>
                                    <Icon size="100" src={Icons.ChevronRight} style={{ color: 'rgba(255,255,255,0.1)' }} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Action Toast - Telegram style */}
            {
                showActionToast && (
                    <div style={{
                        position: 'fixed',
                        bottom: '80px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'rgba(20, 20, 20, 0.95)',
                        backdropFilter: 'blur(20px)',
                        padding: '14px 24px',
                        borderRadius: '12px',
                        border: '1px solid rgba(0, 242, 255, 0.3)',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
                        zIndex: 99998,
                        animation: 'toastSlideUp 0.3s ease-out',
                        color: '#fff',
                        fontSize: '15px',
                        fontWeight: '500',
                        minWidth: '200px',
                        textAlign: 'center'
                    }}>
                        {toastMessage}
                    </div>
                )
            }

            <style>{`
                @keyframes pulse {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.2); opacity: 0.7; }
                    100% { transform: scale(1); opacity: 1; }
                }
                
                @keyframes menuFadeIn {
                    from {
                        opacity: 0;
                        transform: scale(0.95) translateY(-5px);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1) translateY(0);
                    }
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                @keyframes modalSlideIn {
                    from {
                        opacity: 0;
                        transform: scale(0.9) translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1) translateY(0);
                    }
                }
                
                @keyframes slideDown {
                    from {
                        opacity: 0;
                        transform: translateY(-20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                @keyframes toastSlideUp {
                    from {
                        opacity: 0;
                        transform: translate(-50%, 20px);
                    }
                    to {
                        opacity: 1;
                        transform: translate(-50%, 0);
                    }
                }
                
                @keyframes slideUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                .${css.MessageBubble}:hover .quick-reactions-panel {
                    display: flex !important;
                }
            `}</style>

            {/* Profile Panel */}
            {
                showProfile && room && (
                    <CatloverProfilePanel
                        room={room}
                        messages={messages}
                        onClose={() => setShowProfile(false)}
                        currentUserId={currentUser || undefined}
                        onDeleteMessage={deleteMessage}
                    />
                )
            }

            {/* User Profile Modal */}
            {
                showUserProfile && (
                    <UserProfileModal
                        userId={showUserProfile}
                        onClose={() => setShowUserProfile(null)}
                        onStartChat={(roomId) => navigate(`/room/${roomId}`)}
                    />
                )
            }
            {/* Report Modal */}
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
        </div >
    );
}

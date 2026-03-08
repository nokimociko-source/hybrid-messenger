import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { notifyNewMessage } from '../utils/platformNotifications';
import { shouldSendNotification } from '../utils/notificationFilter';
import { useRateLimit } from './useRateLimit';
import { logger } from '../utils/logger';
import { Message, getCurrentUser, uploadMediaFile } from './supabaseHelpers';
import { useEncryption } from '../context/EncryptionContext';
import { encryptText, decryptText, encryptFile, decryptFile } from '../utils/encryption';

type NewMessageInput = {
    content?: string | null;
    media_url?: string | null;
    reply_to?: string | null;
    key_version?: number | null;
    file_name?: string | null;
    file_size?: number | null;
    file_type?: string | null;
    media_group_id?: string | null;
    media_order?: number | null;
    original_width?: number | null;
    original_height?: number | null;
    forwarded_from?: string | null;
    [key: string]: any;
};

export function useSupabaseMessages(roomId?: string) {
    const { encrypt, decrypt, masterKey, getRoomKey, rotateRoomKey, currentRoomVersion, e2eEnabled } = useEncryption();
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<string | null>(null);

    // Rate limiting hook
    const { checkRateLimit, lastError: rateLimitError } = useRateLimit();

    // Ref для доступа к актуальному currentUser внутри realtime callback
    const currentUserRef = useRef<string | null>(null);

    useEffect(() => {
        getCurrentUser().then(({ id }) => {
            setCurrentUser(id);
            currentUserRef.current = id;
        });
    }, []);

    const decryptMessagesIfNeeded = useCallback(async (msgs: any[]): Promise<Message[]> => {
        if (!e2eEnabled && !masterKey) return msgs;

        let isEncryptedRoom = false;
        if (masterKey && roomId) {
            const { data: roomData } = await supabase.from('rooms').select('created_by, target_user_id, is_direct, is_encrypted').eq('id', roomId).single();
            if (roomData) {
                const isSavedMessages = !!(roomData.is_direct && roomData.created_by === roomData.target_user_id);
                isEncryptedRoom = isSavedMessages || !!roomData.is_encrypted;
            }
        }

        try {
            const { decryptIfNeeded } = e2eEnabled ? await import('../utils/e2eEncryption') : { decryptIfNeeded: null };
            const { id: currentUserId } = await getCurrentUser();
            if (!currentUserId) return msgs;

            const decryptedMessages = await Promise.all(
                msgs.map(async (msg) => {
                    let content = msg.content;
                    if (!content) return msg;

                    if (isEncryptedRoom && masterKey) {
                        try {
                            const version = msg.key_version || 1;
                            const sessionKey = roomId ? await getRoomKey(roomId, version) : null;

                            if (sessionKey) {
                                if (content.length > 20 && !content.includes(' ')) {
                                    try {
                                        const decrypted = await decryptText(content, sessionKey);
                                        content = decrypted;
                                        logger.debug(`✅ Decrypted message ${msg.id} with version ${version}`);
                                    } catch (e) {
                                        logger.warn(`❌ Failed to decrypt message ${msg.id} with version ${version}:`, e);
                                    }
                                }
                            } else {
                                logger.warn(`🔑 Missing key for message ${msg.id}, version ${version}`);
                            }
                        } catch (e) { /* ignore */ }
                    }

                    if (e2eEnabled && decryptIfNeeded && content.startsWith('🔒')) {
                        try {
                            content = await decryptIfNeeded(content, currentUserId);
                        } catch (e) { /* ignore */ }
                    }

                    return { ...msg, content };
                })
            );

            return decryptedMessages;
        } catch (err) {
            logger.error('Decryption error:', err);
            return msgs;
        }
    }, [e2eEnabled, masterKey, roomId, getRoomKey]);

    const fetchMessages = useCallback(async () => {
        if (!roomId) {
            setMessages([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        const { data, error } = await supabase
            .from('messages')
            .select(`*, users!messages_user_id_fkey (username, avatar_url)`)
            .eq('room_id', roomId)
            .order('created_at', { ascending: true });

        if (error) {
            logger.error('Error fetching messages:', error.message);
            setLoading(false);
            return;
        }

        const decrypted = await decryptMessagesIfNeeded(data || []);
        setMessages(decrypted);
        setLoading(false);
    }, [roomId, decryptMessagesIfNeeded]);

    useEffect(() => {
        if (!roomId) {
            setMessages([]);
            setLoading(false);
            return;
        }

        let mounted = true;
        setLoading(true);
        setMessages([]);

        fetchMessages();

        const channel = supabase
            .channel(`public:messages:${roomId}:${masterKey ? 'secure' : 'plain'}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
                async (payload) => {
                    if (!mounted) return;

                    const { data: userData } = await supabase
                        .from('users')
                        .select('username, avatar_url')
                        .eq('id', payload.new.user_id)
                        .single();

                    const msgs = await decryptMessagesIfNeeded([payload.new]);
                    const newMessage = {
                        ...msgs[0],
                        users: userData || { username: 'Unknown' },
                    } as Message;

                    setMessages((prev) => {
                        if (prev.some(m => m.id === newMessage.id)) return prev;
                        return [...prev, newMessage];
                    });

                    const userId = currentUserRef.current;
                    if (userId && payload.new.user_id !== userId) {
                        const senderName = userData?.username || 'Неизвестный';
                        const messageText = newMessage.content || (payload.new.media_url ? '📎 Медиа' : '');
                        notifyNewMessage(senderName, messageText, roomId!);
                    }
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
                async (payload) => {
                    if (!mounted) return;
                    const msgs = await decryptMessagesIfNeeded([payload.new]);
                    const updatedMsg = msgs[0];

                    setMessages((prev) =>
                        prev.map((msg) => (msg.id === updatedMsg.id ? { ...msg, ...updatedMsg } : msg))
                    );
                }
            )
            .on(
                'postgres_changes',
                { event: 'DELETE', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
                (payload) => {
                    if (!mounted) return;
                    setMessages((prev) => prev.filter((msg) => msg.id !== payload.old.id));
                }
            )
            .subscribe();

        return () => {
            mounted = false;
            supabase.removeChannel(channel);
        };
    }, [roomId, masterKey, e2eEnabled, fetchMessages, decryptMessagesIfNeeded]);

    const insertMessages = useCallback(async (input: NewMessageInput | NewMessageInput[]) => {
        if (!roomId) return;
        const { id } = await getCurrentUser();
        if (!id) return;

        const rows = Array.isArray(input) ? input : [input];

        // Check encryption status for the room
        let isEncryptedRoom = false;
        if (masterKey) {
            const { data: roomData } = await supabase.from('rooms').select('created_by, target_user_id, is_direct, is_encrypted').eq('id', roomId).single();
            const isSavedMessages = roomData?.is_direct && roomData?.created_by === roomData?.target_user_id;
            isEncryptedRoom = !!(isSavedMessages || roomData?.is_encrypted);
        }
        const usedVersion = currentRoomVersion(roomId);

        const normalizedRows = rows.map((r) => ({
            ...r,
            room_id: roomId,
            user_id: id,
            key_version: (masterKey && isEncryptedRoom) ? (r.key_version ?? usedVersion) : null,
        }));

        const { data, error } = await supabase
            .from('messages')
            .insert(normalizedRows)
            .select(`*, users!messages_user_id_fkey (username, avatar_url)`);

        if (error) {
            logger.error('Error inserting messages:', error.message);
            return;
        }

        const inserted = await decryptMessagesIfNeeded(data || []);
        setMessages((prev) => {
            const existing = new Set(prev.map((m) => m.id));
            const merged = [...prev, ...inserted.filter((m: any) => !existing.has(m.id))];
            merged.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            return merged;
        });
    }, [roomId, decryptMessagesIfNeeded]);



    const sendMessage = useCallback(async (content: string, mediaUrl?: string, replyTo?: string, metadata?: Partial<NewMessageInput>) => {
        if (!roomId || (!content.trim() && !mediaUrl)) return;
        const { id } = await getCurrentUser();
        if (!id) return;

        const { data: canPost, error: permError } = await supabase.rpc('check_channel_post_permission', {
            p_room_id: roomId,
            p_user_id: id,
        });

        if (permError) {
            logger.error('Error checking channel post permission:', permError.message);
            throw new Error('Failed to verify posting permissions');
        }

        if (!canPost) {
            const { data: roomData } = await supabase.from('rooms').select('type').eq('id', roomId).single();
            if (roomData?.type === 'channel') {
                throw new Error('В каналах могут писать только администраторы');
            } else {
                throw new Error('У вас нет прав для отправки сообщений в этом чате');
            }
        }

        const allowed = await checkRateLimit('message');
        if (!allowed) {
            logger.warn('Rate limit exceeded for sending messages');
            throw new Error(rateLimitError || 'Слишком много сообщений. Подождите немного.');
        }

        const e2eEnabled = localStorage.getItem('e2e_enabled') === 'true';
        let finalContent = content;
        let usedVersion = currentRoomVersion(roomId);
        let isEncryptedRoom = false;

        if (masterKey) {
            const { data: roomData } = await supabase
                .from('rooms')
                .select('created_by, target_user_id, is_direct, is_encrypted')
                .eq('id', roomId)
                .single();
            const isSavedMessages = roomData?.is_direct && roomData?.created_by === roomData?.target_user_id;
            isEncryptedRoom = !!(isSavedMessages || roomData?.is_encrypted);
        }

        if (content.trim()) {
            try {
                if (masterKey && isEncryptedRoom) {
                    let sessionKey = await getRoomKey(roomId, usedVersion);

                    if (!sessionKey) {
                        const rotated = await rotateRoomKey(roomId);
                        usedVersion = rotated.version;
                        sessionKey = rotated.key;
                    }

                    if (sessionKey) {
                        finalContent = await encryptText(content, sessionKey);
                        logger.debug(`🔒 Encrypted message with key version ${usedVersion}`);
                    }
                    else {
                        finalContent = await encrypt(content);
                        usedVersion = 0;
                        logger.warn(`⚠️ Using masterKey fallback for encryption`);
                    }
                }

                if (e2eEnabled && finalContent === content) {
                    const { default: E2EEncryptionClass } = await import('../utils/e2eEncryption');
                    const { data: members } = await supabase.from('room_members').select('user_id').eq('room_id', roomId).neq('user_id', id);

                    if (members && members.length > 0) {
                        const recipientId = members[0].user_id;
                        const { data: recipient } = await supabase.from('users').select('public_key, key_type').eq('id', recipientId).single();

                        if (recipient?.public_key && recipient.key_type === 'ecdh_p256') {
                            const e2e = E2EEncryptionClass.getInstance();
                            await e2e.initialize();
                            const encrypted = await e2e.encryptMessage(content, recipientId);
                            finalContent = `🔒${encrypted}`;
                        }
                    }
                }
            } catch (err) {
                logger.error('❌ Encryption failed:', err);
            }
        }

        const { data: inserted, error } = await supabase
            .from('messages')
            .insert({
                room_id: roomId,
                user_id: id,
                content: finalContent,
                media_url: mediaUrl,
                reply_to: replyTo,
                key_version: (masterKey && isEncryptedRoom) ? usedVersion : null,
                ...metadata // Spread metadata (file_type, file_size, etc.)
            })
            .select(`*, users!messages_user_id_fkey (username, avatar_url)`)
            .single();

        if (error) {
            logger.error('Error sending message:', error.message);
            return;
        }

        if (inserted) {
            setMessages((prev) => {
                if (prev.some((m) => m.id === inserted.id)) return prev;
                return [...prev, inserted as Message];
            });
        }
    }, [roomId, checkRateLimit, rateLimitError, masterKey, getRoomKey, rotateRoomKey, currentRoomVersion, encrypt]);

    const updateMessage = useCallback(async (messageId: string, content: string) => {
        if (!roomId) return;
        let finalContent = content;
        let usedVersion = currentRoomVersion(roomId);
        let isEncryptedRoom = false;

        if (masterKey) {
            const { data: roomData } = await supabase
                .from('rooms')
                .select('created_by, target_user_id, is_direct, is_encrypted')
                .eq('id', roomId)
                .single();
            const isSavedMessages = roomData?.is_direct && roomData?.created_by === roomData?.target_user_id;
            isEncryptedRoom = !!(isSavedMessages || roomData?.is_encrypted);
        }

        if (content.trim()) {
            try {
                if (masterKey && isEncryptedRoom) {
                    let sessionKey = await getRoomKey(roomId, usedVersion);

                    if (!sessionKey) {
                        const rotated = await rotateRoomKey(roomId);
                        usedVersion = rotated.version;
                        sessionKey = rotated.key;
                    }

                    if (sessionKey) {
                        finalContent = await encryptText(content, sessionKey);
                        logger.debug(`🔒 Encrypted edited message with key version ${usedVersion}`);
                    }
                    else {
                        finalContent = await encrypt(content);
                        usedVersion = 0;
                        logger.warn(`⚠️ Using masterKey fallback for encryption on edit`);
                    }
                }

                const e2eEnabled = localStorage.getItem('e2e_enabled') === 'true';
                if (e2eEnabled && finalContent === content) {
                    const { id } = await getCurrentUser();
                    const { default: E2EEncryptionClass } = await import('../utils/e2eEncryption');
                    const { data: members } = await supabase.from('room_members').select('user_id').eq('room_id', roomId).neq('user_id', id);

                    if (members && members.length > 0 && id) {
                        const recipientId = members[0].user_id;
                        const { data: recipient } = await supabase.from('users').select('public_key, key_type').eq('id', recipientId).single();

                        if (recipient?.public_key && recipient.key_type === 'ecdh_p256') {
                            const e2e = E2EEncryptionClass.getInstance();
                            await e2e.initialize();
                            const encrypted = await e2e.encryptMessage(content, recipientId);
                            finalContent = `🔒${encrypted}`;
                        }
                    }
                }
            } catch (err) {
                logger.error('❌ Encryption failed for edited message:', err);
            }
        }

        const { error } = await supabase
            .from('messages')
            .update({ content: finalContent, key_version: (masterKey && isEncryptedRoom) ? usedVersion : null, is_edited: true })
            .eq('id', messageId);

        if (error) logger.error('Error updating message:', error.message);
    }, [roomId, masterKey, getRoomKey, rotateRoomKey, currentRoomVersion, encrypt]);

    const deleteMessage = useCallback(async (messageId: string) => {
        if (!roomId) return;

        const { id: userId } = await getCurrentUser();
        if (!userId) return;

        const msgToDelete = messages.find(m => m.id === messageId);
        const messageContent = msgToDelete?.content;

        // Optimistic update: remove from local state immediately
        setMessages((prev) => prev.filter((msg) => msg.id !== messageId));

        // Check if we are deleting the last message to update room preview
        const { data: roomData } = await supabase
            .from('rooms')
            .select('last_message_id')
            .eq('id', roomId)
            .single();

        if (roomData?.last_message_id === messageId) {
            // Find the next last message
            const { data: currentMessages } = await supabase
                .from('messages')
                .select('id, created_at, content, file_name')
                .eq('room_id', roomId)
                .neq('id', messageId)
                .order('created_at', { ascending: false })
                .limit(1);

            const nextLastMessage = currentMessages?.[0] ?? null;
            try {
                if (nextLastMessage) {
                    const newPreview = nextLastMessage.content
                        ? (nextLastMessage.content.length > 50 ? nextLastMessage.content.substring(0, 50) + '...' : nextLastMessage.content)
                        : nextLastMessage.file_name ? `📎 ${nextLastMessage.file_name}` : 'Медиа-файл';

                    await supabase
                        .from('rooms')
                        .update({
                            last_message_id: nextLastMessage.id,
                            last_message_at: nextLastMessage.created_at,
                            last_message_preview: newPreview
                        })
                        .eq('id', roomId);
                } else {
                    await supabase
                        .from('rooms')
                        .update({
                            last_message_id: null,
                            last_message_at: null,
                            last_message_preview: null
                        })
                        .eq('id', roomId);
                }
            } catch (err) {
                logger.warn('Failed to update room metadata during deletion:', err);
            }
        }

        // Now perform the actual deletion via the secure RPC
        const { data: success, error: rpcError } = await supabase.rpc('p_delete_message', {
            p_message_id: messageId,
            p_user_id: userId
        });

        if (rpcError || !success) {
            logger.warn('RPC deletion failed, attempting direct deletion:', rpcError?.message);
            const { error: deleteError } = await supabase
                .from('messages')
                .delete()
                .eq('id', messageId)
                .eq('user_id', userId);

            if (deleteError) {
                logger.error('Error deleting message:', deleteError.message);
                return;
            }
        }

        // Cleanup S3 storage if message had Wasabi media
        const wasabiUrlPattern = /https:\/\/s3\.[^.]+\.wasabisys\.com\/catlover-media-123\/(media\/[^\s?\"\'% ]+)/;
        const match = messageContent?.match(wasabiUrlPattern);

        if (match && match[1]) {
            const key = match[1];
            logger.info('🗑️ Cleaning up Wasabi S3 file:', key);

            try {
                // Determine API base URL (usually same host as app)
                const apiBase = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';
                await fetch(`${apiBase}/api/s3/delete-object`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ key })
                });
            } catch (err) {
                logger.warn('Failed to cleanup S3 file:', err);
            }
        }
    }, [roomId, messages]);

    const uploadMedia = useCallback(async (file: File | Blob, onProgress?: (percent: number) => void): Promise<string | null> => {
        const allowed = await checkRateLimit('upload');
        if (!allowed) {
            logger.warn('Rate limit exceeded for file uploads');
            throw new Error(rateLimitError || 'Слишком много загрузок. Подождите немного.');
        }

        let fileToUpload = file;

        // Apply encryption if room is encrypted
        if (roomId && masterKey) {
            try {
                const { data: roomData } = await supabase.from('rooms').select('is_encrypted, is_direct, created_by, target_user_id').eq('id', roomId).single();
                const isSavedMessages = roomData?.is_direct && roomData?.created_by === roomData?.target_user_id;

                if (isSavedMessages || roomData?.is_encrypted) {
                    let version = currentRoomVersion(roomId);
                    let sessionKey = await getRoomKey(roomId, version);

                    if (!sessionKey) {
                        const rotated = await rotateRoomKey(roomId);
                        version = rotated.version;
                        sessionKey = rotated.key;
                    }

                    if (sessionKey) {
                        logger.info('🔒 Encrypting media before upload...');
                        const { encryptFile } = await import('../utils/encryption');
                        const encryptedBlob = await encryptFile(file, sessionKey);
                        // Ensure we keep the correct filename/type metadata if possible
                        fileToUpload = new File([encryptedBlob], (file as File).name || 'encrypted_media', { type: 'application/octet-stream' });
                    }
                }
            } catch (err) {
                logger.error('Encryption during upload failed:', err);
            }
        }

        const { uploadMediaFile } = await import('../hooks/supabaseHelpers');
        return uploadMediaFile(fileToUpload as File, onProgress);
    }, [roomId, masterKey, getRoomKey, rotateRoomKey, currentRoomVersion, checkRateLimit, rateLimitError]);

    const addReaction = useCallback(async (messageId: string, emoji: string) => {
        const { id } = await getCurrentUser();
        if (!id) return;

        const { data: message } = await supabase
            .from('messages')
            .select('reactions')
            .eq('id', messageId)
            .single();

        if (!message) return;
        const reactions = message.reactions || [];
        const existingIndex = reactions.findIndex((r: any) => r.user_id === id && r.emoji === emoji);

        let newReactions;
        if (existingIndex >= 0) {
            newReactions = reactions.filter((_: any, i: number) => i !== existingIndex);
        } else {
            newReactions = [...reactions, { emoji, user_id: id }];
        }

        const { error } = await supabase
            .from('messages')
            .update({ reactions: newReactions })
            .eq('id', messageId);

        if (error) logger.error('Error adding reaction:', error.message);
    }, []);

    const pinMessage = useCallback(async (messageId: string) => {
        const { id } = await getCurrentUser();
        if (!id) return;

        setMessages((prev) =>
            prev.map((msg) =>
                msg.id === messageId
                    ? { ...msg, is_pinned: true, pinned_at: new Date().toISOString(), pinned_by: id }
                    : msg
            )
        );

        const { error } = await supabase
            .from('messages')
            .update({
                is_pinned: true,
                pinned_at: new Date().toISOString(),
                pinned_by: id
            })
            .eq('id', messageId);

        if (error) {
            logger.error('Error pinning message:', error.message);
            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === messageId
                        ? { ...msg, is_pinned: false, pinned_at: null, pinned_by: null }
                        : msg
                )
            );
        }
    }, []);

    const unpinMessage = useCallback(async (messageId: string) => {
        setMessages((prev) =>
            prev.map((msg) =>
                msg.id === messageId
                    ? { ...msg, is_pinned: false, pinned_at: null, pinned_by: null }
                    : msg
            )
        );

        const { error } = await supabase
            .from('messages')
            .update({
                is_pinned: false,
                pinned_at: null,
                pinned_by: null
            })
            .eq('id', messageId);

        if (error) {
            logger.error('Error unpinning message:', error.message);
            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === messageId
                        ? { ...msg, is_pinned: true }
                        : msg
                )
            );
        }
    }, []);

    const forwardMessage = useCallback(async (messageId: string, targetRoomId: string) => {
        const { id } = await getCurrentUser();
        if (!id) return;

        const originalMessage = messages.find(m => m.id === messageId);
        if (!originalMessage) return;

        let contentToForward = originalMessage.content;
        let mediaUrlToForward = originalMessage.media_url;
        let keyVersion = undefined;

        try {
            // 1. Check if target room is E2EE
            const { data: targetRoom } = await supabase
                .from('rooms')
                .select('is_encrypted, is_direct, created_by, target_user_id')
                .eq('id', targetRoomId)
                .single();

            const isTargetE2EE = targetRoom?.is_encrypted || (targetRoom?.is_direct && targetRoom?.created_by === targetRoom?.target_user_id);

            // 2. Fetch target key if needed
            let targetKey: string | null = null;
            if (isTargetE2EE && masterKey) {
                const version = currentRoomVersion(targetRoomId);
                targetKey = await getRoomKey(targetRoomId, version);
                if (!targetKey) {
                    const rotated = await rotateRoomKey(targetRoomId);
                    targetKey = rotated.key;
                    keyVersion = rotated.version;
                } else {
                    keyVersion = version;
                }
            }

            // 3. If target is E2EE, encrypt the plaintext content
            if (targetKey && contentToForward) {
                contentToForward = await encryptText(contentToForward, targetKey);
            }

            // Handle media re-encryption specifically
            if (originalMessage.media_url) {
                if (originalMessage.key_version && roomId && masterKey) {
                    // It was encrypted in the source room
                    const sourceKey = await getRoomKey(roomId, originalMessage.key_version);
                    if (sourceKey) {
                        logger.info('🔄 Decrypting media for forwarding...');
                        const response = await fetch(originalMessage.media_url);
                        const encryptedBlob = await response.blob();
                        const decryptedBlob = await decryptFile(encryptedBlob, sourceKey);

                        let finalizedMediaBlob = decryptedBlob;
                        if (targetKey) {
                            logger.info('🔒 Re-encrypting media for target room...');
                            finalizedMediaBlob = await encryptFile(decryptedBlob, targetKey);
                        }

                        const uploadResponse = await uploadMediaFile(new File([finalizedMediaBlob], 'forwarded_media', { type: 'application/octet-stream' }));
                        if (uploadResponse) mediaUrlToForward = uploadResponse;
                    }
                } else if (targetKey) {
                    // Source was plain, but target is E2EE
                    logger.info('🔒 Encrypting previously plain media for secure target room...');
                    const response = await fetch(originalMessage.media_url);
                    const blob = await response.blob();
                    const encryptedBlob = await encryptFile(blob, targetKey);
                    const uploadResponse = await uploadMediaFile(new File([encryptedBlob], 'forwarded_media', { type: 'application/octet-stream' }));
                    if (uploadResponse) mediaUrlToForward = uploadResponse;
                }
            }

            const { error } = await supabase
                .from('messages')
                .insert({
                    room_id: targetRoomId,
                    user_id: id,
                    content: contentToForward,
                    media_url: mediaUrlToForward,
                    forwarded_from: messageId,
                    key_version: keyVersion
                });

            if (error) logger.error('Error forwarding message:', error.message);
        } catch (err) {
            logger.error('Forwarding flow failed:', err);
        }
    }, [messages, roomId, masterKey, getRoomKey, rotateRoomKey, currentRoomVersion]);

    // Key Rotation Timer (PFS)
    useEffect(() => {
        if (!roomId || !masterKey) return;

        const rotationInterval = 5 * 60 * 1000; // 5 minutes

        const checkAndRotate = async () => {
            try {
                const { data: roomData } = await supabase
                    .from('rooms')
                    .select('created_by, is_encrypted')
                    .eq('id', roomId)
                    .single();

                if (roomData?.is_encrypted) {
                    const { id: currentUserId } = await getCurrentUser();

                    // Only rotate if we are the creator (for group/channel) or if it's direct chat
                    if (roomData.created_by === currentUserId) {
                        logger.info(`🔄 Rotating key for room ${roomId}...`);
                        await rotateRoomKey(roomId);
                    }
                }
            } catch (err) {
                logger.error('Failed to rotate key:', err);
            }
        };

        const timer = setInterval(checkAndRotate, rotationInterval);
        return () => clearInterval(timer);
    }, [roomId, masterKey, rotateRoomKey]);

    return { messages, loading, sendMessage, insertMessages, updateMessage, deleteMessage, uploadMedia, addReaction, pinMessage, unpinMessage, forwardMessage, currentUser, rateLimitError };
}

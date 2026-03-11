import { useCallback } from 'react';
import { supabase } from '../../../supabaseClient';
import { Message, getCurrentUser, uploadMediaFile } from '../supabaseHelpers';
import { logger } from '../../utils/logger';
import { encryptText, decryptFile, encryptFile } from '../../utils/encryption';

export type NewMessageInput = {
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

export function useMessageActions(
    roomId: string | undefined,
    messages: Message[],
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
    encryption: any,
    rateLimit: any
) {
    const { encrypt, masterKey, getRoomKey, rotateRoomKey, currentRoomVersion } = encryption;
    const { checkRateLimit, rateLimitError } = rateLimit;

    const sendMessage = useCallback(async (content: string, mediaUrl?: string, replyTo?: string, metadata?: Partial<NewMessageInput>) => {
        if (!roomId || (!content.trim() && !mediaUrl)) return;
        const { id } = await getCurrentUser();
        if (!id) return;

        const { data: canPost } = await supabase.rpc('check_channel_post_permission', { p_room_id: roomId, p_user_id: id });
        if (!canPost) throw new Error('У вас нет прав для отправки сообщений');

        const allowed = await checkRateLimit('message');
        if (!allowed) throw new Error(rateLimitError || 'Слишком много сообщений');

        let finalContent = content;
        let usedVersion = currentRoomVersion(roomId);
        let isEncryptedRoom = false;

        if (masterKey) {
            const { data: roomData } = await supabase.from('rooms').select('is_encrypted, is_direct, created_by, target_user_id').eq('id', roomId).single();
            isEncryptedRoom = !!(roomData?.is_encrypted || (roomData?.is_direct && roomData?.created_by === roomData?.target_user_id));
        }

        if (content.trim() && masterKey && isEncryptedRoom) {
            let sessionKey = await getRoomKey(roomId, usedVersion);
            if (!sessionKey) {
                const rotated = await rotateRoomKey(roomId);
                usedVersion = rotated.version;
                sessionKey = rotated.key;
            }
            if (sessionKey) finalContent = await encryptText(content, sessionKey);
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
                ...metadata
            })
            .select(`*, users!user_id (username, avatar_url)`)
            .single();

        if (error) {
            logger.error('Error sending message:', error.message);
            return;
        }

        if (inserted) {
            setMessages((prev) => prev.some(m => m.id === inserted.id) ? prev : [...prev, inserted as Message]);
        }
    }, [roomId, masterKey, getRoomKey, rotateRoomKey, currentRoomVersion, setMessages, checkRateLimit, rateLimitError]);

    const updateMessage = useCallback(async (messageId: string, content: string) => {
        if (!roomId) return;
        let finalContent = content;
        let usedVersion = currentRoomVersion(roomId);
        
        let isEncryptedRoom = false;
        if (masterKey) {
            const { data: roomData } = await supabase.from('rooms').select('is_encrypted, is_direct, created_by, target_user_id').eq('id', roomId).single();
            isEncryptedRoom = !!(roomData?.is_encrypted || (roomData?.is_direct && roomData?.created_by === roomData?.target_user_id));
        }

        if (content.trim() && masterKey && isEncryptedRoom) {
            const sessionKey = await getRoomKey(roomId, usedVersion);
            if (sessionKey) finalContent = await encryptText(content, sessionKey);
        }

        const { error } = await supabase
            .from('messages')
            .update({ content: finalContent, is_edited: true })
            .eq('id', messageId);

        if (error) logger.error('Error updating message:', error.message);
    }, [roomId, masterKey, getRoomKey, currentRoomVersion]);

    const deleteMessage = useCallback(async (messageId: string) => {
        if (!roomId) return;
        const { id: userId } = await getCurrentUser();
        if (!userId) return;

        const msgToDelete = messages.find(m => m.id === messageId);
        setMessages((prev) => prev.filter((msg) => msg.id !== messageId));

        await supabase.rpc('p_delete_message', { p_message_id: messageId, p_user_id: userId });

        if (msgToDelete?.media_url?.includes('wasabisys.com')) {
            const match = msgToDelete.media_url.match(/media\/[^\s?\"\'% ]+/);
            if (match) {
                const apiBase = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';
                fetch(`${apiBase}/api/s3/delete-object`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ key: match[0] })
                }).catch(e => logger.warn('S3 cleanup failed', e));
            }
        }
    }, [roomId, messages, setMessages]);

    const addReaction = useCallback(async (messageId: string, emoji: string) => {
        const { id } = await getCurrentUser();
        if (!id) return;

        const { data: message } = await supabase.from('messages').select('reactions').eq('id', messageId).single();
        if (!message) return;

        const reactions = message.reactions || [];
        const existingIndex = reactions.findIndex((r: any) => r.user_id === id && r.emoji === emoji);
        const newReactions = existingIndex >= 0 
            ? reactions.filter((_: any, i: number) => i !== existingIndex)
            : [...reactions, { emoji, user_id: id }];

        await supabase.from('messages').update({ reactions: newReactions }).eq('id', messageId);
    }, []);

    const pinMessage = useCallback(async (msgId: string) => {
        const { error } = await supabase
            .from('rooms')
            .update({ pinned_message_id: msgId })
            .eq('id', roomId);
        if (error) logger.error('Error pinning message:', error.message);
    }, [roomId]);

    const unpinMessage = useCallback(async (msgId: string) => {
        // Only unpin if it matches the current pinned message
        const { data: room } = await supabase
            .from('rooms')
            .select('pinned_message_id')
            .eq('id', roomId)
            .single();

        if (room?.pinned_message_id === msgId) {
            await supabase
                .from('rooms')
                .update({ pinned_message_id: null })
                .eq('id', roomId);
        }
    }, [roomId]);

    const forwardMessage = useCallback(async (msg: Message, targetRoomId: string) => {
        const { id } = await getCurrentUser();
        if (!id) return;

        await sendMessage(
            msg.content || '',
            msg.media_url || undefined,
            undefined,
            {
                forwarded_from: msg.user_id,
                file_name: msg.file_name,
                file_size: msg.file_size,
                file_type: msg.file_type
            }
        );
    }, [sendMessage]);

    return { sendMessage, updateMessage, deleteMessage, addReaction, pinMessage, unpinMessage, forwardMessage };
}

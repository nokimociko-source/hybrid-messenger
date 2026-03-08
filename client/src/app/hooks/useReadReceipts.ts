import { logger } from '../utils/logger';
import { useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';

export function useReadReceipts(roomId?: string, currentUserId?: string | null) {

    // Отметить сообщения как прочитанные
    const markMessagesAsRead = useCallback(async (messageIds: string[]) => {
        if (!currentUserId || messageIds.length === 0 || !roomId) return;

        try {
            // Use the batch RPC which is more reliable and handles array logic on server
            const { error } = await supabase.rpc('mark_messages_read', {
                p_room_id: roomId,
                p_message_id: messageIds[messageIds.length - 1] // Mark up to the last one
            });

            if (error) throw error;
            
            logger.debug(`[ReadReceipts] Marked messages as read up to ${messageIds[messageIds.length - 1]}`);
        } catch (err) {
            logger.error('Error marking messages as read:', err);
        }
    }, [currentUserId, roomId]);

    // Автоматически отмечать все сообщения в комнате как прочитанные
    const markRoomAsRead = useCallback(async () => {
        if (!roomId || !currentUserId) return;

        try {
            // Получить все сообщения в комнате
            const { data: messages } = await supabase
                .from('messages')
                .select('id, read_by, user_id')
                .eq('room_id', roomId);

            if (!messages) return;

            // Фильтровать на клиенте - не свои и непрочитанные
            const unreadIds = messages
                .filter(msg => msg.user_id !== currentUserId && !msg.read_by?.includes(currentUserId))
                .map(msg => msg.id);

            if (unreadIds.length > 0) {
                await markMessagesAsRead(unreadIds);
            }
        } catch (err) {
            logger.error('Error marking room as read:', err);
        }
    }, [roomId, currentUserId, markMessagesAsRead]);

    // Автоматически отмечать при открытии комнаты
    useEffect(() => {
        if (roomId && currentUserId) {
            markRoomAsRead();
        }
    }, [roomId, currentUserId, markRoomAsRead]);

    return {
        markMessagesAsRead,
        markRoomAsRead
    };
}

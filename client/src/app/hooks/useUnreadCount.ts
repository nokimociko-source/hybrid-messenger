import { logger } from '../utils/logger';
import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { getCurrentUser, getCurrentUserId } from '../utils/authCache';

interface UnreadCount {
  room_id: string;
  unread_count: number;
  last_read_message_id: string | null;
}

export function useUnreadCount() {
  const [unreadByRoom, setUnreadByRoom] = useState<Map<string, number>>(new Map());
  const [lastReadByRoom, setLastReadByRoom] = useState<Map<string, string | null>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchUnreadCounts() {
      try {
        const user = await getCurrentUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('unread_messages')
          .select('room_id, unread_count, last_read_message_id')
          .eq('user_id', user.id);

        if (error) throw error;

        if (mounted && data) {
          const countMap = new Map<string, number>();
          const lastReadMap = new Map<string, string | null>();
          data.forEach((item: UnreadCount) => {
            countMap.set(item.room_id, item.unread_count);
            lastReadMap.set(item.room_id, item.last_read_message_id);
          });
          setUnreadByRoom(countMap);
          setLastReadByRoom(lastReadMap);
        }
      } catch (error) {
        logger.error('Error fetching unread counts:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchUnreadCounts();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('unread_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'unread_messages',
        },
        () => {
          if (mounted) fetchUnreadCounts();
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const markAsRead = async (roomId: string, messageId: string) => {
    try {
      await supabase.rpc('mark_messages_read', {
        p_room_id: roomId,
        p_message_id: messageId,
      });
    } catch (error) {
      logger.error('Error marking messages as read:', error);
    }
  };

  const getUnreadCount = (roomId: string): number => {
    return unreadByRoom.get(roomId) || 0;
  };

  const getLastReadMessageId = (roomId: string): string | null => {
    return lastReadByRoom.get(roomId) || null;
  };

  return {
    unreadByRoom,
    lastReadByRoom,
    loading,
    markAsRead,
    getUnreadCount,
    getLastReadMessageId,
  };
}

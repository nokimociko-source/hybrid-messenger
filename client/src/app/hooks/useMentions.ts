import { logger } from '../utils/logger';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { getCurrentUser, getCurrentUserId } from '../utils/authCache';
import { Mention, MentionAutocompleteItem } from '../types/chatOrganization';

interface UseMentionsReturn {
  mentions: Mention[];
  unreadMentionsByRoom: Map<string, number>;
  loading: boolean;
  error: Error | null;
  getRoomMembers: (roomId: string) => Promise<MentionAutocompleteItem[]>;
  markMentionAsRead: (mentionId: string) => Promise<void>;
  getUnreadMentionsForRoom: (roomId: string) => Mention[];
}

export function useMentions(roomId?: string): UseMentionsReturn {
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [unreadMentionsByRoom, setUnreadMentionsByRoom] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch mentions for the current user
  useEffect(() => {
    let mounted = true;

    async function fetchMentions() {
      try {
        const userId = await getCurrentUserId();
        if (!userId) {
          if (mounted) {
            setLoading(false);
            setError(new Error('Пользователь не авторизован'));
          }
          return;
        }

        // Build query
        let query = supabase
          .from('mentions')
          .select('*')
          .eq('mentioned_user_id', userId)
          .order('created_at', { ascending: false });

        // Filter by room if specified
        if (roomId) {
          query = query.eq('room_id', roomId);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) throw fetchError;

        if (mounted) {
          setMentions(data || []);

          // Calculate unread mentions per room
          const unreadMap = new Map<string, number>();
          (data || []).forEach(mention => {
            if (!mention.is_read) {
              const count = unreadMap.get(mention.room_id) || 0;
              unreadMap.set(mention.room_id, count + 1);
            }
          });
          setUnreadMentionsByRoom(unreadMap);

          setLoading(false);
          setError(null);
        }
      } catch (err) {
        logger.error('Error fetching mentions:', err);
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Не удалось загрузить упоминания'));
          setLoading(false);
        }
      }
    }

    fetchMentions();

    // Subscribe to realtime changes for mentions
    const channel = supabase
      .channel('mentions_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mentions',
        },
        () => {
          if (mounted) fetchMentions();
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  // Get room members for autocomplete
  const getRoomMembers = useCallback(async (roomId: string): Promise<MentionAutocompleteItem[]> => {
    try {
      // Get room members from room_members table
      const { data: membersData, error: membersError } = await supabase
        .from('room_members')
        .select('user_id')
        .eq('room_id', roomId);

      if (membersError) throw membersError;

      if (!membersData || membersData.length === 0) {
        return [];
      }

      // Get user details for all members
      const userIds = membersData.map(m => m.user_id);
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, username, avatar_url')
        .in('id', userIds);

      if (usersError) throw usersError;

      // Map to MentionAutocompleteItem format
      return (usersData || []).map(user => ({
        user_id: user.id,
        username: user.username,
        avatar_url: user.avatar_url || undefined,
      }));
    } catch (err) {
      logger.error('Error fetching room members:', err);
      setError(err instanceof Error ? err : new Error('Не удалось загрузить участников'));
      return [];
    }
  }, []);

  // Mark a mention as read
  const markMentionAsRead = useCallback(async (mentionId: string): Promise<void> => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error('Пользователь не авторизован');
      }

      const { error: updateError } = await supabase
        .from('mentions')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('id', mentionId)
        .eq('mentioned_user_id', userId);

      if (updateError) throw updateError;
    } catch (err) {
      logger.error('Error marking mention as read:', err);
      const errorMessage = err instanceof Error ? err.message : 'Не удалось отметить упоминание как прочитанное';
      setError(new Error(errorMessage));
      throw new Error(errorMessage);
    }
  }, []);

  // Get unread mentions for a specific room
  const getUnreadMentionsForRoom = useCallback((roomId: string): Mention[] => {
    return mentions.filter(mention => 
      mention.room_id === roomId && !mention.is_read
    );
  }, [mentions]);

  return {
    mentions,
    unreadMentionsByRoom,
    loading,
    error,
    getRoomMembers,
    markMentionAsRead,
    getUnreadMentionsForRoom,
  };
}

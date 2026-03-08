import { logger } from '../utils/logger';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { getCurrentUser, getCurrentUserId } from '../utils/authCache';
import { PinnedChat } from '../types/chatOrganization';

interface UsePinnedChatsReturn {
  pinnedChats: PinnedChat[];
  loading: boolean;
  error: Error | null;
  pinChat: (roomId: string) => Promise<void>;
  unpinChat: (roomId: string) => Promise<void>;
  isPinned: (roomId: string) => boolean;
  canPin: () => boolean;
  reorderPins: (roomIds: string[]) => Promise<void>;
}

// Maximum number of pinned chats allowed per user
const MAX_PINNED_CHATS = 5;

export function usePinnedChats(): UsePinnedChatsReturn {
  const [pinnedChats, setPinnedChats] = useState<PinnedChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch pinned chats
  useEffect(() => {
    let mounted = true;

    async function fetchPinnedChats() {
      try {
        const userId = await getCurrentUserId();
        if (!userId) {
          if (mounted) {
            setLoading(false);
            setError(new Error('Пользователь не авторизован'));
          }
          return;
        }

        // Fetch pinned chats ordered by order_index
        const { data, error: fetchError } = await supabase
          .from('pinned_chats')
          .select('*')
          .eq('user_id', userId)
          .order('order_index', { ascending: true });

        if (fetchError) throw fetchError;

        if (mounted) {
          setPinnedChats(data || []);
          setLoading(false);
          setError(null);
        }
      } catch (err) {
        logger.error('Error fetching pinned chats:', err);
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Не удалось загрузить закрепленные чаты'));
          setLoading(false);
        }
      }
    }

    fetchPinnedChats();

    // Subscribe to realtime changes for pinned_chats
    const channel = supabase
      .channel('pinned_chats_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pinned_chats',
        },
        () => {
          if (mounted) fetchPinnedChats();
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  // Pin a chat
  const pinChat = useCallback(async (roomId: string): Promise<void> => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error('Пользователь не авторизован');
      }

      // Check if already pinned
      const alreadyPinned = pinnedChats.some(pin => pin.room_id === roomId);
      if (alreadyPinned) {
        return; // Already pinned, no error
      }

      // Enforce 5-pin limit
      if (pinnedChats.length >= MAX_PINNED_CHATS) {
        throw new Error('Вы можете закрепить максимум 5 чатов');
      }

      // Get the next order_index
      const maxOrder = pinnedChats.reduce((max, pin) => Math.max(max, pin.order_index), -1);

      const pinData = {
        user_id: userId,
        room_id: roomId,
        order_index: maxOrder + 1,
      };

      const { error: insertError } = await supabase
        .from('pinned_chats')
        .insert(pinData);

      if (insertError) {
        if (insertError.code === '23505') {
          return; // Already exists, no error
        }
        throw insertError;
      }
    } catch (err) {
      logger.error('Error pinning chat:', err);
      const errorMessage = err instanceof Error ? err.message : 'Не удалось закрепить чат';
      setError(new Error(errorMessage));
      throw new Error(errorMessage);
    }
  }, [pinnedChats]);

  // Unpin a chat
  const unpinChat = useCallback(async (roomId: string): Promise<void> => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error('Пользователь не авторизован');
      }

      const { error: deleteError } = await supabase
        .from('pinned_chats')
        .delete()
        .eq('user_id', userId)
        .eq('room_id', roomId);

      if (deleteError) throw deleteError;
    } catch (err) {
      logger.error('Error unpinning chat:', err);
      const errorMessage = err instanceof Error ? err.message : 'Не удалось открепить чат';
      setError(new Error(errorMessage));
      throw new Error(errorMessage);
    }
  }, []);

  // Check if a chat is pinned
  const isPinned = useCallback((roomId: string): boolean => {
    return pinnedChats.some(pin => pin.room_id === roomId);
  }, [pinnedChats]);

  // Check if user can pin more chats
  const canPin = useCallback((): boolean => {
    return pinnedChats.length < MAX_PINNED_CHATS;
  }, [pinnedChats]);

  // Reorder pinned chats
  const reorderPins = useCallback(async (roomIds: string[]): Promise<void> => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error('Пользователь не авторизован');
      }

      // Validate that all roomIds are currently pinned
      const pinnedRoomIds = new Set(pinnedChats.map(pin => pin.room_id));
      const invalidRoomIds = roomIds.filter(id => !pinnedRoomIds.has(id));
      if (invalidRoomIds.length > 0) {
        throw new Error('Некоторые чаты не закреплены');
      }

      // Update order_index for each pinned chat
      const updates = roomIds.map((roomId, index) => 
        supabase
          .from('pinned_chats')
          .update({ order_index: index })
          .eq('user_id', userId)
          .eq('room_id', roomId)
      );

      const results = await Promise.all(updates);
      
      // Check for errors
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        throw errors[0].error;
      }
    } catch (err) {
      logger.error('Error reordering pins:', err);
      const errorMessage = err instanceof Error ? err.message : 'Не удалось изменить порядок закрепленных чатов';
      setError(new Error(errorMessage));
      throw new Error(errorMessage);
    }
  }, [pinnedChats]);

  return {
    pinnedChats,
    loading,
    error,
    pinChat,
    unpinChat,
    isPinned,
    canPin,
    reorderPins,
  };
}

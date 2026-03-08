import { logger } from '../utils/logger';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { getCurrentUser, getCurrentUserId } from '../utils/authCache';
import { ArchivedChat } from '../types/chatOrganization';

interface UseArchiveReturn {
  archivedChats: ArchivedChat[];
  loading: boolean;
  error: Error | null;
  archiveChat: (roomId: string) => Promise<void>;
  unarchiveChat: (roomId: string) => Promise<void>;
  isArchived: (roomId: string) => boolean;
}

export function useArchive(): UseArchiveReturn {
  const [archivedChats, setArchivedChats] = useState<ArchivedChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch archived chats
  useEffect(() => {
    let mounted = true;

    async function fetchArchivedChats() {
      try {
        const userId = await getCurrentUserId();
        if (!userId) {
          if (mounted) {
            setLoading(false);
            setError(new Error('Пользователь не авторизован'));
          }
          return;
        }

        const { data, error: fetchError } = await supabase
          .from('archived_chats')
          .select('*')
          .eq('user_id', userId)
          .order('archived_at', { ascending: false });

        if (fetchError) throw fetchError;

        if (mounted) {
          setArchivedChats(data || []);
          setLoading(false);
          setError(null);
        }
      } catch (err) {
        logger.error('Error fetching archived chats:', err);
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Не удалось загрузить архивированные чаты'));
          setLoading(false);
        }
      }
    }

    fetchArchivedChats();

    const channel = supabase
      .channel('archived_chats_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'archived_chats',
        },
        () => {
          if (mounted) fetchArchivedChats();
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const archiveChat = useCallback(async (roomId: string): Promise<void> => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error('Пользователь не авторизован');
      }

      const alreadyArchived = archivedChats.some(archived => archived.room_id === roomId);
      if (alreadyArchived) {
        return;
      }

      const { error: insertError } = await supabase
        .from('archived_chats')
        .insert({
          user_id: userId,
          room_id: roomId,
        });

      if (insertError) {
        if (insertError.code === '23505') {
          return;
        }
        throw insertError;
      }
    } catch (err) {
      logger.error('Error archiving chat:', err);
      const errorMessage = err instanceof Error ? err.message : 'Не удалось архивировать чат';
      setError(new Error(errorMessage));
      throw new Error(errorMessage);
    }
  }, [archivedChats]);

  const unarchiveChat = useCallback(async (roomId: string): Promise<void> => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error('Пользователь не авторизован');
      }

      const { error: deleteError } = await supabase
        .from('archived_chats')
        .delete()
        .eq('user_id', userId)
        .eq('room_id', roomId);

      if (deleteError) throw deleteError;
    } catch (err) {
      logger.error('Error unarchiving chat:', err);
      const errorMessage = err instanceof Error ? err.message : 'Не удалось разархивировать чат';
      setError(new Error(errorMessage));
      throw new Error(errorMessage);
    }
  }, []);

  const isArchived = useCallback((roomId: string): boolean => {
    return archivedChats.some(archived => archived.room_id === roomId);
  }, [archivedChats]);

  return {
    archivedChats,
    loading,
    error,
    archiveChat,
    unarchiveChat,
    isArchived,
  };
}

import { logger } from '../utils/logger';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { MessageDraft } from '../types/chatOrganization';
import { getCurrentUserId, clearAuthCache } from '../utils/authCache';

interface UseMessageDraftsReturn {
  drafts: Map<string, MessageDraft>;
  loading: boolean;
  error: Error | null;
  saveDraft: (roomId: string, content: string, replyTo?: string) => Promise<void>;
  getDraft: (roomId: string) => MessageDraft | null;
  deleteDraft: (roomId: string) => Promise<void>;
  hasDraft: (roomId: string) => boolean;
}

export function useMessageDrafts(): UseMessageDraftsReturn {
  const [drafts, setDrafts] = useState<Map<string, MessageDraft>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch drafts for the current user
  useEffect(() => {
    let mounted = true;

    async function fetchDrafts() {
      try {
        const userId = await getCurrentUserId();
        if (!userId) {
          if (mounted) {
            setLoading(false);
            setError(new Error('Пользователь не авторизован'));
          }
          return;
        }

        // Fetch all drafts for the user
        const { data, error: fetchError } = await supabase
          .from('message_drafts')
          .select('*')
          .eq('user_id', userId);

        if (fetchError) throw fetchError;

        if (mounted) {
          const draftsMap = new Map<string, MessageDraft>();
          (data || []).forEach(draft => {
            draftsMap.set(draft.room_id, draft);
          });
          setDrafts(draftsMap);
          setLoading(false);
          setError(null);
        }
      } catch (err) {
        logger.error('Error fetching drafts:', err);
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Не удалось загрузить черновики'));
          setLoading(false);
        }
      }
    }

    fetchDrafts();

    // Subscribe to realtime changes for message_drafts
    const channel = supabase
      .channel('message_drafts_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_drafts',
        },
        () => {
          if (mounted) fetchDrafts();
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  // Save a draft (upsert)
  const saveDraft = useCallback(async (
    roomId: string,
    content: string,
    replyTo?: string
  ): Promise<void> => {
    try {
      // Validate content
      if (!content.trim()) {
        // If content is empty, delete the draft instead
        await deleteDraft(roomId);
        return;
      }

      if (content.length > 10000) {
        throw new Error('Черновик не может превышать 10000 символов');
      }

      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error('Пользователь не авторизован');
      }

      const draftData = {
        user_id: userId,
        room_id: roomId,
        content: content.trim(),
        reply_to: replyTo || null,
      };

      // Use upsert to handle both insert and update
      const { error: upsertError } = await supabase
        .from('message_drafts')
        .upsert(draftData, {
          onConflict: 'user_id,room_id',
        });

      if (upsertError) throw upsertError;
    } catch (err) {
      logger.error('Error saving draft:', err);
      const errorMessage = err instanceof Error ? err.message : 'Не удалось сохранить черновик';
      setError(new Error(errorMessage));
      throw new Error(errorMessage);
    }
  }, []);

  // Get a draft for a specific room
  const getDraft = useCallback((roomId: string): MessageDraft | null => {
    return drafts.get(roomId) || null;
  }, [drafts]);

  // Delete a draft
  const deleteDraft = useCallback(async (roomId: string): Promise<void> => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error('Пользователь не авторизован');
      }

      const { error: deleteError } = await supabase
        .from('message_drafts')
        .delete()
        .eq('user_id', userId)
        .eq('room_id', roomId);

      if (deleteError) throw deleteError;
    } catch (err) {
      logger.error('Error deleting draft:', err);
      const errorMessage = err instanceof Error ? err.message : 'Не удалось удалить черновик';
      setError(new Error(errorMessage));
      throw new Error(errorMessage);
    }
  }, []);

  // Check if a draft exists for a room
  const hasDraft = useCallback((roomId: string): boolean => {
    return drafts.has(roomId);
  }, [drafts]);

  return {
    drafts,
    loading,
    error,
    saveDraft,
    getDraft,
    deleteDraft,
    hasDraft,
  };
}

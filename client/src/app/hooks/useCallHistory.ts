import { logger } from '../utils/logger';
import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { getCurrentUser, getCurrentUserId } from '../utils/authCache';

export interface CallHistoryEntry {
  id: string;
  room_id: string;
  caller_id: string;
  call_type: 'audio' | 'video';
  status: 'missed' | 'answered' | 'rejected' | 'ended';
  started_at: string;
  ended_at: string | null;
  duration: number | null;
  participants: string[];
  created_at: string;
  caller?: {
    username: string;
    avatar_url?: string;
  };
}

export function useCallHistory(roomId?: string) {
  const [callHistory, setCallHistory] = useState<CallHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchCallHistory() {
      try {
        let query = supabase
          .from('call_history')
          .select(`
            *,
            caller:users!call_history_caller_id_fkey(username, avatar_url)
          `)
          .order('started_at', { ascending: false });

        if (roomId) {
          query = query.eq('room_id', roomId);
        }

        const { data, error } = await query.limit(50);

        if (error) throw error;

        if (mounted && data) {
          setCallHistory(data);
        }
      } catch (error) {
        logger.error('Error fetching call history:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchCallHistory();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('call_history_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'call_history',
          filter: roomId ? `room_id=eq.${roomId}` : undefined,
        },
        () => {
          if (mounted) fetchCallHistory();
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  const createCallEntry = async (
    roomId: string,
    callType: 'audio' | 'video'
  ): Promise<string | null> => {
    try {
      const user = await getCurrentUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('call_history')
        .insert({
          room_id: roomId,
          caller_id: user.id,
          call_type: callType,
          status: 'answered',
          participants: [user.id],
        })
        .select()
        .single();

      if (error) throw error;

      return data.id;
    } catch (error) {
      logger.error('Error creating call entry:', error);
      return null;
    }
  };

  const updateCallEntry = async (
    callId: string,
    updates: {
      status?: 'missed' | 'answered' | 'rejected' | 'ended';
      ended_at?: string;
      duration?: number;
      participants?: string[];
    }
  ) => {
    try {
      const { error } = await supabase
        .from('call_history')
        .update(updates)
        .eq('id', callId);

      if (error) throw error;
    } catch (error) {
      logger.error('Error updating call entry:', error);
    }
  };

  return {
    callHistory,
    loading,
    createCallEntry,
    updateCallEntry,
  };
}

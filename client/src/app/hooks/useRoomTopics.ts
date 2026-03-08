import { logger } from '../utils/logger';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';

export interface RoomTopic {
  id: string;
  room_id: string;
  name: string;
  icon: string;
  description: string | null;
  created_by: string;
  is_closed: boolean;
  created_at: string;
  message_count?: number;
}

export function useRoomTopics(roomId: string | undefined) {
  const [topics, setTopics] = useState<RoomTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTopics = useCallback(async () => {
    if (!roomId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('room_topics')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Count messages for each topic
      const topicsWithCounts = await Promise.all(
        (data || []).map(async (topic) => {
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('topic_id', topic.id);

          return {
            ...topic,
            message_count: count || 0,
          };
        })
      );

      setTopics(topicsWithCounts);
      setError(null);
    } catch (err) {
      logger.error('Error fetching topics:', err);
      setError(err instanceof Error ? err : new Error('Не удалось загрузить темы'));
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    fetchTopics();

    if (!roomId) return;

    // Realtime subscription
    const channel = supabase
      .channel(`topics_${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_topics',
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          fetchTopics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, fetchTopics]);

  const createTopic = async (data: { name: string; icon?: string; description?: string }) => {
    if (!roomId) return null;

    try {
      const { data: topic, error } = await supabase
        .from('room_topics')
        .insert({
          room_id: roomId,
          name: data.name,
          icon: data.icon || '💬',
          description: data.description || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Log to audit
      await supabase.from('room_audit_log').insert({
        room_id: roomId,
        action: 'topic_created',
        details: { topic_id: topic.id, topic_name: data.name },
      });

      return topic;
    } catch (err) {
      logger.error('Error creating topic:', err);
      setError(err instanceof Error ? err : new Error('Не удалось создать тему'));
      return null;
    }
  };

  const updateTopic = async (
    topicId: string,
    data: { name?: string; icon?: string; description?: string; is_closed?: boolean }
  ) => {
    try {
      const { error } = await supabase.from('room_topics').update(data).eq('id', topicId);

      if (error) throw error;
      return true;
    } catch (err) {
      logger.error('Error updating topic:', err);
      setError(err instanceof Error ? err : new Error('Не удалось обновить тему'));
      return false;
    }
  };

  const deleteTopic = async (topicId: string) => {
    try {
      // First, remove topic_id from all messages in this topic
      await supabase.from('messages').update({ topic_id: null }).eq('topic_id', topicId);

      // Then delete the topic
      const { error } = await supabase.from('room_topics').delete().eq('id', topicId);

      if (error) throw error;
      return true;
    } catch (err) {
      logger.error('Error deleting topic:', err);
      setError(err instanceof Error ? err : new Error('Не удалось удалить тему'));
      return false;
    }
  };

  return {
    topics,
    loading,
    error,
    createTopic,
    updateTopic,
    deleteTopic,
    refresh: fetchTopics,
  };
}

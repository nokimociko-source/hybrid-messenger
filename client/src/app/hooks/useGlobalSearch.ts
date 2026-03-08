import { logger } from '../utils/logger';
import { useState, useCallback } from 'react';
import { supabase } from '../../supabaseClient';

export interface GlobalSearchResult {
  message_id: string;
  room_id: string;
  room_name: string;
  room_avatar_url: string | null;
  is_direct: boolean;
  sender_id: string;
  sender_username: string;
  sender_avatar_url: string | null;
  content: string | null;
  file_url: string | null;
  file_name: string | null;
  file_type: string | null;
  created_at: string;
  match_rank: number;
}

export interface GlobalSearchFilters {
  query: string;
  senderId?: string;
  mediaType?: 'all' | 'text' | 'image' | 'video' | 'audio' | 'file';
  limit?: number;
}

export function useGlobalSearch() {
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const search = useCallback(async (filters: GlobalSearchFilters) => {
    if (!filters.query.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: searchError } = await supabase.rpc('search_messages_global', {
        search_query: filters.query.trim(),
        sender_filter: filters.senderId || null,
        media_type_filter: filters.mediaType || 'all',
        limit_count: filters.limit || 50,
      });

      if (searchError) throw searchError;

      setResults(data || []);
    } catch (err) {
      logger.error('❌ Ошибка глобального поиска:', err);
      setError(err instanceof Error ? err : new Error('Не удалось выполнить поиск'));
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  return {
    results,
    loading,
    error,
    search,
    clear,
  };
}

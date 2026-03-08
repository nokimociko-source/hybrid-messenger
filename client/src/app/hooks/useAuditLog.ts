import { logger } from '../utils/logger';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';

export interface AuditLogEntry {
  id: string;
  room_id: string;
  user_id: string | null;
  action: string;
  target_user_id: string | null;
  details: Record<string, any>;
  created_at: string;
  user?: {
    username: string;
    avatar_url?: string;
  };
  target_user?: {
    username: string;
    avatar_url?: string;
  };
}

export function useAuditLog(roomId: string | undefined) {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchEntries = useCallback(async () => {
    if (!roomId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('room_audit_log')
        .select(`
          *,
          user:users!room_audit_log_user_id_fkey(username, avatar_url),
          target_user:users!room_audit_log_target_user_id_fkey(username, avatar_url)
        `)
        .eq('room_id', roomId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Transform data
      const transformed = (data || []).map((item: any) => ({
        ...item,
        user: Array.isArray(item.user) && item.user.length > 0 ? item.user[0] : item.user,
        target_user:
          Array.isArray(item.target_user) && item.target_user.length > 0
            ? item.target_user[0]
            : item.target_user,
      }));

      setEntries(transformed);
      setError(null);
    } catch (err) {
      logger.error('Error fetching audit log:', err);
      setError(err instanceof Error ? err : new Error('Не удалось загрузить историю'));
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    fetchEntries();

    if (!roomId) return;

    // Realtime subscription
    const channel = supabase
      .channel(`audit_log_${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'room_audit_log',
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          fetchEntries();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, fetchEntries]);

  const getActionText = (entry: AuditLogEntry): string => {
    const targetName = entry.target_user?.username || 'Пользователь';
    const userName = entry.user?.username || 'Кто-то';

    switch (entry.action) {
      case 'member_added':
        return `${userName} добавил(а) ${targetName}`;
      case 'member_removed':
        return `${userName} удалил(а) ${targetName}`;
      case 'member_promoted':
        return `${userName} повысил(а) ${targetName} до ${entry.details.new_role === 'admin' ? 'администратора' : 'создателя'}`;
      case 'member_demoted':
        return `${userName} понизил(а) ${targetName} до участника`;
      case 'room_created':
        return `${userName} создал(а) группу`;
      case 'room_updated':
        return `${userName} обновил(а) информацию о группе`;
      case 'invite_link_created':
        return `${userName} создал(а) пригласительную ссылку`;
      case 'invite_link_revoked':
        return `${userName} отозвал(а) пригласительную ссылку`;
      case 'message_pinned':
        return `${userName} закрепил(а) сообщение`;
      case 'message_unpinned':
        return `${userName} открепил(а) сообщение`;
      case 'poll_created':
        return `${userName} создал(а) опрос`;
      case 'topic_created':
        return `${userName} создал(а) тему "${entry.details.topic_name}"`;
      default:
        return `${userName} выполнил(а) действие: ${entry.action}`;
    }
  };

  return {
    entries,
    loading,
    error,
    getActionText,
    refresh: fetchEntries,
  };
}

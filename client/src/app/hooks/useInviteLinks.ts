import { logger } from '../utils/logger';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';

export interface InviteLink {
  id: string;
  room_id: string;
  link_code: string;
  created_by: string;
  expires_at: string | null;
  max_uses: number | null;
  current_uses: number;
  is_active: boolean;
  created_at: string;
}

export function useInviteLinks(roomId: string | undefined) {
  const [links, setLinks] = useState<InviteLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchLinks = useCallback(async () => {
    if (!roomId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('invite_links')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLinks(data || []);
      setError(null);
    } catch (err) {
      logger.error('Error fetching invite links:', err);
      setError(err instanceof Error ? err : new Error('Не удалось загрузить ссылки'));
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    fetchLinks();

    if (!roomId) return;

    // Realtime subscription
    const channel = supabase
      .channel(`invite_links_${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'invite_links',
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          fetchLinks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, fetchLinks]);

  const createLink = async (options: {
    expiresInHours?: number;
    maxUses?: number;
  } = {}) => {
    if (!roomId) return null;

    try {
      // Генерируем код
      const { data: codeData, error: codeError } = await supabase.rpc('generate_invite_code');
      if (codeError) throw codeError;

      const linkCode = codeData;
      const expiresAt = options.expiresInHours
        ? new Date(Date.now() + options.expiresInHours * 60 * 60 * 1000).toISOString()
        : null;

      const { data, error } = await supabase
        .from('invite_links')
        .insert({
          room_id: roomId,
          link_code: linkCode,
          expires_at: expiresAt,
          max_uses: options.maxUses || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Логируем в audit log
      await supabase.from('room_audit_log').insert({
        room_id: roomId,
        action: 'invite_link_created',
        details: { link_code: linkCode, expires_at: expiresAt, max_uses: options.maxUses },
      });

      return data;
    } catch (err) {
      logger.error('Error creating invite link:', err);
      setError(err instanceof Error ? err : new Error('Не удалось создать ссылку'));
      return null;
    }
  };

  const revokeLink = async (linkId: string) => {
    try {
      const { error } = await supabase
        .from('invite_links')
        .update({ is_active: false })
        .eq('id', linkId);

      if (error) throw error;

      // Логируем в audit log
      await supabase.from('room_audit_log').insert({
        room_id: roomId,
        action: 'invite_link_revoked',
        details: { link_id: linkId },
      });

      return true;
    } catch (err) {
      logger.error('Error revoking invite link:', err);
      setError(err instanceof Error ? err : new Error('Не удалось отозвать ссылку'));
      return false;
    }
  };

  const deleteLink = async (linkId: string) => {
    try {
      const { error } = await supabase.from('invite_links').delete().eq('id', linkId);

      if (error) throw error;
      return true;
    } catch (err) {
      logger.error('Error deleting invite link:', err);
      setError(err instanceof Error ? err : new Error('Не удалось удалить ссылку'));
      return false;
    }
  };

  const joinByLink = async (linkCode: string) => {
    try {
      const { data, error } = await supabase.rpc('join_room_by_invite', {
        p_link_code: linkCode,
      });

      if (error) throw error;

      return data;
    } catch (err) {
      logger.error('Error joining by invite link:', err);
      throw err;
    }
  };

  const getFullLink = (linkCode: string) => {
    return `${window.location.origin}/invite/${linkCode}`;
  };

  return {
    links,
    loading,
    error,
    createLink,
    revokeLink,
    deleteLink,
    joinByLink,
    getFullLink,
    refresh: fetchLinks,
  };
}

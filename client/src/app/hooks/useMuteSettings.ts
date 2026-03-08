import { logger } from '../utils/logger';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { getCurrentUser, getCurrentUserId } from '../utils/authCache';
import { MuteSetting, MuteDuration } from '../types/chatOrganization';

interface UseMuteSettingsReturn {
  muteSettings: Map<string, MuteSetting>;
  loading: boolean;
  error: Error | null;
  muteChat: (roomId: string, duration: MuteDuration) => Promise<void>;
  unmuteChat: (roomId: string) => Promise<void>;
  isMuted: (roomId: string) => boolean;
  getMuteExpiry: (roomId: string) => Date | null;
}

// Calculate muted_until date based on duration
function calculateMutedUntil(duration: MuteDuration): string | null {
  if (duration === 'indefinite') return null;

  const now = new Date();
  switch (duration) {
    case '1h':
      now.setHours(now.getHours() + 1);
      break;
    case '8h':
      now.setHours(now.getHours() + 8);
      break;
    case '1d':
      now.setDate(now.getDate() + 1);
      break;
    default:
      return null;
  }
  return now.toISOString();
}

export function useMuteSettings(): UseMuteSettingsReturn {
  const [muteSettings, setMuteSettings] = useState<Map<string, MuteSetting>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch mute settings
  useEffect(() => {
    let mounted = true;

    async function fetchMuteSettings() {
      try {
        const userId = await getCurrentUserId();
        if (!userId) {
          if (mounted) {
            setLoading(false);
            setError(new Error('Пользователь не авторизован'));
          }
          return;
        }

        // Fetch mute settings
        const { data, error: fetchError } = await supabase
          .from('mute_settings')
          .select('*')
          .eq('user_id', userId);

        if (fetchError) throw fetchError;

        if (mounted) {
          const settingsMap = new Map<string, MuteSetting>();
          (data || []).forEach(setting => {
            settingsMap.set(setting.room_id, setting);
          });
          setMuteSettings(settingsMap);
          setLoading(false);
          setError(null);
        }
      } catch (err) {
        logger.error('Error fetching mute settings:', err);
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Не удалось загрузить настройки уведомлений'));
          setLoading(false);
        }
      }
    }

    fetchMuteSettings();

    // Subscribe to realtime changes for mute_settings
    const channel = supabase
      .channel('mute_settings_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mute_settings',
        },
        () => {
          if (mounted) fetchMuteSettings();
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  // Mute a chat
  const muteChat = useCallback(async (roomId: string, duration: MuteDuration): Promise<void> => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error('Пользователь не авторизован');
      }

      const mutedUntil = calculateMutedUntil(duration);
      const isIndefinite = duration === 'indefinite';

      const muteData = {
        user_id: userId,
        room_id: roomId,
        muted_until: mutedUntil,
        is_indefinite: isIndefinite,
      };

      // Use upsert to handle both insert and update
      const { error: upsertError } = await supabase
        .from('mute_settings')
        .upsert(muteData, {
          onConflict: 'user_id,room_id',
        });

      if (upsertError) throw upsertError;
    } catch (err) {
      logger.error('Error muting chat:', err);
      const errorMessage = err instanceof Error ? err.message : 'Не удалось отключить уведомления';
      setError(new Error(errorMessage));
      throw new Error(errorMessage);
    }
  }, []);

  // Unmute a chat
  const unmuteChat = useCallback(async (roomId: string): Promise<void> => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error('Пользователь не авторизован');
      }

      const { error: deleteError } = await supabase
        .from('mute_settings')
        .delete()
        .eq('user_id', userId)
        .eq('room_id', roomId);

      if (deleteError) throw deleteError;
    } catch (err) {
      logger.error('Error unmuting chat:', err);
      const errorMessage = err instanceof Error ? err.message : 'Не удалось включить уведомления';
      setError(new Error(errorMessage));
      throw new Error(errorMessage);
    }
  }, []);

  // Check if a chat is muted (with expiry check)
  const isMuted = useCallback((roomId: string): boolean => {
    const setting = muteSettings.get(roomId);
    if (!setting) return false;

    // If indefinite, always muted
    if (setting.is_indefinite) return true;

    // If has expiry, check if still valid
    if (setting.muted_until) {
      const expiryDate = new Date(setting.muted_until);
      const now = new Date();
      return now < expiryDate;
    }

    return false;
  }, [muteSettings]);

  // Get mute expiry date
  const getMuteExpiry = useCallback((roomId: string): Date | null => {
    const setting = muteSettings.get(roomId);
    if (!setting) return null;

    if (setting.is_indefinite) return null;

    if (setting.muted_until) {
      return new Date(setting.muted_until);
    }

    return null;
  }, [muteSettings]);

  return {
    muteSettings,
    loading,
    error,
    muteChat,
    unmuteChat,
    isMuted,
    getMuteExpiry,
  };
}

import { logger } from '../utils/logger';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { getCurrentUser, getCurrentUserId } from '../utils/authCache';
import { useRateLimit } from './useRateLimit';

/**
 * Hook for subscribing/unsubscribing to channels
 * 
 * Features:
 * - Checks current subscription status
 * - subscribe() creates room_member with correct permissions (no posting rights)
 * - unsubscribe() removes room_member
 * - Handles loading states during operations
 * - Updates subscription status after operations
 * - Integrates with rate limiting
 */
export function useChannelSubscription(channelId: string) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { checkRateLimit } = useRateLimit();

  // Check subscription status on mount and when channelId changes
  useEffect(() => {
    let mounted = true;

    async function checkSubscription() {
      try {
        // Get current user
        const user = await getCurrentUser();
        if (!user) {
          if (mounted) {
            setIsSubscribed(false);
          }
          return;
        }

        // Check if user is a member of the channel
        const { data, error: queryError } = await supabase
          .from('room_members')
          .select('id')
          .eq('room_id', channelId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (queryError) {
          logger.error('Error checking subscription:', queryError.message);
          return;
        }

        if (mounted) {
          setIsSubscribed(!!data);
        }
      } catch (err) {
        logger.error('Error checking subscription:', err);
      }
    }

    checkSubscription();

    // Subscribe to real-time changes for this user's membership
    const channel = supabase
      .channel(`channel-subscription:${channelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_members',
          filter: `room_id=eq.${channelId}`,
        },
        () => {
          if (mounted) checkSubscription();
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [channelId]);

  /**
   * Subscribe to the channel
   * Creates a room_member entry with subscriber permissions (no posting rights)
   */
  const subscribe = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Check rate limit (20 subscription actions per minute)
      const canProceed = await checkRateLimit('api_request');
      if (!canProceed) {
        setError('Rate limit exceeded. Please try again later.');
        setLoading(false);
        return false;
      }

      // Get current user
      const user = await getCurrentUser();
      if (!user) {
        setError('You must be logged in to subscribe');
        setLoading(false);
        return false;
      }

      // Create room_member with subscriber permissions (all posting rights disabled)
      const { error: insertError } = await supabase
        .from('room_members')
        .insert({
          room_id: channelId,
          user_id: user.id,
          role: 'member',
          permissions: {
            can_send_messages: false,
            can_send_media: false,
            can_add_members: false,
            can_pin_messages: false,
            can_delete_messages: false,
            can_ban_members: false,
            can_change_info: false,
            can_invite_users: false,
          },
        });

      if (insertError) {
        logger.error('Error subscribing to channel:', insertError.message);
        setError(insertError.message);
        setLoading(false);
        return false;
      }

      // Update subscription status
      setIsSubscribed(true);
      setLoading(false);
      return true;
    } catch (err) {
      logger.error('Error subscribing to channel:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
      return false;
    }
  }, [channelId, checkRateLimit]);

  /**
   * Unsubscribe from the channel
   * Removes the room_member entry
   */
  const unsubscribe = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Check rate limit (20 subscription actions per minute)
      const canProceed = await checkRateLimit('api_request');
      if (!canProceed) {
        setError('Rate limit exceeded. Please try again later.');
        setLoading(false);
        return false;
      }

      // Get current user
      const user = await getCurrentUser();
      if (!user) {
        setError('You must be logged in to unsubscribe');
        setLoading(false);
        return false;
      }

      // Delete room_member entry
      const { error: deleteError } = await supabase
        .from('room_members')
        .delete()
        .eq('room_id', channelId)
        .eq('user_id', user.id);

      if (deleteError) {
        logger.error('Error unsubscribing from channel:', deleteError.message);
        setError(deleteError.message);
        setLoading(false);
        return false;
      }

      // Update subscription status
      setIsSubscribed(false);
      setLoading(false);
      return true;
    } catch (err) {
      logger.error('Error unsubscribing from channel:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
      return false;
    }
  }, [channelId, checkRateLimit]);

  return {
    isSubscribed,
    subscribe,
    unsubscribe,
    loading,
    error,
  };
}

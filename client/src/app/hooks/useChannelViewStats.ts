import { logger } from '../utils/logger';
import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { getCurrentUser, getCurrentUserId } from '../utils/authCache';
import { MessageViewStats } from '../types/channels';

/**
 * Hook for tracking and fetching message view statistics
 * 
 * Features:
 * - recordView() calls database function with debouncing (3 second delay)
 * - Implements client-side deduplication to avoid duplicate RPC calls
 * - fetchStats() retrieves view statistics (admin only)
 * - Handles errors gracefully
 * - Returns formatted statistics
 */
export function useChannelViewStats(messageId: string) {
  const [stats, setStats] = useState<MessageViewStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Client-side deduplication: track which messages have been viewed
  const viewedMessagesRef = useRef<Set<string>>(new Set());
  
  // Debounce timeout reference
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Record a message view with debouncing and deduplication
   * Only records after user has been viewing for 3 seconds
   * Prevents duplicate recordings for the same message
   */
  const recordView = useCallback(async () => {
    // Client-side deduplication: skip if already viewed
    if (viewedMessagesRef.current.has(messageId)) {
      return;
    }

    // Clear any existing debounce timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Debounce: wait 3 seconds before recording view
    debounceTimeoutRef.current = setTimeout(async () => {
      try {
        // Get current user
        const user = await getCurrentUser();
        if (!user) {
          return;
        }

        // Mark as viewed in client-side cache
        viewedMessagesRef.current.add(messageId);

        // Call database function to record view
        const { error: rpcError } = await supabase.rpc('record_message_view', {
          p_message_id: messageId,
          p_user_id: user.id,
        });

        if (rpcError) {
          logger.error('Error recording message view:', rpcError.message);
          // Remove from cache on error so it can be retried
          viewedMessagesRef.current.delete(messageId);
        }
      } catch (err) {
        logger.error('Error recording message view:', err);
        // Remove from cache on error so it can be retried
        viewedMessagesRef.current.delete(messageId);
      }
    }, 3000); // 3 second delay
  }, [messageId]);

  /**
   * Fetch view statistics for a message
   * Only admins can fetch stats - will throw error for non-admins
   */
  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Get current user
      const user = await getCurrentUser();
      if (!user) {
        setError('You must be logged in to view statistics');
        setLoading(false);
        return;
      }

      // Call database function to get view statistics
      const { data, error: rpcError } = await supabase.rpc('get_message_view_stats', {
        p_message_id: messageId,
        p_requesting_user_id: user.id,
      });

      if (rpcError) {
        logger.error('Error fetching view statistics:', rpcError.message);
        setError(rpcError.message);
        setStats(null);
      } else if (data && data.length > 0) {
        // Format the statistics
        const result = data[0];
        setStats({
          viewCount: result.view_count || 0,
          viewers: result.viewers || [],
        });
      } else {
        // No views yet
        setStats({
          viewCount: 0,
          viewers: [],
        });
      }
    } catch (err) {
      logger.error('Error fetching view statistics:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [messageId]);

  // Cleanup debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return {
    stats,
    recordView,
    fetchStats,
    loading,
    error,
  };
}

import { logger } from '../utils/logger';
import { useState, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { getCurrentUser, getCurrentUserId } from '../utils/authCache';

// Rate limit configuration
const RATE_LIMITS = {
  message: { max: 10, window: 60 },      // 10 messages per minute
  upload: { max: 5, window: 60 },        // 5 uploads per minute
  call: { max: 3, window: 60 },          // 3 calls per minute
  api_request: { max: 100, window: 60 }, // 100 API requests per minute
};

export type RateLimitAction = keyof typeof RATE_LIMITS;

export function useRateLimit() {
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockedUntil, setBlockedUntil] = useState<Date | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  /**
   * Get client IP address from Edge Function
   * Returns a default IP if the function is not deployed
   */
  const getClientIP = useCallback(async (): Promise<string> => {
    try {
      // Use ipify API directly to bypass Supabase Edge Function CORS issues
      const response = await fetch('https://api.ipify.org?format=json');
      if (response.ok) {
        const data = await response.json();
        return data.ip || '127.0.0.1';
      }
      logger.warn('ipify not available, using default IP');
      return '127.0.0.1';
    } catch (err) {
      logger.warn('Error getting IP from ipify:', err);
      return '127.0.0.1';
    }
  }, []);

  /**
   * Check if the current user can perform an action
   * @param action - Type of action to check (message, upload, call, api_request)
   * @returns true if allowed, false if rate limit exceeded
   */
  const checkRateLimit = useCallback(async (action: RateLimitAction): Promise<boolean> => {
    try {
      // Get current user
      const user = await getCurrentUser();
      if (!user) {
        logger.warn('No user found for rate limit check');
        return true; // Allow if no user (shouldn't happen)
      }

      // Get real client IP from Edge Function
      const ipAddress = await getClientIP();

      // Get rate limit config for this action
      const config = RATE_LIMITS[action];
      if (!config) {
        logger.warn(`Unknown rate limit action: ${action}`);
        return true;
      }

      // Call the database function to check rate limit
      const { data, error } = await supabase.rpc('check_rate_limit', {
        p_user_id: user.id,
        p_ip_address: ipAddress,
        p_action_type: action,
        p_max_requests: config.max,
        p_window_seconds: config.window,
      });

      if (error) {
        logger.error('Rate limit check error:', error);
        // On error, allow the action (fail open)
        return true;
      }

      // data is boolean: true = allowed, false = blocked
      if (data === false) {
        setIsBlocked(true);
        const blockedUntilTime = new Date(Date.now() + config.window * 1000);
        setBlockedUntil(blockedUntilTime);
        setLastError(`Rate limit exceeded for ${action}. Please wait ${config.window} seconds.`);
        
        logger.warn(`Rate limit exceeded for ${action}. User: ${user.id}, IP: ${ipAddress}`);
        return false;
      }

      // Reset blocked state if we're allowed
      setIsBlocked(false);
      setBlockedUntil(null);
      setLastError(null);
      return true;
    } catch (err) {
      logger.error('Unexpected error in rate limit check:', err);
      // On unexpected error, allow the action (fail open)
      return true;
    }
  }, [getClientIP]);

  /**
   * Check if user is currently blocked for any action
   */
  const isCurrentlyBlocked = useCallback((): boolean => {
    if (!blockedUntil) return false;
    return new Date() < blockedUntil;
  }, [blockedUntil]);

  /**
   * Get remaining time until unblock (in seconds)
   */
  const getRemainingBlockTime = useCallback((): number => {
    if (!blockedUntil) return 0;
    const remaining = Math.ceil((blockedUntil.getTime() - Date.now()) / 1000);
    return Math.max(0, remaining);
  }, [blockedUntil]);

  /**
   * Clear blocked state (for manual reset)
   */
  const clearBlockedState = useCallback(() => {
    setIsBlocked(false);
    setBlockedUntil(null);
    setLastError(null);
  }, []);

  return {
    checkRateLimit,
    isBlocked,
    blockedUntil,
    lastError,
    isCurrentlyBlocked,
    getRemainingBlockTime,
    clearBlockedState,
  };
}

/**
 * Helper function to format rate limit error message
 */
export function formatRateLimitError(action: RateLimitAction, remainingSeconds: number): string {
  const actionNames: Record<RateLimitAction, string> = {
    message: 'отправку сообщений',
    upload: 'загрузку файлов',
    call: 'звонки',
    api_request: 'API запросы',
  };

  const actionName = actionNames[action] || action;
  
  if (remainingSeconds > 60) {
    const minutes = Math.ceil(remainingSeconds / 60);
    return `Слишком много запросов на ${actionName}. Подождите ${minutes} мин.`;
  }
  
  return `Слишком много запросов на ${actionName}. Подождите ${remainingSeconds} сек.`;
}

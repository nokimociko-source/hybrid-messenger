import { logger } from './logger';
import { supabase } from '../../supabaseClient';
import type { User } from '@supabase/supabase-js';

/**
 * Centralized auth cache to prevent multiple simultaneous getUser() calls
 * This fixes the "Lock broken by another request" error in React Strict Mode
 */

let _cachedUser: User | null = null;
let _cachedUserId: string | null = null;
let _userPromise: Promise<User | null> | null = null;
let _lastFetch: number = 0;
const CACHE_DURATION = 5000; // 5 seconds

/**
 * Get current user with caching
 * Prevents multiple simultaneous auth calls
 */
export async function getCurrentUser(): Promise<User | null> {
  const now = Date.now();

  // Return cached user if still valid
  if (_cachedUser && (now - _lastFetch) < CACHE_DURATION) {
    return _cachedUser;
  }

  // If there's already a pending request, wait for it
  if (_userPromise) {
    return _userPromise;
  }

  // Create new request
  _userPromise = supabase.auth.getUser()
    .then(({ data: { user }, error }) => {
      if (error) {
        if (error.name !== 'AuthSessionMissingError' && error.message !== 'Auth session missing!') {
          logger.error('Auth error:', error);
        }
        return null;
      }

      _cachedUser = user;
      _cachedUserId = user?.id ?? null;
      _lastFetch = Date.now();
      _userPromise = null;

      return user;
    })
    .catch((err) => {
      logger.error('Failed to get user:', err);
      _userPromise = null;
      return null;
    });

  return _userPromise;
}

/**
 * Get current user ID with caching
 * Faster than getCurrentUser() if you only need the ID
 */
export async function getCurrentUserId(): Promise<string | null> {
  const now = Date.now();

  // Return cached ID if still valid
  if (_cachedUserId && (now - _lastFetch) < CACHE_DURATION) {
    return _cachedUserId;
  }

  // Fetch user and return ID
  const user = await getCurrentUser();
  return user?.id ?? null;
}

/**
 * Clear the auth cache
 * Call this on logout or when you need fresh data
 */
export function clearAuthCache(): void {
  _cachedUser = null;
  _cachedUserId = null;
  _userPromise = null;
  _lastFetch = 0;
}

/**
 * Force refresh the auth cache
 * Useful after login or profile updates
 */
export async function refreshAuthCache(): Promise<User | null> {
  clearAuthCache();
  return getCurrentUser();
}

// Clear cache on auth state changes
supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
    clearAuthCache();
  }
});

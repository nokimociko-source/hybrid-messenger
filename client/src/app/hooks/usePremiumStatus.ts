import { logger } from '../utils/logger';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { getCurrentUser, getCurrentUserId } from '../utils/authCache';

interface UsePremiumStatusReturn {
  isPremium: boolean;
  premiumUntil: Date | null;
  loading: boolean;
  checkStatus: () => Promise<void>;
}

// Premium status cache
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let _premiumCache: { isPremium: boolean; premiumUntil: Date | null; timestamp: number } | null = null;

function isCacheValid(): boolean {
  if (!_premiumCache) return false;
  return Date.now() - _premiumCache.timestamp < CACHE_TTL;
}

export function usePremiumStatus(): UsePremiumStatusReturn {
  const [isPremium, setIsPremium] = useState(false);
  const [premiumUntil, setPremiumUntil] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPremiumStatus = useCallback(async () => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        setIsPremium(false);
        setPremiumUntil(null);
        setLoading(false);
        return;
      }

      // Check cache first
      if (isCacheValid() && _premiumCache) {
        setIsPremium(_premiumCache.isPremium);
        setPremiumUntil(_premiumCache.premiumUntil);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_premium_status')
        .select('is_premium, premium_until')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        logger.error('Error fetching premium status:', error);
        setIsPremium(false);
        setPremiumUntil(null);
        _premiumCache = {
          isPremium: false,
          premiumUntil: null,
          timestamp: Date.now(),
        };
      } else if (data) {
        const premiumUntilDate = data.premium_until ? new Date(data.premium_until) : null;

        // Check if premium is still valid
        const isCurrentlyPremium = data.is_premium &&
          (!premiumUntilDate || premiumUntilDate > new Date());

        setIsPremium(isCurrentlyPremium);
        setPremiumUntil(premiumUntilDate);

        // Update cache
        _premiumCache = {
          isPremium: isCurrentlyPremium,
          premiumUntil: premiumUntilDate,
          timestamp: Date.now(),
        };
      }
    } catch (err) {
      logger.error('Error fetching premium status:', err);
      setIsPremium(false);
      setPremiumUntil(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const checkStatus = useCallback(async () => {
    // Force refresh by invalidating cache
    _premiumCache = null;
    setLoading(true);
    await fetchPremiumStatus();
  }, [fetchPremiumStatus]);

  useEffect(() => {
    fetchPremiumStatus();
  }, [fetchPremiumStatus]);

  return {
    isPremium,
    premiumUntil,
    loading,
    checkStatus,
  };
}

import { logger } from '../utils/logger';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { getCurrentUser } from '../utils/authCache';

interface UserPresence {
  user_id: string;
  status: 'online' | 'offline' | 'away';
  last_seen: string;
  updated_at?: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export function useUserPresence() {
  const [presenceMap, setPresenceMap] = useState<Map<string, UserPresence>>(new Map());
  const [realtimePresence, setRealtimePresence] = useState<Set<string>>(new Set());
  
  // Refs to store auth state for the beacon and heartbeats
  const userIdRef = useRef<string | null>(null);
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let heartbeatInterval: any;

    // 1. Sync Auth State to Refs
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        userIdRef.current = session.user.id;
        tokenRef.current = session.access_token;
      } else {
        userIdRef.current = null;
        tokenRef.current = null;
      }
    });

    async function fetchInitialPresence() {
      try {
        // Optimization: Select only needed columns
        const { data, error } = await supabase
          .from('user_presence')
          .select('user_id, status, last_seen, updated_at');

        if (error) throw error;

        if (mounted && data) {
          const map = new Map<string, UserPresence>();
          data.forEach((item) => map.set(item.user_id, item));
          setPresenceMap(map);
        }
      } catch (error) {
        logger.error('Error fetching presence:', error);
      }
    }

    async function ensurePublicProfile(user: any) {
      try {
        const { data: profile } = await supabase
          .from('users')
          .select('id')
          .eq('id', user.id)
          .maybeSingle(); // Use maybeSingle to avoid error if not found

        if (!profile) {
          logger.warn(`Public profile missing for user ${user.id}, creating...`);
          await supabase.from('users').insert({
            id: user.id,
            username: user.user_metadata?.username || user.email?.split('@')[0] || `user_${user.id.substring(0, 8)}`,
            status: 'offline'
          });
        }
      } catch (err) {
        logger.error('Error ensuring public profile:', err);
      }
    }

    async function updateOwnPresence(status: 'online' | 'offline' | 'away' = 'online') {
      const userId = userIdRef.current;
      if (!userId) return;

      try {
        await supabase
          .from('user_presence')
          .upsert({
            user_id: userId,
            status,
            last_seen: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });
      } catch (error) {
        logger.error('Error updating presence:', error);
      }
    }

    // 2. Fixed Beacon using Fetch with keepalive
    const sendOfflineBeacon = () => {
      const userId = userIdRef.current;
      const token = tokenRef.current;
      if (!userId || !SUPABASE_URL || !SUPABASE_ANON_KEY || !token) return;

      const url = `${SUPABASE_URL}/rest/v1/user_presence?user_id=eq.${userId}`;
      
      // Use fetch with keepalive: true. 
      // This guarantees headers (Auth) are sent, unlike sendBeacon.
      fetch(url, {
        method: 'PATCH', // or POST depending on your upsert logic, usually PATCH for updates
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal' // Save bandwidth
        },
        body: JSON.stringify({
          status: 'offline',
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
        keepalive: true
      }).catch(e => logger.error('Presence beacon failed:', e));
    };

    const handleVisibilityChange = () => {
      // Only update if we have a user
      if (!userIdRef.current) return;
      
      if (document.visibilityState === 'hidden') {
        updateOwnPresence('away');
      } else {
        updateOwnPresence('online');
      }
    };

    const handleBeforeUnload = () => {
      sendOfflineBeacon();
    };

    // Initialize
    fetchInitialPresence();

    getCurrentUser().then(user => {
      if (user && mounted) {
        userIdRef.current = user.id;
        ensurePublicProfile(user).then(() => {
          updateOwnPresence('online');
        });
      }
    });

    const presenceChannel = supabase.channel('global_presence');

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const onlineUserIds = new Set<string>();
        
        Object.values(state).forEach((presences: any) => {
          presences.forEach((p: any) => {
            if (p.user_id) onlineUserIds.add(p.user_id);
          });
        });
        
        if (mounted) setRealtimePresence(onlineUserIds);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_presence' }, (payload) => {
        if (!mounted) return;
        const newDoc = payload.new as UserPresence;
        if (newDoc) {
          setPresenceMap((prev) => {
            const next = new Map(prev);
            next.set(newDoc.user_id, newDoc);
            return next;
          });
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const userId = userIdRef.current;
          if (userId) {
            await presenceChannel.track({
              user_id: userId,
              online_at: new Date().toISOString(),
            });
          }
        }
      });

    // 3. Efficient Heartbeat
    heartbeatInterval = setInterval(() => {
      // Only run if we have a user ID
      if (userIdRef.current) {
        updateOwnPresence('online');
      }
    }, 30000);

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearInterval(heartbeatInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      // Final cleanup on unmount (e.g. navigating away without closing tab)
      updateOwnPresence('offline');
      supabase.removeChannel(presenceChannel);
    };
  }, []);

  const isOnline = (userId: string): boolean => {
    // 1. Realtime check (Instant)
    if (realtimePresence.has(userId)) return true;

    // 2. Database Fallback (Grace period)
    const presence = presenceMap.get(userId);
    if (!presence) return false;

    const updatedAt = new Date(presence.updated_at || presence.last_seen);
    const now = new Date();
    const diffSeconds = (now.getTime() - updatedAt.getTime()) / 1000;

    // Consider online if status is 'online' and updated within last 90s
    return presence.status === 'online' && diffSeconds < 90;
  };

  const getLastSeen = (userId: string): string | null => {
    return presenceMap.get(userId)?.last_seen || null;
  };

  return {
    presenceMap,
    isOnline,
    getLastSeen,
  };
}

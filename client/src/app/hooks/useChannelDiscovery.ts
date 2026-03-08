import { logger } from '../utils/logger';
import { useState, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { getCurrentUser, getCurrentUserId } from '../utils/authCache';
import { ChannelDiscoveryItem } from '../types/channels';

export function useChannelDiscovery() {
  const [channels, setChannels] = useState<ChannelDiscoveryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const searchChannels = useCallback(async (query: string) => {
    setLoading(true);
    setSearchQuery(query);

    try {
      const user = await getCurrentUser();
      
      let queryBuilder = supabase
        .from('rooms')
        .select(`
          id,
          name,
          avatar_url,
          topic,
          member_count,
          is_public
        `)
        .eq('type', 'channel')
        .eq('is_public', true);

      if (query) {
        queryBuilder = queryBuilder.or(`name.ilike.%${query}%,topic.ilike.%${query}%`);
      }

      const { data: channelsData, error } = await queryBuilder
        .order('member_count', { ascending: false })
        .limit(50);

      if (error) {
        logger.error('Error searching channels:', error.message);
        setChannels([]);
        return;
      }

      if (channelsData && user) {
        // Check subscription status for each channel
        const { data: subscriptions } = await supabase
          .from('room_members')
          .select('room_id')
          .eq('user_id', user.id)
          .in('room_id', channelsData.map(c => c.id));

        const subscribedIds = new Set(subscriptions?.map(s => s.room_id) || []);

        setChannels(
          channelsData.map(channel => ({
            id: channel.id,
            name: channel.name,
            avatar_url: channel.avatar_url || undefined,
            topic: channel.topic || undefined,
            subscriber_count: channel.member_count || 0,
            category: undefined, // Category column not yet applied to database
            is_subscribed: subscribedIds.has(channel.id),
          }))
        );
      } else {
        setChannels([]);
      }
    } catch (error) {
      logger.error('Error in searchChannels:', error);
      setChannels([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { channels, searchChannels, loading, searchQuery };
}

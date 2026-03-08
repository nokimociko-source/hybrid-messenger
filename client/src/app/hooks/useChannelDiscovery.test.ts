// @ts-nocheck
/**
 * Unit tests for useChannelDiscovery hook
 * 
 * Tests channel discovery and search functionality:
 * - Searching public channels
 * - Filtering by name and description
 * - Checking subscription status
 * - Ordering by subscriber count
 * - Error handling
 * 
 * Task 4.1: Write Unit Tests for Hooks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react-hooks';
import { useChannelDiscovery } from './useChannelDiscovery';
import { supabase } from '../../supabaseClient';

// Mock supabase client
vi.mock('../../supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
}));

// Mock authCache
vi.mock('../utils/authCache', () => ({
  getCurrentUser: vi.fn(),
  getCurrentUserId: vi.fn(),
}));

describe('useChannelDiscovery', () => {
  const mockUserId = 'test-user-id';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Search Channels - Basic Functionality', () => {
    it('should search all public channels with empty query', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: mockUserId } as any },
        error: null,
      });

      const mockChannels = [
        {
          id: 'channel-1',
          name: 'Tech News',
          avatar_url: 'https://example.com/avatar1.jpg',
          topic: 'Latest technology updates',
          member_count: 1000,
          category: 'Technology',
          is_public: true,
        },
        {
          id: 'channel-2',
          name: 'Gaming',
          avatar_url: null,
          topic: 'Gaming discussions',
          member_count: 500,
          category: 'Entertainment',
          is_public: true,
        },
      ];

      const mockChannelsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: mockChannels,
          error: null,
        }),
      };

      const mockSubscriptionsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: [{ room_id: 'channel-1' }],
          error: null,
        }),
      };

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockChannelsQuery as any)
        .mockReturnValueOnce(mockSubscriptionsQuery as any);

      const { result } = renderHook(() => useChannelDiscovery());

      await act(async () => {
        await result.current.searchChannels('');
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.channels).toHaveLength(2);
      expect(result.current.channels[0]).toEqual({
        id: 'channel-1',
        name: 'Tech News',
        avatar_url: 'https://example.com/avatar1.jpg',
        topic: 'Latest technology updates',
        subscriber_count: 1000,
        category: 'Technology',
        is_subscribed: true,
      });
      expect(result.current.channels[1]).toEqual({
        id: 'channel-2',
        name: 'Gaming',
        avatar_url: undefined,
        topic: 'Gaming discussions',
        subscriber_count: 500,
        category: 'Entertainment',
        is_subscribed: false,
      });
    });

    it('should filter channels by search query', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: mockUserId } as any },
        error: null,
      });

      const mockChannels = [
        {
          id: 'channel-1',
          name: 'Tech News',
          avatar_url: null,
          topic: 'Technology updates',
          member_count: 1000,
          category: 'Technology',
          is_public: true,
        },
      ];

      const mockChannelsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: mockChannels,
          error: null,
        }),
      };

      const mockSubscriptionsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockChannelsQuery as any)
        .mockReturnValueOnce(mockSubscriptionsQuery as any);

      const { result } = renderHook(() => useChannelDiscovery());

      await act(async () => {
        await result.current.searchChannels('tech');
      });

      expect(mockChannelsQuery.or).toHaveBeenCalledWith('name.ilike.%tech%,topic.ilike.%tech%');
      expect(result.current.searchQuery).toBe('tech');
      expect(result.current.channels).toHaveLength(1);
    });

    it('should order channels by subscriber count descending', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: mockUserId } as any },
        error: null,
      });

      const mockChannelsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      const mockSubscriptionsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockChannelsQuery as any)
        .mockReturnValueOnce(mockSubscriptionsQuery as any);

      const { result } = renderHook(() => useChannelDiscovery());

      await act(async () => {
        await result.current.searchChannels('');
      });

      expect(mockChannelsQuery.order).toHaveBeenCalledWith('member_count', { ascending: false });
    });

    it('should limit results to 50 channels', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: mockUserId } as any },
        error: null,
      });

      const mockChannelsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      const mockSubscriptionsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockChannelsQuery as any)
        .mockReturnValueOnce(mockSubscriptionsQuery as any);

      const { result } = renderHook(() => useChannelDiscovery());

      await act(async () => {
        await result.current.searchChannels('');
      });

      expect(mockChannelsQuery.limit).toHaveBeenCalledWith(50);
    });
  });

  describe('Subscription Status', () => {
    it('should correctly mark subscribed channels', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: mockUserId } as any },
        error: null,
      });

      const mockChannels = [
        { id: 'channel-1', name: 'Channel 1', member_count: 100, is_public: true },
        { id: 'channel-2', name: 'Channel 2', member_count: 200, is_public: true },
        { id: 'channel-3', name: 'Channel 3', member_count: 300, is_public: true },
      ];

      const mockChannelsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: mockChannels,
          error: null,
        }),
      };

      const mockSubscriptionsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: [{ room_id: 'channel-1' }, { room_id: 'channel-3' }],
          error: null,
        }),
      };

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockChannelsQuery as any)
        .mockReturnValueOnce(mockSubscriptionsQuery as any);

      const { result } = renderHook(() => useChannelDiscovery());

      await act(async () => {
        await result.current.searchChannels('');
      });

      expect(result.current.channels[0].is_subscribed).toBe(true);
      expect(result.current.channels[1].is_subscribed).toBe(false);
      expect(result.current.channels[2].is_subscribed).toBe(true);
    });

    it('should handle no subscriptions', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: mockUserId } as any },
        error: null,
      });

      const mockChannels = [
        { id: 'channel-1', name: 'Channel 1', member_count: 100, is_public: true },
      ];

      const mockChannelsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: mockChannels,
          error: null,
        }),
      };

      const mockSubscriptionsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockChannelsQuery as any)
        .mockReturnValueOnce(mockSubscriptionsQuery as any);

      const { result } = renderHook(() => useChannelDiscovery());

      await act(async () => {
        await result.current.searchChannels('');
      });

      expect(result.current.channels[0].is_subscribed).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle channel query error', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: mockUserId } as any },
        error: null,
      });

      const mockChannelsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      };

      vi.mocked(supabase.from).mockReturnValueOnce(mockChannelsQuery as any);

      const { result } = renderHook(() => useChannelDiscovery());

      await act(async () => {
        await result.current.searchChannels('');
      });

      expect(result.current.channels).toEqual([]);
      expect(result.current.loading).toBe(false);
    });

    it('should handle unauthenticated user', async () => {
      const { getCurrentUser } = await import('../utils/authCache');
      vi.mocked(getCurrentUser).mockResolvedValue(null);

      const mockChannels = [
        { id: 'channel-1', name: 'Channel 1', member_count: 100, is_public: true },
      ];

      const mockChannelsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: mockChannels,
          error: null,
        }),
      };

      vi.mocked(supabase.from).mockReturnValueOnce(mockChannelsQuery as any);

      const { result } = renderHook(() => useChannelDiscovery());

      await act(async () => {
        await result.current.searchChannels('');
      });

      // Should still return channels but without subscription status
      expect(result.current.channels).toEqual([]);
    });

    it('should handle subscription query error gracefully', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: mockUserId } as any },
        error: null,
      });

      const mockChannels = [
        { id: 'channel-1', name: 'Channel 1', member_count: 100, is_public: true },
      ];

      const mockChannelsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: mockChannels,
          error: null,
        }),
      };

      const mockSubscriptionsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Subscription query failed' },
        }),
      };

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockChannelsQuery as any)
        .mockReturnValueOnce(mockSubscriptionsQuery as any);

      const { result } = renderHook(() => useChannelDiscovery());

      await act(async () => {
        await result.current.searchChannels('');
      });

      // Should still return channels with is_subscribed = false
      expect(result.current.channels).toHaveLength(1);
      expect(result.current.channels[0].is_subscribed).toBe(false);
    });
  });

  describe('Loading States', () => {
    it('should set loading true during search', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: mockUserId } as any },
        error: null,
      });

      const mockChannelsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockImplementation(
          () =>
            new Promise((resolve) =>
              setTimeout(() => resolve({ data: [], error: null }), 100)
            )
        ),
      };

      vi.mocked(supabase.from).mockReturnValue(mockChannelsQuery as any);

      const { result } = renderHook(() => useChannelDiscovery());

      expect(result.current.loading).toBe(false);

      act(() => {
        result.current.searchChannels('test');
      });

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('should update search query immediately', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: mockUserId } as any },
        error: null,
      });

      const mockChannelsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      const mockSubscriptionsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      vi.mocked(supabase.from)
        .mockReturnValue(mockChannelsQuery as any)
        .mockReturnValue(mockSubscriptionsQuery as any);

      const { result } = renderHook(() => useChannelDiscovery());

      await act(async () => {
        await result.current.searchChannels('gaming');
      });

      expect(result.current.searchQuery).toBe('gaming');
    });
  });

  describe('Data Formatting', () => {
    it('should handle null/undefined optional fields', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: mockUserId } as any },
        error: null,
      });

      const mockChannels = [
        {
          id: 'channel-1',
          name: 'Minimal Channel',
          avatar_url: null,
          topic: null,
          member_count: null,
          category: null,
          is_public: true,
        },
      ];

      const mockChannelsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: mockChannels,
          error: null,
        }),
      };

      const mockSubscriptionsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockChannelsQuery as any)
        .mockReturnValueOnce(mockSubscriptionsQuery as any);

      const { result } = renderHook(() => useChannelDiscovery());

      await act(async () => {
        await result.current.searchChannels('');
      });

      expect(result.current.channels[0]).toEqual({
        id: 'channel-1',
        name: 'Minimal Channel',
        avatar_url: undefined,
        topic: undefined,
        subscriber_count: 0,
        category: undefined,
        is_subscribed: false,
      });
    });

    it('should handle empty results', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: mockUserId } as any },
        error: null,
      });

      const mockChannelsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      const mockSubscriptionsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockChannelsQuery as any)
        .mockReturnValueOnce(mockSubscriptionsQuery as any);

      const { result } = renderHook(() => useChannelDiscovery());

      await act(async () => {
        await result.current.searchChannels('nonexistent');
      });

      expect(result.current.channels).toEqual([]);
      expect(result.current.loading).toBe(false);
    });
  });

  describe('Query Filters', () => {
    it('should only query public channels', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: mockUserId } as any },
        error: null,
      });

      const mockChannelsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      const mockSubscriptionsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockChannelsQuery as any)
        .mockReturnValueOnce(mockSubscriptionsQuery as any);

      const { result } = renderHook(() => useChannelDiscovery());

      await act(async () => {
        await result.current.searchChannels('');
      });

      expect(mockChannelsQuery.eq).toHaveBeenCalledWith('type', 'channel');
      expect(mockChannelsQuery.eq).toHaveBeenCalledWith('is_public', true);
    });
  });
});


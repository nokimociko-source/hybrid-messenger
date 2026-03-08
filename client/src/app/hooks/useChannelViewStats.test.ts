// @ts-nocheck
/**
 * Unit tests for useChannelViewStats hook
 * 
 * Tests view tracking and statistics for channel messages:
 * - Recording message views with debouncing
 * - Client-side deduplication
 * - Fetching view statistics (admin only)
 * - Error handling
 * 
 * Task 4.1: Write Unit Tests for Hooks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor as any, act } from '@testing-library/react';
import { useChannelViewStats } from './useChannelViewStats';
import { supabase } from '../../supabaseClient';

// Mock supabase client
vi.mock('../../supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    rpc: vi.fn(),
  },
}));

describe('useChannelViewStats', () => {
  const mockMessageId = 'test-message-id';
  const mockUserId = 'test-user-id';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Record View - Debouncing', () => {
    it('should debounce view recording by 3 seconds', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: mockUserId } as any },
        error: null,
      });

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: null,
      });

      const { result } = renderHook(() => useChannelViewStats(mockMessageId));

      // Call recordView
      act(() => {
        result.current.recordView();
      });

      // Should not call RPC immediately
      expect(supabase.rpc).not.toHaveBeenCalled();

      // Advance time by 2 seconds - still should not call
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(supabase.rpc).not.toHaveBeenCalled();

      // Advance time by 1 more second (total 3 seconds)
      await act(async () => {
        vi.advanceTimersByTime(1000);
        await Promise.resolve(); // Allow promises to resolve
      });

      // Now it should have called RPC
      await (waitFor as any)(() => {
        expect(supabase.rpc).toHaveBeenCalledWith('record_message_view', {
          p_message_id: mockMessageId,
          p_user_id: mockUserId,
        });
      });
    });

    it('should cancel previous debounce on multiple calls', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: mockUserId } as any },
        error: null,
      });

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: null,
      });

      const { result } = renderHook(() => useChannelViewStats(mockMessageId));

      // Call recordView multiple times
      act(() => {
        result.current.recordView();
      });

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      act(() => {
        result.current.recordView(); // Reset debounce
      });

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      // Should not have called yet (only 2 seconds since last call)
      expect(supabase.rpc).not.toHaveBeenCalled();

      // Advance 1 more second
      await act(async () => {
        vi.advanceTimersByTime(1000);
        await Promise.resolve();
      });

      // Should have called only once
      await (waitFor as any)(() => {
        expect(supabase.rpc).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Record View - Deduplication', () => {
    it('should not record view for same message twice', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: mockUserId } as any },
        error: null,
      });

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: null,
      });

      const { result } = renderHook(() => useChannelViewStats(mockMessageId));

      // First call
      act(() => {
        result.current.recordView();
      });

      await act(async () => {
        vi.advanceTimersByTime(3000);
        await Promise.resolve();
      });

      await (waitFor as any)(() => {
        expect(supabase.rpc).toHaveBeenCalledTimes(1);
      });

      // Second call - should be deduplicated
      act(() => {
        result.current.recordView();
      });

      await act(async () => {
        vi.advanceTimersByTime(3000);
        await Promise.resolve();
      });

      // Should still be called only once
      expect(supabase.rpc).toHaveBeenCalledTimes(1);
    });

    it('should allow recording different messages', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: mockUserId } as any },
        error: null,
      });

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: null,
      });

      // First message
      const { result: result1 } = renderHook(() => useChannelViewStats('message-1'));

      act(() => {
        result1.current.recordView();
      });

      await act(async () => {
        vi.advanceTimersByTime(3000);
        await Promise.resolve();
      });

      await (waitFor as any)(() => {
        expect(supabase.rpc).toHaveBeenCalledWith('record_message_view', {
          p_message_id: 'message-1',
          p_user_id: mockUserId,
        });
      });

      // Second message
      const { result: result2 } = renderHook(() => useChannelViewStats('message-2'));

      act(() => {
        result2.current.recordView();
      });

      await act(async () => {
        vi.advanceTimersByTime(3000);
        await Promise.resolve();
      });

      await (waitFor as any)(() => {
        expect(supabase.rpc).toHaveBeenCalledWith('record_message_view', {
          p_message_id: 'message-2',
          p_user_id: mockUserId,
        });
      });

      expect(supabase.rpc).toHaveBeenCalledTimes(2);
    });
  });

  describe('Record View - Error Handling', () => {
    it('should handle unauthenticated user', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null as any },
        error: null,
      });

      const { result } = renderHook(() => useChannelViewStats(mockMessageId));

      act(() => {
        result.current.recordView();
      });

      await act(async () => {
        vi.advanceTimersByTime(3000);
        await Promise.resolve();
      });

      // Should not call RPC for unauthenticated user
      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    it('should handle RPC error and allow retry', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: mockUserId } as any },
        error: null,
      });

      // First call fails
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      const { result } = renderHook(() => useChannelViewStats(mockMessageId));

      // First attempt
      act(() => {
        result.current.recordView();
      });

      await act(async () => {
        vi.advanceTimersByTime(3000);
        await Promise.resolve();
      });

      await (waitFor as any)(() => {
        expect(supabase.rpc).toHaveBeenCalledTimes(1);
      });

      // Second call succeeds
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: null,
        error: null,
      });

      // Should allow retry after error
      act(() => {
        result.current.recordView();
      });

      await act(async () => {
        vi.advanceTimersByTime(3000);
        await Promise.resolve();
      });

      await (waitFor as any)(() => {
        expect(supabase.rpc).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Fetch Stats - Success Cases', () => {
    it('should fetch view statistics successfully', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: mockUserId } as any },
        error: null,
      });

      const mockStats = {
        view_count: 42,
        viewers: [
          {
            user_id: 'viewer-1',
            username: 'user1',
            avatar_url: 'https://example.com/avatar1.jpg',
            viewed_at: '2024-01-01T12:00:00Z',
          },
          {
            user_id: 'viewer-2',
            username: 'user2',
            avatar_url: null,
            viewed_at: '2024-01-01T12:05:00Z',
          },
        ],
      };

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: [mockStats],
        error: null,
      });

      const { result } = renderHook(() => useChannelViewStats(mockMessageId));

      await act(async () => {
        await result.current.fetchStats();
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.stats).toEqual({
        viewCount: 42,
        viewers: mockStats.viewers,
      });

      expect(supabase.rpc).toHaveBeenCalledWith('get_message_view_stats', {
        p_message_id: mockMessageId,
        p_requesting_user_id: mockUserId,
      });
    });

    it('should handle zero views', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: mockUserId } as any },
        error: null,
      });

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: [],
        error: null,
      });

      const { result } = renderHook(() => useChannelViewStats(mockMessageId));

      await act(async () => {
        await result.current.fetchStats();
      });

      expect(result.current.stats).toEqual({
        viewCount: 0,
        viewers: [],
      });
    });

    it('should handle null viewers array', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: mockUserId } as any },
        error: null,
      });

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: [{ view_count: 5, viewers: null }],
        error: null,
      });

      const { result } = renderHook(() => useChannelViewStats(mockMessageId));

      await act(async () => {
        await result.current.fetchStats();
      });

      expect(result.current.stats).toEqual({
        viewCount: 5,
        viewers: [],
      });
    });
  });

  describe('Fetch Stats - Error Handling', () => {
    it('should handle unauthenticated user', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null as any },
        error: null,
      });

      const { result } = renderHook(() => useChannelViewStats(mockMessageId));

      await act(async () => {
        await result.current.fetchStats();
      });

      expect(result.current.error).toBe('You must be logged in to view statistics');
      expect(result.current.stats).toBeNull();
    });

    it('should handle permission denied error (non-admin)', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: mockUserId } as any },
        error: null,
      });

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'Only admins can view message statistics' },
      });

      const { result } = renderHook(() => useChannelViewStats(mockMessageId));

      await act(async () => {
        await result.current.fetchStats();
      });

      expect(result.current.error).toBe('Only admins can view message statistics');
      expect(result.current.stats).toBeNull();
    });

    it('should handle database error', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: mockUserId } as any },
        error: null,
      });

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' },
      });

      const { result } = renderHook(() => useChannelViewStats(mockMessageId));

      await act(async () => {
        await result.current.fetchStats();
      });

      expect(result.current.error).toBe('Database connection failed');
      expect(result.current.stats).toBeNull();
    });
  });

  describe('Loading States', () => {
    it('should set loading true during fetch', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: mockUserId } as any },
        error: null,
      });

      vi.mocked(supabase.rpc).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ data: [], error: null }), 100)
          )
      );

      const { result } = renderHook(() => useChannelViewStats(mockMessageId));

      expect(result.current.loading).toBe(false);

      act(() => {
        result.current.fetchStats();
      });

      expect(result.current.loading).toBe(true);

      await (waitFor as any)(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('should clear error on new fetch', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: mockUserId } as any },
        error: null,
      });

      // First call fails
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: null,
        error: { message: 'Error' },
      });

      const { result } = renderHook(() => useChannelViewStats(mockMessageId));

      await act(async () => {
        await result.current.fetchStats();
      });

      expect(result.current.error).toBe('Error');

      // Second call succeeds
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: [{ view_count: 10, viewers: [] }],
        error: null,
      });

      await act(async () => {
        await result.current.fetchStats();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.stats?.viewCount).toBe(10);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup debounce timeout on unmount', () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: mockUserId } as any },
        error: null,
      });

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: null,
      });

      const { result, unmount } = renderHook(() => useChannelViewStats(mockMessageId));

      act(() => {
        result.current.recordView();
      });

      // Unmount before debounce completes
      unmount();

      // Advance time
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      // Should not call RPC after unmount
      expect(supabase.rpc).not.toHaveBeenCalled();
    });
  });
});


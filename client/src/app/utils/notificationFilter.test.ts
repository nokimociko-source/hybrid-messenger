// @ts-nocheck
/**
 * Unit tests for notification filter utility
 * 
 * Tests the integration of mute settings with notification delivery,
 * ensuring mentions bypass mute settings.
 * 
 * Requirements: 5.7, 10.9
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { shouldSendNotification } from './notificationFilter';
import { supabase } from '../../supabaseClient';

// Mock supabase
vi.mock('../../supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('notificationFilter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('shouldSendNotification', () => {
    it('should allow notification when chat is not muted', async () => {
      // Mock: no mute setting exists
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          }),
        }),
      });
      (supabase.from as any) = mockFrom;

      const result = await shouldSendNotification(
        'room-123',
        'Hello world',
        'user-456',
        'testuser'
      );

      expect(result).toBe(true);
    });

    it('should block notification when chat is muted and no mention', async () => {
      // Mock: chat is muted indefinitely
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: 'mute-1',
                  user_id: 'user-456',
                  room_id: 'room-123',
                  is_indefinite: true,
                  muted_until: null,
                },
                error: null,
              }),
            }),
          }),
        }),
      });
      (supabase.from as any) = mockFrom;

      const result = await shouldSendNotification(
        'room-123',
        'Hello world',
        'user-456',
        'testuser'
      );

      expect(result).toBe(false);
    });

    it('should allow notification when chat is muted but message mentions user', async () => {
      // Mock: chat is muted indefinitely
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: 'mute-1',
                  user_id: 'user-456',
                  room_id: 'room-123',
                  is_indefinite: true,
                  muted_until: null,
                },
                error: null,
              }),
            }),
          }),
        }),
      });
      (supabase.from as any) = mockFrom;

      const result = await shouldSendNotification(
        'room-123',
        'Hey @testuser, check this out!',
        'user-456',
        'testuser'
      );

      expect(result).toBe(true);
    });

    it('should allow notification when mute has expired', async () => {
      // Mock: chat was muted but expiry has passed
      const pastDate = new Date(Date.now() - 1000 * 60 * 60).toISOString(); // 1 hour ago
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: 'mute-1',
                  user_id: 'user-456',
                  room_id: 'room-123',
                  is_indefinite: false,
                  muted_until: pastDate,
                },
                error: null,
              }),
            }),
          }),
        }),
      });
      (supabase.from as any) = mockFrom;

      const result = await shouldSendNotification(
        'room-123',
        'Hello world',
        'user-456',
        'testuser'
      );

      expect(result).toBe(true);
    });

    it('should block notification when mute has not expired', async () => {
      // Mock: chat is muted until future date
      const futureDate = new Date(Date.now() + 1000 * 60 * 60).toISOString(); // 1 hour from now
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: 'mute-1',
                  user_id: 'user-456',
                  room_id: 'room-123',
                  is_indefinite: false,
                  muted_until: futureDate,
                },
                error: null,
              }),
            }),
          }),
        }),
      });
      (supabase.from as any) = mockFrom;

      const result = await shouldSendNotification(
        'room-123',
        'Hello world',
        'user-456',
        'testuser'
      );

      expect(result).toBe(false);
    });

    it('should allow notification on database error (fail open)', async () => {
      // Mock: database error
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Database error' },
              }),
            }),
          }),
        }),
      });
      (supabase.from as any) = mockFrom;

      const result = await shouldSendNotification(
        'room-123',
        'Hello world',
        'user-456',
        'testuser'
      );

      expect(result).toBe(true);
    });

    it('should handle multiple mentions correctly', async () => {
      // Mock: chat is muted indefinitely
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: 'mute-1',
                  user_id: 'user-456',
                  room_id: 'room-123',
                  is_indefinite: true,
                  muted_until: null,
                },
                error: null,
              }),
            }),
          }),
        }),
      });
      (supabase.from as any) = mockFrom;

      const result = await shouldSendNotification(
        'room-123',
        'Hey @alice and @testuser, check this out!',
        'user-456',
        'testuser'
      );

      expect(result).toBe(true);
    });

    it('should not trigger on partial username match', async () => {
      // Mock: chat is muted indefinitely
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: 'mute-1',
                  user_id: 'user-456',
                  room_id: 'room-123',
                  is_indefinite: true,
                  muted_until: null,
                },
                error: null,
              }),
            }),
          }),
        }),
      });
      (supabase.from as any) = mockFrom;

      // Message mentions @test but user is @testuser
      const result = await shouldSendNotification(
        'room-123',
        'Hey @test, check this out!',
        'user-456',
        'testuser'
      );

      expect(result).toBe(false);
    });
  });
});


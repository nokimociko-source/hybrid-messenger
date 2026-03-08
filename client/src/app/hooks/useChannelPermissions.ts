import { logger } from '../utils/logger';
import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { ChannelPermissions } from '../types/channels';
import { getCurrentUser } from '../utils/authCache';

/**
 * Hook to check user permissions in channels
 * 
 * For channels:
 * - Only creators and admins can post messages
 * - Only creators can manage admins
 * - Only creators and admins can view statistics
 * - Only creators and admins can modify settings
 * 
 * For regular rooms:
 * - Permissions are based on room_members.permissions
 */
export function useChannelPermissions(roomId: string) {
  const [permissions, setPermissions] = useState<ChannelPermissions>({
    canPost: false,
    canManageAdmins: false,
    canViewStats: false,
    canModifySettings: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Skip if no roomId
    if (!roomId) {
      setLoading(false);
      return;
    }

    let mounted = true;
    let currentUserId: string | undefined;

    async function checkPermissions(isInitialLoad: boolean = false) {
      try {
        // 1. Only show loading spinner on initial load, not on background updates to prevent UI flicker
        if (mounted && isInitialLoad) {
          setLoading(true);
          setError(null);
        }

        // Get current user
        const user = await getCurrentUser();
        if (!user) {
          if (mounted) {
            setPermissions({
              canPost: false,
              canManageAdmins: false,
              canViewStats: false,
              canModifySettings: false,
            });
            setLoading(false);
          }
          return;
        }
        currentUserId = user.id;

        // 2. Fetch Room and Member data in parallel to reduce loading time
        const [roomsResult, membersResult] = await Promise.all([
          supabase
            .from('rooms')
            .select('type, created_by, target_user_id')
            .eq('id', roomId)
            .limit(1),
          supabase
            .from('room_members')
            .select('role, permissions')
            .eq('room_id', roomId)
            .eq('user_id', user.id)
            .limit(1),
        ]);

        const { data: rooms, error: roomError } = roomsResult;
        const { data: members, error: memberError } = membersResult;

        if (roomError) {
          logger.error('Error fetching room for permissions:', roomError.message);
          if (mounted) {
            setError(roomError.message);
            setLoading(false);
          }
          return;
        }

        const room = rooms && rooms.length > 0 ? rooms[0] : null;

        if (!room) {
          if (mounted) {
            setLoading(false);
          }
          return;
        }

        // Check if this is a self-chat (Избранное)
        const isSelfChat = room.created_by === currentUserId && room.target_user_id === currentUserId;
        if (isSelfChat) {
          // Self-chat always allows posting
          if (mounted) {
            setPermissions({
              canPost: true,
              canManageAdmins: false,
              canViewStats: false,
              canModifySettings: false,
            });
            setLoading(false);
          }
          return;
        }

        // Handle RLS "No rows found" gracefully for members
        // PGRST116 is the error code for 0 rows when single() is used, though we use limit(1)
        if (memberError) {
          logger.error('Error fetching member for permissions:', memberError.message);
          if (mounted) {
            setError(memberError.message);
            setLoading(false);
          }
          return;
        }

        const member = members && members.length > 0 ? members[0] : null;

        // If user is not a member of this room, set default permissions
        if (!member) {
          if (mounted) {
            setPermissions({
              canPost: false,
              canManageAdmins: false,
              canViewStats: false,
              canModifySettings: false,
            });
            setLoading(false);
          }
          return;
        }

        // Calculate permissions based on room type
        if (room.type === 'channel') {
          // Channel permissions: only admins can post and manage
          const isAdmin = member.role === 'creator' || member.role === 'admin';
          const isCreator = member.role === 'creator';

          if (mounted) {
            setPermissions({
              canPost: isAdmin,
              canManageAdmins: isCreator,
              canViewStats: isAdmin,
              canModifySettings: isAdmin,
            });
          }
        } else {
          // Regular room permissions based on member permissions
          const memberPermissions = member.permissions || {};

          if (mounted) {
            setPermissions({
              canPost: memberPermissions.can_send_messages ?? true,
              canManageAdmins: member.role === 'creator',
              canViewStats: false, // View stats only for channels
              canModifySettings: memberPermissions.can_change_info ?? false,
            });
          }
        }

        if (mounted) {
          setLoading(false);
        }
      } catch (err) {
        logger.error('Unexpected error checking permissions:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Unknown error');
          setLoading(false);
        }
      }
    }

    checkPermissions(true);

    // 3. Subscribe to room and member changes for real-time permission updates
    const channel = supabase
      .channel(`room-permissions:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rooms',
          filter: `id=eq.${roomId}`,
        },
        () => {
          if (mounted) checkPermissions();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*', // Handles INSERT (join), UPDATE (role change), DELETE (kick/leave)
          schema: 'public',
          table: 'room_members',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          // 4. Optimization: Only refetch if the change affects the current user
          const changedUserId = (payload.new as any)?.user_id || (payload.old as any)?.user_id;
          
          if (!changedUserId || changedUserId === currentUserId) {
             if (mounted) checkPermissions();
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  return { permissions, loading, error };
}

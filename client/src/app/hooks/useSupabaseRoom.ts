import { logger } from '../utils/logger';
import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Room, ROOM_SELECT } from './supabaseHelpers';
import { processRoom } from './useSupabaseRooms';

export function useSupabaseRoom(roomId?: string) {
    const [room, setRoom] = useState<Room | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!roomId) {
            setRoom(null);
            setLoading(false);
            return;
        }

        let mounted = true;
        setLoading(true);

        async function fetchRoom() {
            try {
                const { data: userData } = await supabase.auth.getUser();
                const currentUserId = userData.user?.id;

                // Use .limit(1) to gracefully handle RLS "No rows found" scenarios
                const { data: rooms, error } = await supabase
                    .from('rooms')
                    .select(ROOM_SELECT)
                    .eq('id', roomId)
                    .limit(1);

                if (error) {
                    logger.error('Error fetching room:', error.message);
                    if (mounted) setLoading(false);
                    return;
                }

                const data = rooms && rooms.length > 0 ? rooms[0] : null;

                if (mounted && data) {
                    // Fetch the latest message
                    const { data: lastMessages } = await supabase
                        .from('messages')
                        .select('id, content, file_name, user_id, created_at, read_by')
                        .eq('room_id', roomId)
                        .order('created_at', { ascending: false })
                        .limit(1);

                    const lastMessage = lastMessages && lastMessages.length > 0 ? lastMessages[0] : undefined;
                    setRoom(processRoom(data, currentUserId || '', lastMessage));
                } else if (mounted && !data) {
                    setRoom(null);
                }
            } catch (err) {
                logger.error('Unexpected error in useSupabaseRoom:', err);
            } finally {
                if (mounted) setLoading(false);
            }
        }

        fetchRoom();

        // Subscribe to ROOM updates (e.g., name change, avatar change)
        const roomChannel = supabase
            .channel(`room-data:${roomId}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'rooms',
                filter: `id=eq.${roomId}`
            }, () => {
                if (mounted) fetchRoom();
            })
            .subscribe();

        // Subscribe to MESSAGE updates to refresh the 'lastMessage' preview
        const messageChannel = supabase
            .channel(`room-messages:${roomId}`)
            .on('postgres_changes', {
                event: 'INSERT', // Only care about new messages for the preview
                schema: 'public',
                table: 'messages',
                filter: `room_id=eq.${roomId}`
            }, () => {
                // A new message was sent, re-fetch room to update lastMessage state
                if (mounted) fetchRoom();
            })
            .subscribe();

        return () => {
            mounted = false;
            supabase.removeChannel(roomChannel);
            supabase.removeChannel(messageChannel);
        };
    }, [roomId]);

    return { room, loading };
}

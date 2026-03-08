import { logger } from '../utils/logger';
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { decryptText } from '../utils/encryption';
import { Room, ROOM_SELECT, getCurrentUser } from './supabaseHelpers';
import { useEncryption } from '../context/EncryptionContext';

export function processRoom(room: any, currentUserId: string | null, lastMessage?: any): Room {
    let other_user = undefined;
    if (room.is_direct && currentUserId) {
        other_user = room.created_by === currentUserId
            ? room.target_user
            : room.created_by_user;
    }

    // Обработка последнего сообщения
    let last_message_preview = undefined;
    let last_message_at = undefined;
    let last_message_sender_is_self = false;
    let last_message_read = false;

    if (lastMessage) {
        last_message_at = lastMessage.created_at;
        last_message_sender_is_self = lastMessage.user_id === currentUserId;
        last_message_read = lastMessage.read_by?.includes(currentUserId) || false;

        if (lastMessage.content) {
            last_message_preview = lastMessage.content.length > 50
                ? lastMessage.content.substring(0, 50) + '...'
                : lastMessage.content;
        } else if (lastMessage.file_name) {
            last_message_preview = `📎 ${lastMessage.file_name}`;
        } else {
            last_message_preview = 'Медиа-файл';
        }
    } else {
        last_message_at = room.last_message_at;
        last_message_preview = room.last_message_preview || undefined;
    }

    const roomIsSavedMessages = room.is_direct && room.created_by === room.target_user_id;

    // Централизованная логика имени
    let displayName = room.name;
    if (roomIsSavedMessages) {
        displayName = 'Избранное';
    } else if (room.is_direct) {
        displayName = other_user?.username || 'Пользователь';
    }

    if (!displayName || displayName === 'Direct' || displayName === 'Group') {
        displayName = 'Безымянный чат';
    }

    return {
        ...room,
        other_user,
        displayName,
        last_message_preview,
        last_message_at: last_message_at || room.created_at,
        last_message_sender_is_self,
        last_message_read,
        roomIsSavedMessages,
    } as Room;
}

export function useSupabaseRooms() {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);
    const { masterKey, e2eEnabled, getRoomKey } = useEncryption();
    const refreshDebounceRef = useRef<any>(null);
    const mountedRef = useRef(true);

    const fetchRooms = useCallback(async () => {
        const { id: currentUserId } = await getCurrentUser();
        if (!currentUserId) {
            if (mountedRef.current) setLoading(false);
            return;
        }

        // 1. Ensure "Saved Messages" exists
        try {
            const { data: savedRooms } = await supabase
                .from('rooms')
                .select('id')
                .eq('is_direct', true)
                .eq('created_by', currentUserId)
                .eq('target_user_id', currentUserId)
                .limit(1);

            if (!savedRooms || savedRooms.length === 0) {
                logger.info('Creating Saved Messages room for user:', currentUserId);
                await supabase.rpc('start_direct_chat', { p_target_user_id: currentUserId });
                // Refresh list immediately after creation 
                // We use a small delay to allow DB consistency
                setTimeout(() => { if (mountedRef.current) fetchRooms(); }, 500);
                return;
            }
        } catch (err) {
            logger.error('Error ensuring Saved Messages:', err);
        }

        // 2. Fetch memberships
        const { data: membershipData, error: membershipError } = await supabase
            .from('room_members')
            .select('room_id')
            .eq('user_id', currentUserId);

        if (membershipError) {
            logger.error('Error fetching memberships:', membershipError.message);
            if (mountedRef.current) setLoading(false);
            return;
        }

        const userRoomIds = membershipData?.map(m => m.room_id) ?? [];
        if (userRoomIds.length === 0) {
            if (mountedRef.current) {
                setRooms([]);
                setLoading(false);
            }
            return;
        }

        // 3. Fetch room details
        const { data, error } = await supabase
            .from('rooms')
            .select(ROOM_SELECT)
            .in('id', userRoomIds)
            .order('last_message_at', { ascending: false, nullsFirst: false });

        if (error) {
            logger.error('Error fetching rooms:', error.message);
            if (mountedRef.current) setLoading(false);
            return;
        }

        if (mountedRef.current && data) {
            const validLastMessageIds = data.map(r => r.last_message_id).filter(Boolean);
            let lastMessages: any[] = [];

            if (validLastMessageIds.length > 0) {
                const { data: messagesData } = await supabase
                    .from('messages')
                    .select('id, room_id, content, file_name, user_id, created_at, read_by, key_version')
                    .in('id', validLastMessageIds);
                if (messagesData) lastMessages = messagesData;
            }

            const lastMessageByRoom = new Map();
            const { decryptIfNeeded } = e2eEnabled
                ? await import('../utils/e2eEncryption')
                : { decryptIfNeeded: null };

            for (const msg of lastMessages) {
                let content = msg.content;
                try {
                    // AES Decryption
                    if (masterKey) {
                        const room = data.find(r => r.id === msg.room_id);
                        const isEncryptedRoom = room?.is_encrypted || (room?.is_direct && room?.created_by === room?.target_user_id);
                        if (isEncryptedRoom) {
                            const sessionKey = await getRoomKey(msg.room_id, msg.key_version || 1);
                            if (sessionKey && content && content.length > 20 && !content.includes(' ')) {
                                try {
                                    content = await decryptText(content, sessionKey);
                                } catch (e) { /* ignore */ }
                            }
                        }
                    }
                    // E2EE Decryption
                    if (e2eEnabled && decryptIfNeeded && content?.startsWith('🔒') && currentUserId) {
                        content = await decryptIfNeeded(content, currentUserId);
                    }
                } catch (e) { /* ignore */ }

                lastMessageByRoom.set(msg.room_id, { ...msg, content });
            }

            const processedRooms = await Promise.all(data.map(async r => {
                const roomObj = processRoom(r, currentUserId, lastMessageByRoom.get(r.id));
                // Fallback preview decryption
                if (masterKey && roomObj.last_message_preview?.startsWith('catlover:')) {
                    try {
                        const sessionKey = await getRoomKey(r.id, 1);
                        if (sessionKey) {
                            roomObj.last_message_preview = await decryptText(roomObj.last_message_preview, sessionKey);
                        }
                    } catch (e) { /* ignore */ }
                }
                return roomObj;
            }));

            if (mountedRef.current) {
                setRooms(processedRooms);
                setLoading(false);
            }
        } else if (mountedRef.current) {
            setLoading(false);
        }
    }, [masterKey, e2eEnabled, getRoomKey]);

    useEffect(() => {
        mountedRef.current = true;

        const debouncedFetch = () => {
            if (refreshDebounceRef.current) clearTimeout(refreshDebounceRef.current);
            refreshDebounceRef.current = setTimeout(() => {
                if (mountedRef.current) fetchRooms();
            }, 500);
        };

        fetchRooms();

        let roomChannel: any;
        getCurrentUser().then(({ id: currentUserId }) => {
            if (!currentUserId || !mountedRef.current) return;

            roomChannel = supabase
                .channel(`public:rooms_updates:${currentUserId}`)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, debouncedFetch)
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'room_members',
                    filter: `user_id=eq.${currentUserId}`
                }, debouncedFetch)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, debouncedFetch)
                .subscribe();
        });

        return () => {
            mountedRef.current = false;
            if (refreshDebounceRef.current) clearTimeout(refreshDebounceRef.current);
            if (roomChannel) supabase.removeChannel(roomChannel);
        };
    }, [fetchRooms]);

    const createRoom = useCallback(async (
        name: string,
        type: 'direct' | 'community' | 'channel' = 'community',
        isPublic?: boolean
    ) => {
        const { id, meta } = await getCurrentUser();
        if (!id) return null;

        try {
            await supabase.from('users').upsert({
                id,
                username: meta?.username || meta?.email?.split('@')[0] || 'Unknown',
            }, { onConflict: 'id' });

            const roomData: any = { name, type, created_by: id };
            if (type === 'channel' && isPublic !== undefined) roomData.is_public = isPublic;

            const { data: roomResult, error: roomError } = await supabase
                .from('rooms')
                .insert(roomData)
                .select()
                .single();

            if (roomError) return null;

            await supabase.from('room_members').insert({
                room_id: roomResult.id,
                user_id: id,
                role: 'creator'
            });

            return roomResult;
        } catch (err) {
            return null;
        }
    }, []);

    const createDirectRoom = useCallback(async (targetUserId: string) => {
        try {
            const { id: currentUserId, meta } = await getCurrentUser();
            if (!currentUserId) return null;

            await supabase.from('users').upsert({
                id: currentUserId,
                username: meta?.username || meta?.email?.split('@')[0] || 'Unknown',
            }, { onConflict: 'id' });

            const { data: roomId, error } = await supabase.rpc('start_direct_chat', {
                p_target_user_id: targetUserId
            });

            if (error || !roomId) return null;

            const { data: room } = await supabase
                .from('rooms')
                .select(ROOM_SELECT)
                .eq('id', roomId)
                .single();

            return room;
        } catch (err) {
            return null;
        }
    }, []);

    return { rooms, loading, createRoom, createDirectRoom };
}

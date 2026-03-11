import { useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import { Message } from '../supabaseHelpers';
import { notifyNewMessage } from '../../utils/platformNotifications';

export function useMessageSync(
    roomId: string | undefined,
    masterKey: string | null,
    currentUserRef: React.MutableRefObject<string | null>,
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
    decryptMessagesIfNeeded: (msgs: any[]) => Promise<Message[]>
) {
    useEffect(() => {
        if (!roomId) return;

        let mounted = true;

        const channel = supabase
            .channel(`public:messages:${roomId}:${masterKey ? 'secure' : 'plain'}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
                async (payload) => {
                    if (!mounted) return;

                    const { data: userData } = await supabase
                        .from('users')
                        .select('username, avatar_url')
                        .eq('id', payload.new.user_id)
                        .single();

                    const msgs = await decryptMessagesIfNeeded([payload.new]);
                    const newMessage = {
                        ...msgs[0],
                        users: userData || { username: 'Unknown' },
                    } as Message;

                    setMessages((prev) => {
                        if (prev.some(m => m.id === newMessage.id)) return prev;
                        return [...prev, newMessage];
                    });

                    const currentUserId = currentUserRef.current;
                    if (currentUserId && payload.new.user_id !== currentUserId) {
                        notifyNewMessage(userData?.username || 'Неизвестный', newMessage.content || '📎 Медиа', roomId);
                    }
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
                async (payload) => {
                    if (!mounted) return;
                    const msgs = await decryptMessagesIfNeeded([payload.new]);
                    const updatedMsg = msgs[0];

                    setMessages((prev) =>
                        prev.map((msg) => (msg.id === updatedMsg.id ? { ...msg, ...updatedMsg } : msg))
                    );
                }
            )
            .on(
                'postgres_changes',
                { event: 'DELETE', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
                (payload) => {
                    if (!mounted) return;
                    setMessages((prev) => prev.filter((msg) => msg.id !== payload.old.id));
                }
            )
            .subscribe();

        return () => {
            mounted = false;
            supabase.removeChannel(channel);
        };
    }, [roomId, masterKey, decryptMessagesIfNeeded, setMessages, currentUserRef]);
}

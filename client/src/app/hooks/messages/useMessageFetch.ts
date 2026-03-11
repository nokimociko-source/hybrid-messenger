import { useState, useCallback } from 'react';
import { supabase } from '../../../supabaseClient';
import { Message } from '../supabaseHelpers';
import { logger } from '../../utils/logger';
import { decryptText } from '../../utils/encryption';

export function useMessageFetch(
    roomId: string | undefined,
    masterKey: string | null,
    e2eEnabled: boolean,
    getRoomKey: (roomId: string, version: number) => Promise<string | null>
) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);

    const decryptMessagesIfNeeded = useCallback(async (msgs: any[]): Promise<Message[]> => {
        if (!masterKey && !e2eEnabled) return msgs;

        let isEncryptedRoom = false;
        if (masterKey && roomId) {
            const { data: roomData } = await supabase.from('rooms').select('created_by, target_user_id, is_direct, is_encrypted').eq('id', roomId).single();
            if (roomData) {
                const isSavedMessages = !!(roomData.is_direct && roomData.created_by === roomData.target_user_id);
                isEncryptedRoom = isSavedMessages || !!roomData.is_encrypted;
            }
        }

        try {
            const { decryptIfNeeded } = e2eEnabled ? await import('../../utils/e2eEncryption') : { decryptIfNeeded: null };
            const { data: { user } } = await supabase.auth.getUser();
            const currentUserId = user?.id;
            if (!currentUserId) return msgs;

            const decryptedMessages = await Promise.all(
                msgs.map(async (msg) => {
                    let content = msg.content;
                    if (!content) return msg;

                    if (isEncryptedRoom && masterKey) {
                        try {
                            const version = msg.key_version || 1;
                            const sessionKey = roomId ? await getRoomKey(roomId, version) : null;

                            if (sessionKey) {
                                if (content.length > 20 && !content.includes(' ')) {
                                    try {
                                        const decrypted = await decryptText(content, sessionKey);
                                        content = decrypted;
                                    } catch (e) {
                                        logger.warn(`❌ Failed to decrypt message ${msg.id}`);
                                    }
                                }
                            }
                        } catch (e) { /* ignore */ }
                    }

                    if (e2eEnabled && decryptIfNeeded && content.startsWith('🔒')) {
                        try {
                            content = await decryptIfNeeded(content, currentUserId);
                        } catch (e) { /* ignore */ }
                    }

                    return { ...msg, content };
                })
            );

            return decryptedMessages;
        } catch (err) {
            logger.error('Decryption error:', err);
            return msgs;
        }
    }, [masterKey, e2eEnabled, roomId, getRoomKey]);

    const fetchMessages = useCallback(async () => {
        if (!roomId) {
            setMessages([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        const { data, error } = await supabase
            .from('messages')
            .select(`*, users!user_id (username, avatar_url)`)
            .eq('room_id', roomId)
            .order('created_at', { ascending: true });

        if (error) {
            logger.error('Error fetching messages:', error.message);
            setLoading(false);
            return;
        }

        const decrypted = await decryptMessagesIfNeeded(data || []);
        setMessages(decrypted);
        setLoading(false);
    }, [roomId, decryptMessagesIfNeeded]);

    return { messages, setMessages, loading, setLoading, fetchMessages, decryptMessagesIfNeeded };
}

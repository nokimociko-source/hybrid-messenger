import { useState, useEffect, useRef } from 'react';
import { useEncryption } from '../context/EncryptionContext';
import { useRateLimit } from './useRateLimit';
import { getCurrentUser } from './supabaseHelpers';
import { Message } from './supabaseHelpers';

// Sub-hooks
import { useMessageFetch } from './messages/useMessageFetch';
import { useMessageSync } from './messages/useMessageSync';
import { useMessageActions, NewMessageInput } from './messages/useMessageActions';

export function useSupabaseMessages(roomId?: string) {
    const encryption = useEncryption();
    const rateLimit = useRateLimit();
    const [currentUser, setCurrentUser] = useState<string | null>(null);
    const currentUserRef = useRef<string | null>(null);

    // Initial auth
    useEffect(() => {
        getCurrentUser().then(({ id }) => {
            setCurrentUser(id);
            currentUserRef.current = id;
        });
    }, []);

    // 1. Fetch logic
    const { 
        messages, 
        setMessages, 
        loading, 
        fetchMessages, 
        decryptMessagesIfNeeded 
    } = useMessageFetch(roomId, encryption.masterKey, encryption.e2eEnabled, encryption.getRoomKey);

    // 2. Sync logic (Realtime)
    useMessageSync(roomId, encryption.masterKey, currentUserRef, setMessages, decryptMessagesIfNeeded);

    // 3. Actions logic
    const { 
        sendMessage, 
        updateMessage, 
        deleteMessage, 
        addReaction,
        pinMessage,
        unpinMessage,
        forwardMessage
    } = useMessageActions(roomId, messages, setMessages, encryption, rateLimit);

    // Initial load
    useEffect(() => {
        fetchMessages();
    }, [fetchMessages]);

    // Legacy/Extra methods (can be moved to actions later)
    const insertMessages = async (input: NewMessageInput | NewMessageInput[]) => {
        // Implement if still needed, or proxy to actions
    };

    const uploadMedia = async (file: File | Blob, onProgress?: (p: number) => void) => {
        const { uploadMediaFile } = await import('./supabaseHelpers');
        return uploadMediaFile(file as File, onProgress);
    };

    return { 
        messages, 
        loading, 
        sendMessage, 
        insertMessages, 
        updateMessage, 
        deleteMessage, 
        uploadMedia, 
        addReaction, 
        pinMessage,
        unpinMessage,
        forwardMessage,
        currentUser, 
        rateLimitError: rateLimit.lastError 
    };
}

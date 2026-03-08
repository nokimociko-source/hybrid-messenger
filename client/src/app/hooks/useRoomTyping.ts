import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { getCurrentUser } from '../utils/authCache';
import { useEncryption } from '../context/EncryptionContext';
import { RealtimeChannel } from '@supabase/supabase-js';
import { encryptText, decryptText } from '../utils/encryption';

export function useRoomTyping(roomId: string) {
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const { masterKey, getRoomKey, currentRoomVersion, encrypt, decrypt } = useEncryption();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!roomId) return;

    // Presence-based typing indicator
    const channel = supabase.channel(`room_presence_${roomId}`, {
      config: {
        presence: {
          key: roomId,
        },
      },
    });

    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, async () => {
        const state = channel.presenceState();
        const users: string[] = [];

        // In presence, state is an object where keys are the presence keys (roomId in our case)
        // and values are arrays of presence objects.
        const presences = state[roomId] || [];

        for (const presence of presences) {
          const p = presence as any;
          if (p.is_typing) {
            // Check if it's encrypted
            if (p.encrypted_payload && masterKey) {
              try {
                const version = p.key_version;
                const key = await getRoomKey(roomId, version);
                if (key) {
                  const decrypted = await decryptText(p.encrypted_payload, key);
                  // We encrypted a fixed string "typing". If it decrypts to that, it's valid.
                  if (decrypted === "typing") {
                    users.push(p.user_id);
                  }
                }
              } catch (e) {
                // Failed to decrypt, skip this presence
              }
            } else if (!p.is_encrypted) { // If not encrypted, just add the user
              users.push(p.user_id);
            }
          }
        }
        setTypingUsers(Array.from(new Set(users)));
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [roomId, masterKey, getRoomKey]);

  const startTyping = useCallback(async () => {
    if (!roomId || !channelRef.current) return;

    const user = await getCurrentUser();
    if (!user) return;

    const payload: any = {
      user_id: user.id,
      is_typing: true,
      is_encrypted: false
    };

    // If E2EE is active, add an encrypted guard
    if (masterKey) {
      const version = currentRoomVersion(roomId);
      const key = await getRoomKey(roomId, version);
      if (key) {
        payload.is_encrypted = true;
        payload.key_version = version;
        // We encrypt a fixed string "typing" to prove we have the room key
        payload.encrypted_payload = await encryptText("typing", key);
      }
    }

    channelRef.current.track(payload);

    // Set/Reset inactivity timeout
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 7000); // 7 seconds of inactivity
  }, [roomId, masterKey, getRoomKey, currentRoomVersion]);

  const stopTyping = useCallback(async () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    if (!channelRef.current) return;
    channelRef.current.untrack();
  }, []);

  return {
    typingUsers,
    startTyping,
    stopTyping,
    isTyping: typingUsers.length > 0,
  };
}

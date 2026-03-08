import { useRoomTyping } from './useRoomTyping';

// DEPRECATED: Use useRoomTyping instead.
export function useTypingIndicator(roomId?: string) {
    return useRoomTyping(roomId || '');
}

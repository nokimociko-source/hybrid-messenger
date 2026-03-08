import { useState, useEffect } from 'react';

// DEPRECATED: Please use useRoomTyping(roomId) inside individual components.
// This hook was causing significant HTTP request spam.
export function useAllRoomsTyping() {
  return {
    typingByRoom: new Map<string, string[]>(),
    getTypingUsers: (roomId: string) => [] as string[],
    isTyping: (roomId: string) => false,
  };
}

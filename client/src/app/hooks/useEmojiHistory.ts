import { logger } from '../utils/logger';
import { useState, useEffect, useCallback } from 'react';

interface EmojiHistoryStorage {
  version: number;
  emojis: string[];
  lastUpdated: string;
}

interface UseEmojiHistoryReturn {
  recentEmojis: string[];
  addEmoji: (emoji: string) => void;
  clearHistory: () => void;
}

const STORAGE_KEY = 'catlover_emoji_history';
const STORAGE_VERSION = 1;
const DEFAULT_MAX_SIZE = 30;

function loadFromStorage(maxSize: number): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const data: EmojiHistoryStorage = JSON.parse(stored);

    // Handle version migrations if needed
    if (data.version !== STORAGE_VERSION) {
      // For now, just clear old versions
      return [];
    }

    // Ensure we don't exceed max size
    return data.emojis.slice(0, maxSize);
  } catch (err) {
    logger.error('Error loading emoji history:', err);
    return [];
  }
}

function saveToStorage(emojis: string[]): void {
  try {
    const data: EmojiHistoryStorage = {
      version: STORAGE_VERSION,
      emojis,
      lastUpdated: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    logger.error('Error saving emoji history:', err);
  }
}

export function useEmojiHistory(maxSize: number = DEFAULT_MAX_SIZE): UseEmojiHistoryReturn {
  const [recentEmojis, setRecentEmojis] = useState<string[]>(() => loadFromStorage(maxSize));

  // Sync with localStorage on mount
  useEffect(() => {
    const stored = loadFromStorage(maxSize);
    setRecentEmojis(stored);
  }, [maxSize]);

  const addEmoji = useCallback((emoji: string) => {
    setRecentEmojis((prev) => {
      // Remove emoji if it already exists
      const filtered = prev.filter((e) => e !== emoji);
      
      // Add emoji to the beginning
      const updated = [emoji, ...filtered];
      
      // Limit to maxSize
      const limited = updated.slice(0, maxSize);
      
      // Save to localStorage
      saveToStorage(limited);
      
      return limited;
    });
  }, [maxSize]);

  const clearHistory = useCallback(() => {
    setRecentEmojis([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      logger.error('Error clearing emoji history:', err);
    }
  }, []);

  return {
    recentEmojis,
    addEmoji,
    clearHistory,
  };
}

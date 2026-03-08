/**
 * EmojiSearchEngine - Filters and searches emojis by keywords
 * 
 * Supports Russian and English language search with debouncing
 * per Requirements 5.2, 5.3, 5.4, 5.7, 9.5
 */

import { IEmoji } from '../plugins/emoji';

export interface EmojiSearchResult {
  emoji: string;
  name: string;
  nameRu: string;
  aliases: string[];
  tags: string[];
  category: string;
}

/**
 * Russian translations for common emoji keywords
 * This can be extended with more translations as needed
 */
const russianKeywords: Record<string, string[]> = {
  // Smileys & Emotion
  smile: ['улыбка', 'улыбаться'],
  happy: ['счастливый', 'радостный'],
  sad: ['грустный', 'печальный'],
  laugh: ['смех', 'смеяться'],
  love: ['любовь', 'сердце'],
  heart: ['сердце', 'сердечко'],
  kiss: ['поцелуй', 'целовать'],
  angry: ['злой', 'сердитый'],
  cry: ['плакать', 'слезы'],
  fire: ['огонь', 'пламя'],

  // People & Body
  hand: ['рука', 'ладонь'],
  thumbs: ['палец', 'большой'],
  wave: ['махать', 'привет'],
  clap: ['хлопать', 'аплодисменты'],
  pray: ['молиться', 'молитва'],

  // Animals & Nature
  cat: ['кот', 'кошка'],
  dog: ['собака', 'пес'],
  bear: ['медведь'],
  bird: ['птица'],
  tree: ['дерево'],
  flower: ['цветок'],
  sun: ['солнце'],
  moon: ['луна'],
  star: ['звезда'],

  // Food & Drink
  food: ['еда', 'пища'],
  pizza: ['пицца'],
  burger: ['бургер', 'гамбургер'],
  coffee: ['кофе'],
  tea: ['чай'],
  cake: ['торт', 'пирог'],
  fruit: ['фрукт'],

  // Activities
  sport: ['спорт'],
  music: ['музыка'],
  game: ['игра'],
  party: ['вечеринка', 'праздник'],

  // Travel & Places
  car: ['машина', 'автомобиль'],
  plane: ['самолет'],
  home: ['дом'],
  building: ['здание'],

  // Objects
  phone: ['телефон'],
  computer: ['компьютер'],
  book: ['книга'],
  money: ['деньги'],
  gift: ['подарок'],

  // Symbols
  check: ['галочка', 'проверка'],
  cross: ['крест', 'крестик'],
  question: ['вопрос'],
  warning: ['предупреждение'],
};

export class EmojiSearchEngine {
  private static readonly MAX_RESULTS = 100;
  private static debounceTimer: NodeJS.Timeout | null = null;
  private static readonly DEBOUNCE_DELAY = 200; // ms

  /**
   * Searches emojis by keyword with debouncing
   * Returns results within 200ms per requirement 5.7
   */
  static search(
    emojis: IEmoji[],
    query: string,
    callback: (results: IEmoji[]) => void
  ): void {
    // Clear previous timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Debounce the search
    this.debounceTimer = setTimeout(() => {
      const results = this.searchSync(emojis, query);
      callback(results);
    }, this.DEBOUNCE_DELAY);
  }

  /**
   * Synchronous search without debouncing
   * Useful for immediate results or testing
   */
  static searchSync(emojis: IEmoji[], query: string): IEmoji[] {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const normalizedQuery = query.toLowerCase().trim();
    const results: IEmoji[] = [];

    for (const emoji of emojis) {
      if (results.length >= this.MAX_RESULTS) {
        break;
      }

      if (this.matchesQuery(emoji, normalizedQuery)) {
        results.push(emoji);
      }
    }

    return results;
  }

  /**
   * Checks if an emoji matches the search query
   * Matches against shortcodes, tags, and Russian translations
   */
  private static matchesQuery(emoji: IEmoji, query: string): boolean {
    // Match against shortcode
    if (emoji.shortcode && emoji.shortcode.toLowerCase().includes(query)) {
      return true;
    }

    // Match against all shortcodes/aliases
    if (emoji.shortcodes) {
      for (const shortcode of emoji.shortcodes) {
        if (shortcode.toLowerCase().includes(query)) {
          return true;
        }
      }
    }

    // Match against tags
    if (emoji.tags) {
      for (const tag of emoji.tags) {
        if (tag.toLowerCase().includes(query)) {
          return true;
        }
      }
    }

    // Match against label (emoji name)
    if (emoji.label && emoji.label.toLowerCase().includes(query)) {
      return true;
    }

    // Match against Russian translations
    if (this.matchesRussianKeyword(emoji, query)) {
      return true;
    }

    return false;
  }

  /**
   * Checks if emoji matches Russian keyword
   */
  private static matchesRussianKeyword(emoji: IEmoji, query: string): boolean {
    // Check shortcode and tags against Russian keywords
    const emojiKeywords = [
      emoji.shortcode,
      ...(emoji.shortcodes || []),
      ...(emoji.tags || []),
    ].filter(Boolean);

    for (const keyword of emojiKeywords) {
      const russianTranslations = russianKeywords[(keyword as string).toLowerCase()];
      if (russianTranslations) {
        for (const translation of russianTranslations) {
          if (translation.includes(query)) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Cancels any pending debounced search
   */
  static cancelSearch(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  /**
   * Converts IEmoji to EmojiSearchResult format
   */
  static toSearchResult(emoji: IEmoji): EmojiSearchResult {
    const russianName = this.getRussianName(emoji);

    return {
      emoji: emoji.unicode || emoji.hexcode || '',
      name: emoji.label || emoji.shortcode || '',
      nameRu: russianName,
      aliases: emoji.shortcodes || [],
      tags: emoji.tags || [],
      category: this.getCategoryName(emoji.group),
    };
  }

  /**
   * Gets Russian name for emoji based on keywords
   */
  private static getRussianName(emoji: IEmoji): string {
    const keyword = emoji.shortcode?.toLowerCase();
    if (keyword && russianKeywords[keyword]) {
      return russianKeywords[keyword][0];
    }
    return emoji.label || emoji.shortcode || '';
  }

  /**
   * Gets category name from group ID
   */
  private static getCategoryName(group?: number): string {
    const categories: Record<number, string> = {
      0: 'smileys',
      1: 'people',
      3: 'animals',
      4: 'food',
      5: 'travel',
      6: 'activities',
      7: 'objects',
      8: 'symbols',
      9: 'flags',
    };
    return categories[group || 8] || 'symbols';
  }
}

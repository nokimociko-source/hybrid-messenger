export enum EmojiGroupId {
    People = 'people',
    Nature = 'nature',
    Food = 'food',
    Activity = 'activity',
    Travel = 'travel',
    Object = 'object',
    Symbol = 'symbol',
    Flag = 'flag'
}

export interface IEmoji {
    unicode: string;
    hexcode?: string;
    shortcode?: string;
    shortcodes?: string[];
    label?: string;
    tags?: string[];
    group?: number;
}

export const emojis: IEmoji[] = [
    { unicode: '😀', tags: ['smile', 'happy'] },
    { unicode: '😂', tags: ['laugh', 'tears'] },
    { unicode: '😎', tags: ['cool', 'glasses'] },
    { unicode: '👋', tags: ['wave', 'hello'] },
    { unicode: '🐶', tags: ['dog', 'animal'] },
    { unicode: '🐱', tags: ['cat', 'animal'] },
    { unicode: '🍕', tags: ['pizza', 'food'] },
    { unicode: '🍔', tags: ['burger', 'food'] },
    { unicode: '⚽', tags: ['soccer', 'activity'] },
    { unicode: '🎮', tags: ['game', 'activity'] },
    { unicode: '💡', tags: ['idea', 'object'] },
    { unicode: '💻', tags: ['computer', 'object'] },
    { unicode: '❤️', tags: ['love', 'symbol'] },
    { unicode: '✨', tags: ['sparkles', 'symbol'] }
];

export const emojiGroups = [
    {
        id: EmojiGroupId.People,
        emojis: [{ unicode: '😀' }, { unicode: '😂' }, { unicode: '😎' }, { unicode: '👋' }]
    },
    {
        id: EmojiGroupId.Nature,
        emojis: [{ unicode: '🐶' }, { unicode: '🐱' }]
    },
    {
        id: EmojiGroupId.Food,
        emojis: [{ unicode: '🍕' }, { unicode: '🍔' }]
    },
    {
        id: EmojiGroupId.Activity,
        emojis: [{ unicode: '⚽' }, { unicode: '🎮' }]
    },
    {
        id: EmojiGroupId.Object,
        emojis: [{ unicode: '💡' }, { unicode: '💻' }]
    },
    {
        id: EmojiGroupId.Symbol,
        emojis: [{ unicode: '❤️' }, { unicode: '✨' }]
    },
    // Coming soon: Premium Emojis logic
    {
        id: 'premium' as any,
        emojis: []
    }
];

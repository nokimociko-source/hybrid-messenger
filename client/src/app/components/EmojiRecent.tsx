import React, { memo } from 'react';

interface EmojiRecentProps {
  recentEmojis: string[];
  onEmojiSelect: (emoji: string) => void;
}

// Default popular emojis to show when history is empty
const DEFAULT_EMOJIS = [
  '😀', '😂', '❤️', '👍', '🎉', '🔥', '✨', '💯',
  '😊', '🥰', '😎', '🤔', '👏', '🙏', '💪', '🎊',
  '😍', '🤗', '😘', '🥳', '🌟', '💖', '🎈', '🌈'
];

export const EmojiRecent = memo(function EmojiRecent({ recentEmojis, onEmojiSelect }: EmojiRecentProps) {
  const emojisToDisplay = recentEmojis.length > 0 ? recentEmojis : DEFAULT_EMOJIS;
  const isShowingDefaults = recentEmojis.length === 0;

  return (
    <div style={{
      padding: '12px',
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
    }}>
      <div style={{
        fontSize: '12px',
        color: 'rgba(255, 255, 255, 0.5)',
        marginBottom: '8px',
        fontWeight: 500
      }}>
        {isShowingDefaults ? 'Популярные' : 'Недавние'}
      </div>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(8, 1fr)',
        gap: '4px'
      }}>
        {emojisToDisplay.slice(0, 24).map((emoji, index) => (
          <div
            key={`recent-emoji-${index}-${emoji}`}
            onClick={() => onEmojiSelect(emoji)}
            style={{
              fontSize: '28px',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s',
              aspectRatio: '1',
              background: 'transparent'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(0, 242, 255, 0.15)';
              e.currentTarget.style.transform = 'scale(1.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            {emoji}
          </div>
        ))}
      </div>
    </div>
  );
});

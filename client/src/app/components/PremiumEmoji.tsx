import React, { useState, memo } from 'react';
import { Icon, Icons } from 'folds';

interface PremiumEmojiData {
  id: string;
  name: string;
  nameRu: string;
  animationUrl: string;
  previewUrl: string;
  category: string;
}

interface PremiumEmojiProps {
  isPremium: boolean;
  onSelect: (emojiId: string) => void;
  onUpgradeClick: () => void;
  loading?: boolean;
  error?: Error | null;
}

// Mock premium emojis for now - in production these would come from the database
const PREMIUM_EMOJIS: PremiumEmojiData[] = [
  {
    id: 'premium-1',
    name: 'Party',
    nameRu: 'Вечеринка',
    animationUrl: '',
    previewUrl: '🎉',
    category: 'celebration'
  },
  {
    id: 'premium-2',
    name: 'Fire',
    nameRu: 'Огонь',
    animationUrl: '',
    previewUrl: '🔥',
    category: 'emotion'
  },
  {
    id: 'premium-3',
    name: 'Heart',
    nameRu: 'Сердце',
    animationUrl: '',
    previewUrl: '❤️',
    category: 'emotion'
  },
  {
    id: 'premium-4',
    name: 'Star',
    nameRu: 'Звезда',
    animationUrl: '',
    previewUrl: '⭐',
    category: 'celebration'
  },
  {
    id: 'premium-5',
    name: 'Rocket',
    nameRu: 'Ракета',
    animationUrl: '',
    previewUrl: '🚀',
    category: 'objects'
  },
  {
    id: 'premium-6',
    name: 'Crown',
    nameRu: 'Корона',
    animationUrl: '',
    previewUrl: '👑',
    category: 'objects'
  },
  {
    id: 'premium-7',
    name: 'Lightning',
    nameRu: 'Молния',
    animationUrl: '',
    previewUrl: '⚡',
    category: 'nature'
  },
  {
    id: 'premium-8',
    name: 'Rainbow',
    nameRu: 'Радуга',
    animationUrl: '',
    previewUrl: '🌈',
    category: 'nature'
  }
];

export const PremiumEmoji = memo(function PremiumEmoji({ 
  isPremium, 
  onSelect, 
  onUpgradeClick,
  loading = false,
  error = null
}: PremiumEmojiProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const handleEmojiClick = (emojiId: string) => {
    if (isPremium) {
      onSelect(emojiId);
    } else {
      onUpgradeClick();
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        gap: '12px',
        minHeight: '200px'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid rgba(255, 215, 0, 0.2)',
          borderTop: '3px solid rgba(255, 215, 0, 0.8)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <div style={{ 
          color: 'rgba(255, 255, 255, 0.6)', 
          fontSize: '14px',
          textAlign: 'center'
        }}>
          Загрузка премиум эмодзи...
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        gap: '12px',
        minHeight: '200px'
      }}>
        <div style={{ 
          fontSize: '48px',
          opacity: 0.6
        }}>
          ⚠️
        </div>
        <div style={{ 
          color: 'rgba(255, 100, 100, 0.8)', 
          fontSize: '14px',
          textAlign: 'center',
          fontWeight: 500
        }}>
          Ошибка загрузки премиум эмодзи
        </div>
        <div style={{ 
          color: 'rgba(255, 255, 255, 0.4)', 
          fontSize: '12px',
          textAlign: 'center',
          maxWidth: '250px'
        }}>
          {error.message || 'Не удалось загрузить премиум эмодзи'}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      padding: '12px'
    }}>
      {!isPremium && (
        <div style={{
          marginBottom: '12px',
          padding: '12px',
          background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 140, 0, 0.1) 100%)',
          border: '1px solid rgba(255, 215, 0, 0.3)',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Icon size="200" src={Icons.Lock} style={{ color: 'rgba(255, 215, 0, 0.8)' }} />
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: '12px',
              color: 'rgba(255, 215, 0, 0.9)',
              fontWeight: 500
            }}>
              Премиум эмодзи
            </div>
            <div style={{
              fontSize: '11px',
              color: 'rgba(255, 255, 255, 0.6)',
              marginTop: '2px'
            }}>
              Анимированные эмодзи для премиум пользователей
            </div>
          </div>
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '8px'
      }}>
        {PREMIUM_EMOJIS.map((emoji) => (
          <div
            key={emoji.id}
            onClick={() => handleEmojiClick(emoji.id)}
            onMouseEnter={() => setHoveredId(emoji.id)}
            onMouseLeave={() => setHoveredId(null)}
            style={{
              position: 'relative',
              aspectRatio: '1',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              background: hoveredId === emoji.id 
                ? 'rgba(0, 242, 255, 0.15)' 
                : 'rgba(255, 255, 255, 0.05)',
              transition: 'all 0.2s',
              transform: hoveredId === emoji.id ? 'scale(1.05)' : 'scale(1)',
              border: isPremium 
                ? '1px solid rgba(255, 215, 0, 0.2)' 
                : '1px solid rgba(255, 255, 255, 0.1)'
            }}
            title={emoji.nameRu}
          >
            {emoji.previewUrl}
            
            {!isPremium && (
              <div style={{
                position: 'absolute',
                top: '4px',
                right: '4px',
                width: '16px',
                height: '16px',
                borderRadius: '4px',
                background: 'rgba(0, 0, 0, 0.7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'rgba(255, 215, 0, 0.9)'
              }}>
                <Icon size="100" src={Icons.Lock} />
              </div>
            )}

            {isPremium && hoveredId === emoji.id && (
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0, 242, 255, 0.1)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <div style={{
                  fontSize: '12px',
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontWeight: 500,
                  textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)'
                }}>
                  {emoji.nameRu}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {!isPremium && (
        <button
          onClick={onUpgradeClick}
          style={{
            width: '100%',
            marginTop: '12px',
            padding: '10px',
            background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 140, 0, 0.2) 100%)',
            border: '1px solid rgba(255, 215, 0, 0.4)',
            borderRadius: '8px',
            color: 'rgba(255, 215, 0, 0.9)',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 215, 0, 0.3) 0%, rgba(255, 140, 0, 0.3) 100%)';
            e.currentTarget.style.borderColor = 'rgba(255, 215, 0, 0.6)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 140, 0, 0.2) 100%)';
            e.currentTarget.style.borderColor = 'rgba(255, 215, 0, 0.4)';
          }}
        >
          Получить премиум доступ
        </button>
      )}
    </div>
  );
});

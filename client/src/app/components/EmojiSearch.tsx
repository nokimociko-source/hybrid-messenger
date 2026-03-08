import React, { useState, useEffect, useRef, memo } from 'react';
import { Icon, Icons } from 'folds';

interface EmojiSearchProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

export const EmojiSearch = memo(function EmojiSearch({ onSearch, placeholder = 'Поиск эмодзи...' }: EmojiSearchProps) {
  const [value, setValue] = useState('');
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Debounce search with 200ms delay
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      onSearch(value);
    }, 200);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [value, onSearch]);

  const handleClear = () => {
    setValue('');
    onSearch('');
  };

  return (
    <div style={{
      padding: '8px',
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      background: 'rgba(0, 0, 0, 0.2)'
    }}>
      <div style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center'
      }}>
        <div style={{
          position: 'absolute',
          left: '12px',
          display: 'flex',
          alignItems: 'center',
          color: 'rgba(255, 255, 255, 0.4)',
          pointerEvents: 'none'
        }}>
          <Icon size="200" src={Icons.Search} />
        </div>

        <label htmlFor="emoji-search-input" style={{ display: 'none' }}>{placeholder}</label>
        <input
          id="emoji-search-input"
          name="emoji-search"
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          style={{
            width: '100%',
            padding: '8px 36px 8px 36px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            color: 'rgba(255, 255, 255, 0.9)',
            fontSize: '14px',
            outline: 'none',
            transition: 'all 0.2s'
          }}
          onFocus={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
            e.currentTarget.style.borderColor = 'rgba(0, 242, 255, 0.4)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
          }}
        />

        {value && (
          <button
            onClick={handleClear}
            style={{
              position: 'absolute',
              right: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '24px',
              height: '24px',
              background: 'transparent',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              color: 'rgba(255, 255, 255, 0.4)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.4)';
            }}
            title="Очистить"
          >
            <Icon size="200" src={Icons.Cross} />
          </button>
        )}
      </div>
    </div>
  );
});

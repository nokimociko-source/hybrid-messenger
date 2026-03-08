import React, { useState, useEffect, useRef } from 'react';
import { Icon, Icons, Spinner } from 'folds';
import { useNavigate } from 'react-router-dom';
import { useGlobalSearch, GlobalSearchResult } from '../hooks/useGlobalSearch';
import { formatMessageTime } from '../utils/timeUtils';
import { HOME_PATH } from '../pages/paths';

interface GlobalSearchProps {
  onClose: () => void;
}

export function GlobalSearch({ onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [mediaFilter, setMediaFilter] = useState<'all' | 'text' | 'image' | 'video' | 'audio' | 'file'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const { results, loading, error, search, clear } = useGlobalSearch();

  // Автофокус на input
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Поиск с задержкой (debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) {
        search({ query, mediaType: mediaFilter });
      } else {
        clear();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, mediaFilter, search, clear]);

  // Закрытие по Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleResultClick = (result: GlobalSearchResult) => {
    navigate(`${HOME_PATH}room/${result.room_id}?message=${result.message_id}`);
    onClose();
  };

  const getMediaIcon = (result: GlobalSearchResult) => {
    if (!result.file_type) return null;
    if (result.file_type.startsWith('image/')) return '🖼️';
    if (result.file_type.startsWith('video/')) return '🎥';
    if (result.file_type.startsWith('audio/')) return '🎵';
    return '📎';
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        backdropFilter: 'blur(10px)',
        zIndex: 2000,
        display: 'flex',
        flexDirection: 'column',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={onClose}
    >
      <div
        style={{
          maxWidth: '800px',
          width: '100%',
          margin: '60px auto 0',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: 'calc(100vh - 120px)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%)',
            border: '1px solid rgba(0, 242, 255, 0.3)',
            borderRadius: '16px 16px 0 0',
            padding: '20px 24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <Icon size="300" src={Icons.Search} style={{ color: '#00f2ff' }} />
            <h2 style={{ margin: 0, color: '#fff', fontSize: '20px', fontWeight: '600' }}>
              Глобальный поиск
            </h2>
            <div style={{ flex: 1 }} />
            <button
              onClick={() => setShowFilters(!showFilters)}
              style={{
                background: showFilters ? 'rgba(0, 242, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${showFilters ? 'rgba(0, 242, 255, 0.5)' : 'rgba(255, 255, 255, 0.2)'}`,
                borderRadius: '8px',
                padding: '8px 16px',
                color: showFilters ? '#00f2ff' : '#fff',
                cursor: 'pointer',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Icon size="100" src={Icons.Filter} />
              Фильтры
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: '#888',
                cursor: 'pointer',
                fontSize: '28px',
                lineHeight: '1',
                padding: '4px 8px',
              }}
            >
              ×
            </button>
          </div>

          {/* Search Input */}
          <label htmlFor="global-search-input" style={{ display: 'none' }}>Поиск по всем сообщениям</label>
          <input
            id="global-search-input"
            name="global-search"
            ref={inputRef}
            type="text"
            placeholder="Поиск по всем сообщениям..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '14px 16px',
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(0, 242, 255, 0.3)',
              borderRadius: '10px',
              color: '#fff',
              fontSize: '15px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'rgba(0, 242, 255, 0.6)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'rgba(0, 242, 255, 0.3)';
            }}
          />

          {/* Filters */}
          {showFilters && (
            <div
              style={{
                marginTop: '16px',
                padding: '16px',
                background: 'rgba(0, 0, 0, 0.3)',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <div style={{ fontSize: '13px', color: '#888', marginBottom: '10px', fontWeight: '500' }}>
                Тип контента:
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[
                  { value: 'all', label: 'Все', icon: '📋' },
                  { value: 'text', label: 'Текст', icon: '💬' },
                  { value: 'image', label: 'Фото', icon: '🖼️' },
                  { value: 'video', label: 'Видео', icon: '🎥' },
                  { value: 'audio', label: 'Аудио', icon: '🎵' },
                  { value: 'file', label: 'Файлы', icon: '📎' },
                ].map((filter) => (
                  <button
                    key={filter.value}
                    onClick={() => setMediaFilter(filter.value as any)}
                    style={{
                      padding: '8px 14px',
                      background: mediaFilter === filter.value ? 'rgba(0, 242, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                      border: `1px solid ${mediaFilter === filter.value ? 'rgba(0, 242, 255, 0.5)' : 'rgba(255, 255, 255, 0.2)'}`,
                      borderRadius: '8px',
                      color: mediaFilter === filter.value ? '#00f2ff' : '#fff',
                      cursor: 'pointer',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s',
                    }}
                  >
                    <span>{filter.icon}</span>
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        <div
          style={{
            background: '#0a0a0a',
            border: '1px solid rgba(0, 242, 255, 0.3)',
            borderTop: 'none',
            borderRadius: '0 0 16px 16px',
            flex: 1,
            overflow: 'auto',
            maxHeight: 'calc(100vh - 300px)',
          }}
        >
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
              <Spinner variant="Secondary" />
            </div>
          ) : error ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#ff4444' }}>
              ❌ {error.message}
            </div>
          ) : results.length === 0 && query.trim() ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
              Ничего не найдено
            </div>
          ) : results.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
              Введите запрос для поиска по всем сообщениям
            </div>
          ) : (
            <div>
              <div
                style={{
                  padding: '12px 24px',
                  fontSize: '13px',
                  color: '#888',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                Найдено: {results.length} {results.length === 1 ? 'сообщение' : results.length < 5 ? 'сообщения' : 'сообщений'}
              </div>
              {results.map((result) => (
                <div
                  key={result.message_id}
                  onClick={() => handleResultClick(result)}
                  style={{
                    padding: '16px 24px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 242, 255, 0.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {/* Room name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#00f2ff' }}>
                      {result.room_name || 'Безымянный чат'}
                    </span>
                    <span style={{ fontSize: '12px', color: '#666' }}>•</span>
                    <span style={{ fontSize: '12px', color: '#888' }}>
                      {formatMessageTime(result.created_at)}
                    </span>
                  </div>

                  {/* Sender */}
                  <div style={{ fontSize: '13px', color: '#aaa', marginBottom: '6px' }}>
                    {result.sender_username}
                  </div>

                  {/* Content */}
                  <div style={{ fontSize: '14px', color: '#fff', lineHeight: '1.5' }}>
                    {getMediaIcon(result) && (
                      <span style={{ marginRight: '6px' }}>{getMediaIcon(result)}</span>
                    )}
                    {result.content ? (
                      <span>
                        {result.content.length > 150
                          ? result.content.substring(0, 150) + '...'
                          : result.content}
                      </span>
                    ) : result.file_name ? (
                      <span style={{ color: '#888' }}>{result.file_name}</span>
                    ) : (
                      <span style={{ color: '#666' }}>Медиа-файл</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

import React, { useState, useMemo, useEffect } from 'react';
import { Icon, Icons, Scroll } from 'folds';
import { Message } from '../hooks/useSupabaseChat';

type MessageSearchProps = {
    messages: Message[];
    onClose: () => void;
    onSelectMessage: (messageId: string) => void;
};

export function MessageSearch({ messages, onClose, onSelectMessage }: MessageSearchProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [currentIndex, setCurrentIndex] = useState(0);
    const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | 'week' | 'month' | 'custom'>('all');
    const [customDateFrom, setCustomDateFrom] = useState('');
    const [customDateTo, setCustomDateTo] = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false);

    const normalizedQuery = searchQuery.trim().toLowerCase();

    // Функция для проверки даты сообщения
    const isMessageInDateRange = (messageDate: string): boolean => {
        const msgDate = new Date(messageDate);
        const now = new Date();

        switch (dateFilter) {
            case 'all':
                return true;
            case 'today':
                return msgDate.toDateString() === now.toDateString();
            case 'yesterday':
                const yesterday = new Date(now);
                yesterday.setDate(yesterday.getDate() - 1);
                return msgDate.toDateString() === yesterday.toDateString();
            case 'week':
                const weekAgo = new Date(now);
                weekAgo.setDate(weekAgo.getDate() - 7);
                return msgDate >= weekAgo;
            case 'month':
                const monthAgo = new Date(now);
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                return msgDate >= monthAgo;
            case 'custom':
                if (!customDateFrom && !customDateTo) return true;
                const from = customDateFrom ? new Date(customDateFrom) : new Date(0);
                const to = customDateTo ? new Date(customDateTo) : new Date();
                to.setHours(23, 59, 59, 999); // Include the whole day
                return msgDate >= from && msgDate <= to;
            default:
                return true;
        }
    };

    // Закрытие по Escape
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [onClose]);

    // Фильтрация с расширенным поиском (content + username + file_name) + дата
    const filteredMessages = useMemo(() => {
        return [...messages]
            .reverse() // Сначала новые, как в Telegram
            .filter(msg => {
                // Фильтр по дате
                if (!isMessageInDateRange(msg.created_at)) return false;

                // Фильтр по тексту (если есть запрос)
                if (!normalizedQuery) return true;

                return msg.content?.toLowerCase().includes(normalizedQuery) ||
                    msg.users?.username?.toLowerCase().includes(normalizedQuery) ||
                    (msg as any).file_name?.toLowerCase().includes(normalizedQuery);
            });
    }, [messages, normalizedQuery, dateFilter, customDateFrom, customDateTo]);

    // Сброс индекса при изменении результатов
    useEffect(() => {
        setCurrentIndex(0);
    }, [filteredMessages.length]);

    // Навигация по результатам (Enter, стрелки)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (filteredMessages.length === 0) return;

            if (e.key === 'Enter') {
                e.preventDefault();
                const msg = filteredMessages[currentIndex];
                if (msg) {
                    onSelectMessage(msg.id);
                    onClose();
                }
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setCurrentIndex(prev => (prev + 1) % filteredMessages.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setCurrentIndex(prev => (prev - 1 + filteredMessages.length) % filteredMessages.length);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [filteredMessages, currentIndex, onSelectMessage, onClose]);

    // Подсветка ВСЕХ совпадений (не только первого)
    const highlightText = (text: string) => {
        if (!normalizedQuery) return text;

        try {
            const parts = text.split(new RegExp(`(${normalizedQuery})`, 'gi'));

            return (
                <>
                    {parts.map((part, i) =>
                        part.toLowerCase() === normalizedQuery ? (
                            <span
                                key={i}
                                style={{
                                    backgroundColor: '#00f2ff33',
                                    color: '#00f2ff',
                                    fontWeight: '600'
                                }}
                            >
                                {part}
                            </span>
                        ) : (
                            part
                        )
                    )}
                </>
            );
        } catch (e) {
            // Если в запросе спецсимволы regex - показываем как есть
            return text;
        }
    };

    return (
        <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '100%',
            maxWidth: '400px',
            height: '100%',
            backgroundColor: '#0f0f0f',
            borderLeft: '1px solid rgba(255,255,255,0.05)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 100
        }}>
            {/* Header */}
            <div style={{
                height: '56px',
                display: 'flex',
                alignItems: 'center',
                padding: '0 16px',
                gap: '12px',
                borderBottom: '1px solid rgba(255,255,255,0.05)'
            }}>
                <div onClick={onClose} style={{ cursor: 'pointer', color: '#888' }}>
                    <Icon size="200" src={Icons.Cross} />
                </div>
                <label htmlFor="message-search-input" style={{ display: 'none' }}>Поиск сообщений</label>
                <input
                    id="message-search-input"
                    name="message-search"
                    type="text"
                    placeholder="Поиск сообщений..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                    style={{
                        flexGrow: 1,
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        color: '#fff',
                        fontSize: '14px',
                        outline: 'none'
                    }}
                />
                {/* Счетчик результатов */}
                {filteredMessages.length > 0 && (
                    <div style={{
                        fontSize: '13px',
                        color: '#00f2ff',
                        fontWeight: '600',
                        whiteSpace: 'nowrap'
                    }}>
                        {currentIndex + 1} / {filteredMessages.length}
                    </div>
                )}
            </div>

            {/* Date filters */}
            <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                background: 'rgba(0, 0, 0, 0.2)'
            }}>
                <div style={{
                    display: 'flex',
                    gap: '6px',
                    flexWrap: 'wrap',
                    marginBottom: showDatePicker ? '12px' : '0'
                }}>
                    {[
                        { value: 'all', label: 'Все' },
                        { value: 'today', label: 'Сегодня' },
                        { value: 'yesterday', label: 'Вчера' },
                        { value: 'week', label: 'Неделя' },
                        { value: 'month', label: 'Месяц' },
                        { value: 'custom', label: '📅 Период' }
                    ].map(filter => (
                        <button
                            key={filter.value}
                            onClick={() => {
                                setDateFilter(filter.value as any);
                                setShowDatePicker(filter.value === 'custom');
                            }}
                            style={{
                                padding: '6px 12px',
                                background: dateFilter === filter.value
                                    ? 'linear-gradient(45deg, #a200ff, #00f2ff)'
                                    : 'rgba(255,255,255,0.05)',
                                border: 'none',
                                borderRadius: '6px',
                                color: '#fff',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: dateFilter === filter.value ? '600' : '400',
                                transition: 'all 0.2s'
                            }}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>

                {/* Custom date picker */}
                {showDatePicker && (
                    <div style={{
                        display: 'flex',
                        gap: '8px',
                        alignItems: 'center'
                    }}>
                        <div style={{ flex: 1 }}>
                            <label htmlFor="search-date-from" style={{ fontSize: '11px', color: '#888', display: 'block', marginBottom: '4px' }}>
                                С:
                            </label>
                            <input
                                id="search-date-from"
                                name="date-from"
                                type="date"
                                value={customDateFrom}
                                onChange={(e) => setCustomDateFrom(e.target.value)}
                                style={{
                                    width: '100%',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '6px',
                                    padding: '6px 8px',
                                    color: '#fff',
                                    fontSize: '12px',
                                    outline: 'none'
                                }}
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label htmlFor="search-date-to" style={{ fontSize: '11px', color: '#888', display: 'block', marginBottom: '4px' }}>
                                По:
                            </label>
                            <input
                                id="search-date-to"
                                name="date-to"
                                type="date"
                                value={customDateTo}
                                onChange={(e) => setCustomDateTo(e.target.value)}
                                style={{
                                    width: '100%',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '6px',
                                    padding: '6px 8px',
                                    color: '#fff',
                                    fontSize: '12px',
                                    outline: 'none'
                                }}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Navigation buttons (как в Telegram) */}
            {filteredMessages.length > 0 && (
                <div style={{
                    display: 'flex',
                    gap: '8px',
                    padding: '8px 16px',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    background: 'rgba(0, 242, 255, 0.05)'
                }}>
                    <button
                        onClick={() => setCurrentIndex(prev => (prev - 1 + filteredMessages.length) % filteredMessages.length)}
                        style={{
                            flex: 1,
                            padding: '8px',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '6px',
                            color: '#00f2ff',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: '600',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 242, 255, 0.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    >
                        ↑ Предыдущее
                    </button>
                    <button
                        onClick={() => setCurrentIndex(prev => (prev + 1) % filteredMessages.length)}
                        style={{
                            flex: 1,
                            padding: '8px',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '6px',
                            color: '#00f2ff',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: '600',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 242, 255, 0.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    >
                        Следующее ↓
                    </button>
                </div>
            )}

            {/* Results */}
            <Scroll style={{ flexGrow: 1, padding: '8px' }}>
                {!normalizedQuery && dateFilter === 'all' && (
                    <div style={{
                        textAlign: 'center',
                        padding: '40px 20px',
                        color: '#666'
                    }}>
                        Начните вводить текст для поиска или выберите период
                    </div>
                )}

                {(normalizedQuery || dateFilter !== 'all') && filteredMessages.length === 0 && (
                    <div style={{
                        textAlign: 'center',
                        padding: '40px 20px',
                        color: '#888'
                    }}>
                        Ничего не найдено
                    </div>
                )}

                {filteredMessages.map((msg, index) => (
                    <div
                        key={msg.id}
                        onClick={() => {
                            setCurrentIndex(index);
                            onSelectMessage(msg.id);
                            onClose();
                        }}
                        style={{
                            padding: '12px',
                            marginBottom: '8px',
                            backgroundColor: index === currentIndex
                                ? 'rgba(0, 242, 255, 0.15)'
                                : 'rgba(255,255,255,0.03)',
                            border: index === currentIndex
                                ? '1px solid rgba(0, 242, 255, 0.4)'
                                : '1px solid transparent',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            transform: index === currentIndex ? 'scale(1.02)' : 'scale(1)'
                        }}
                        className="message-search-item"
                    >
                        <div style={{
                            fontSize: '12px',
                            color: '#00f2ff',
                            marginBottom: '4px',
                            fontWeight: 'bold'
                        }}>
                            {highlightText(msg.users?.username || 'Неизвестно')}
                        </div>

                        <div style={{
                            fontSize: '14px',
                            color: '#fff',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                        }}>
                            {msg.content ? highlightText(msg.content) : (
                                (msg as any).file_name ? (
                                    <>📎 {highlightText((msg as any).file_name)}</>
                                ) : (
                                    '📎 Медиа'
                                )
                            )}
                        </div>

                        <div style={{
                            fontSize: '11px',
                            color: '#666',
                            marginTop: '4px'
                        }}>
                            {new Date(msg.created_at).toLocaleString('ru-RU')}
                        </div>
                    </div>
                ))}
            </Scroll>

            <style>{`
                .message-search-item:hover {
                    background-color: rgba(0, 242, 255, 0.1) !important;
                    border-color: rgba(0, 242, 255, 0.3) !important;
                }
            `}</style>
        </div>
    );
}

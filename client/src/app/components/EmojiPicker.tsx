import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Icon, Icons } from 'folds';
import { StickerPanel } from './StickerPanel';
import { EmojiSearch } from './EmojiSearch';
import { EmojiRecent } from './EmojiRecent';
import { PremiumEmoji } from './PremiumEmoji';
import { ErrorBoundary } from './ErrorBoundary';
import { useStickerPacks } from '../hooks/useStickerPacks';
import { useEmojiHistory } from '../hooks/useEmojiHistory';
import { usePremiumStatus } from '../hooks/usePremiumStatus';
import { emojis, emojiGroups, EmojiGroupId } from '../plugins/emoji';
import { EmojiSearchEngine } from '../utils/EmojiSearchEngine';

type EmojiCategory = 'stickers' | 'recent' | 'smileys' | 'people' | 'animals' | 'food' | 'activities' | 'objects' | 'symbols' | 'premium';

type EmojiPickerProps = {
    onSelect: (emoji: string) => void;
    onClose: () => void;
    position?: 'top' | 'bottom';
    initialCategory?: EmojiCategory;
};

export function EmojiPicker({ onSelect, onClose, position = 'bottom', initialCategory = 'stickers' }: EmojiPickerProps) {
    const [category, setCategory] = useState<EmojiCategory>(initialCategory);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<typeof emojis>([]);
    const [focusedIndex, setFocusedIndex] = useState(0);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const emojiGridRef = useRef<HTMLDivElement>(null);
    
    // Hooks
    const { packs, loading: packsLoading, error: packsError, uploadPack } = useStickerPacks();
    const { recentEmojis, addEmoji } = useEmojiHistory();
    const { isPremium } = usePremiumStatus();

    // Memoize category emoji mapping
    const categoryEmojiMap = useMemo(() => {
        const map: Record<EmojiCategory, string[]> = {
            stickers: [],
            recent: [],
            premium: [],
            smileys: [],
            people: [],
            animals: [],
            food: [],
            activities: [],
            objects: [],
            symbols: []
        };

        const groupMap: Record<string, EmojiGroupId> = {
            'people': EmojiGroupId.People,
            'animals': EmojiGroupId.Nature,
            'food': EmojiGroupId.Food,
            'activities': EmojiGroupId.Activity,
            'objects': EmojiGroupId.Object,
            'symbols': EmojiGroupId.Symbol,
        };

        // Pre-compute emoji arrays for each category
        Object.keys(groupMap).forEach(cat => {
            const groupId = cat === 'smileys' ? EmojiGroupId.People : groupMap[cat as keyof typeof groupMap];
            const group = emojiGroups.find(g => g.id === groupId);
            if (group) {
                map[cat as EmojiCategory] = group.emojis.map(e => e.unicode || '');
            }
        });

        return map;
    }, []);

    // Map emoji groups to categories
    const getCategoryEmojis = useCallback((cat: EmojiCategory): string[] => {
        if (cat === 'stickers' || cat === 'recent' || cat === 'premium') return [];
        return categoryEmojiMap[cat] || [];
    }, [categoryEmojiMap]);

    // Handle search
    const handleSearch = useCallback((query: string) => {
        setSearchQuery(query);
        if (query.trim()) {
            const results = EmojiSearchEngine.searchSync(emojis, query);
            setSearchResults(results);
        } else {
            setSearchResults([]);
        }
    }, []);

    // Handle emoji selection
    const handleEmojiSelect = useCallback((emoji: string) => {
        addEmoji(emoji);
        onSelect(emoji);
        onClose();
    }, [addEmoji, onSelect, onClose]);

    // Handle sticker selection
    const handleStickerSelect = useCallback((packId: string, stickerId: string) => {
        const stickerRef = `[sticker:${packId}:${stickerId}]`;
        onSelect(stickerRef);
        onClose();
    }, [onSelect, onClose]);

    // Handle premium emoji selection
    const handlePremiumSelect = useCallback((emojiId: string) => {
        // For now, just use the emoji ID as the value
        // In production, this would fetch the actual emoji data
        onSelect(`[premium:${emojiId}]`);
        onClose();
    }, [onSelect, onClose]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!emojiGridRef.current) return;

            const emojisInView = searchQuery 
                ? searchResults.map(e => e.unicode || '')
                : getCategoryEmojis(category);

            if (emojisInView.length === 0) return;

            const cols = 8;
            const rows = Math.ceil(emojisInView.length / cols);

            switch (e.key) {
                case 'ArrowRight':
                    e.preventDefault();
                    setFocusedIndex(prev => Math.min(prev + 1, emojisInView.length - 1));
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    setFocusedIndex(prev => Math.max(prev - 1, 0));
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    setFocusedIndex(prev => Math.min(prev + cols, emojisInView.length - 1));
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setFocusedIndex(prev => Math.max(prev - cols, 0));
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (emojisInView[focusedIndex]) {
                        handleEmojiSelect(emojisInView[focusedIndex]);
                    }
                    break;
                case 'Escape':
                    e.preventDefault();
                    onClose();
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [category, searchQuery, searchResults, focusedIndex, getCategoryEmojis, handleEmojiSelect, onClose]);

    // Get emojis to display (memoized)
    const emojisToDisplay = useMemo(() => {
        return searchQuery 
            ? searchResults.map(e => e.unicode || '')
            : getCategoryEmojis(category);
    }, [searchQuery, searchResults, category, getCategoryEmojis]);

    return (
        <ErrorBoundary>
        <div 
            style={{
                position: 'absolute',
                [position === 'top' ? 'top' : 'bottom']: '100%',
                left: '0',
                [position === 'top' ? 'marginTop' : 'marginBottom']: '8px',
                background: 'linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%)',
                border: '1px solid rgba(0, 242, 255, 0.3)',
                borderRadius: '16px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
                zIndex: 1000,
                minWidth: '360px',
                maxWidth: '400px',
                maxHeight: '400px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Выбор эмодзи и стикеров"
        >
            {/* Search Bar */}
            {category !== 'stickers' && (
                <EmojiSearch onSearch={handleSearch} />
            )}

            {/* Recent Emojis Section */}
            {!searchQuery && category !== 'stickers' && category !== 'premium' && (
                <EmojiRecent 
                    recentEmojis={recentEmojis} 
                    onEmojiSelect={handleEmojiSelect} 
                />
            )}

            {/* Category Tabs */}
            <div style={{
                display: 'flex',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '8px',
                gap: '4px',
                background: 'rgba(0, 0, 0, 0.3)',
                overflowX: 'auto',
                overflowY: 'hidden'
            }}
            className="emoji-tabs-scroll"
            role="tablist"
            aria-label="Категории эмодзи"
            >
                <div
                    onClick={() => setCategory('stickers')}
                    style={{
                        padding: '8px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        background: category === 'stickers' ? 'rgba(0, 242, 255, 0.2)' : 'transparent',
                        border: category === 'stickers' ? '1px solid rgba(0, 242, 255, 0.4)' : '1px solid transparent',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: '36px',
                        color: category === 'stickers' ? '#00f2ff' : 'rgba(255, 255, 255, 0.6)'
                    }}
                    title="Стикеры"
                    role="tab"
                    aria-selected={category === 'stickers'}
                    aria-label="Стикеры"
                    tabIndex={0}
                    onMouseEnter={(e) => {
                        if (category !== 'stickers') {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (category !== 'stickers') {
                            e.currentTarget.style.background = 'transparent';
                        }
                    }}
                >
                    <Icon size="200" src={Icons.Sticker} />
                </div>
                {[
                    { key: 'smileys', icon: '😀', label: 'Смайлики' },
                    { key: 'people', icon: '👋', label: 'Люди' },
                    { key: 'animals', icon: '🐶', label: 'Животные' },
                    { key: 'food', icon: '🍕', label: 'Еда' },
                    { key: 'activities', icon: '⚽', label: 'Активности' },
                    { key: 'objects', icon: '💡', label: 'Объекты' },
                    { key: 'symbols', icon: '❤️', label: 'Символы' }
                ].map(cat => (
                    <div
                        key={cat.key}
                        onClick={() => setCategory(cat.key as EmojiCategory)}
                        style={{
                            padding: '8px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '20px',
                            background: category === cat.key ? 'rgba(0, 242, 255, 0.2)' : 'transparent',
                            border: category === cat.key ? '1px solid rgba(0, 242, 255, 0.4)' : '1px solid transparent',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                        title={cat.label}
                        role="tab"
                        aria-selected={category === cat.key}
                        aria-label={cat.label}
                        tabIndex={0}
                        onMouseEnter={(e) => {
                            if (category !== cat.key) {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (category !== cat.key) {
                                e.currentTarget.style.background = 'transparent';
                            }
                        }}
                    >
                        {cat.icon}
                    </div>
                ))}
                <div
                    onClick={() => setCategory('premium')}
                    style={{
                        padding: '8px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        background: category === 'premium' ? 'rgba(0, 242, 255, 0.2)' : 'transparent',
                        border: category === 'premium' ? '1px solid rgba(0, 242, 255, 0.4)' : '1px solid transparent',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: '36px',
                        color: category === 'premium' ? '#00f2ff' : 'rgba(255, 215, 0, 0.8)'
                    }}
                    title="Премиум эмодзи"
                    role="tab"
                    aria-selected={category === 'premium'}
                    aria-label="Премиум эмодзи"
                    tabIndex={0}
                    onMouseEnter={(e) => {
                        if (category !== 'premium') {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (category !== 'premium') {
                            e.currentTarget.style.background = 'transparent';
                        }
                    }}
                >
                    <Icon size="200" src={Icons.Star} />
                </div>
            </div>

            {/* Content Area */}
            <div 
                ref={scrollContainerRef}
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    overflowX: 'hidden'
                }}
                className="emoji-picker-scroll"
                role="tabpanel"
            >
                {category === 'stickers' ? (
                    <StickerPanel 
                        packs={packs}
                        onStickerSelect={handleStickerSelect}
                        loading={packsLoading}
                        error={packsError}
                        uploadPack={uploadPack}
                    />
                ) : category === 'premium' ? (
                    <PremiumEmoji
                        isPremium={isPremium}
                        onSelect={handlePremiumSelect}
                        onUpgradeClick={() => setShowUpgradeModal(true)}
                    />
                ) : searchQuery && searchResults.length === 0 ? (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '40px 20px',
                        gap: '12px'
                    }}>
                        <div style={{ 
                            fontSize: '48px',
                            opacity: 0.6
                        }}>
                            🔍
                        </div>
                        <div style={{ 
                            color: 'rgba(255, 255, 255, 0.6)', 
                            fontSize: '14px',
                            textAlign: 'center'
                        }}>
                            Ничего не найдено
                        </div>
                        <div style={{ 
                            color: 'rgba(255, 255, 255, 0.4)', 
                            fontSize: '12px',
                            textAlign: 'center'
                        }}>
                            Попробуйте другой запрос
                        </div>
                    </div>
                ) : (
                    <div style={{ padding: '12px' }}>
                        <div 
                            ref={emojiGridRef}
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(8, 1fr)',
                                gap: '4px'
                            }}
                            role="grid"
                            aria-label="Сетка эмодзи"
                        >
                            {emojisToDisplay.map((emoji, index) => (
                                <div
                                    key={`emoji-${index}-${emoji}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleEmojiSelect(emoji);
                                    }}
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
                                        background: focusedIndex === index ? 'rgba(0, 242, 255, 0.2)' : 'transparent',
                                        outline: focusedIndex === index ? '2px solid rgba(0, 242, 255, 0.6)' : 'none'
                                    }}
                                    role="gridcell"
                                    aria-label={emoji}
                                    tabIndex={focusedIndex === index ? 0 : -1}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'rgba(0, 242, 255, 0.15)';
                                        e.currentTarget.style.transform = 'scale(1.3)';
                                    }}
                                    onMouseLeave={(e) => {
                                        if (focusedIndex !== index) {
                                            e.currentTarget.style.background = 'transparent';
                                        }
                                        e.currentTarget.style.transform = 'scale(1)';
                                    }}
                                >
                                    {emoji}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Upgrade Modal */}
            {showUpgradeModal && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0, 0, 0, 0.8)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 10000
                    }}
                    onClick={() => setShowUpgradeModal(false)}
                >
                    <div
                        style={{
                            background: 'linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%)',
                            border: '1px solid rgba(255, 215, 0, 0.4)',
                            borderRadius: '16px',
                            padding: '24px',
                            maxWidth: '400px',
                            width: '90%'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{
                            fontSize: '48px',
                            textAlign: 'center',
                            marginBottom: '16px'
                        }}>
                            ⭐
                        </div>
                        <div style={{
                            fontSize: '20px',
                            fontWeight: 600,
                            color: 'rgba(255, 215, 0, 0.9)',
                            textAlign: 'center',
                            marginBottom: '12px'
                        }}>
                            Премиум эмодзи
                        </div>
                        <div style={{
                            fontSize: '14px',
                            color: 'rgba(255, 255, 255, 0.7)',
                            textAlign: 'center',
                            marginBottom: '24px',
                            lineHeight: '1.5'
                        }}>
                            Получите доступ к анимированным эмодзи и другим премиум функциям
                        </div>
                        <button
                            onClick={() => setShowUpgradeModal(false)}
                            style={{
                                width: '100%',
                                padding: '12px',
                                background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 140, 0, 0.2) 100%)',
                                border: '1px solid rgba(255, 215, 0, 0.4)',
                                borderRadius: '8px',
                                color: 'rgba(255, 215, 0, 0.9)',
                                fontSize: '14px',
                                fontWeight: 500,
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 215, 0, 0.3) 0%, rgba(255, 140, 0, 0.3) 100%)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 140, 0, 0.2) 100%)';
                            }}
                        >
                            Закрыть
                        </button>
                    </div>
                </div>
            )}

            <style>{`
                .emoji-picker-scroll::-webkit-scrollbar {
                    width: 6px;
                }
                .emoji-picker-scroll::-webkit-scrollbar-track {
                    background: transparent;
                }
                .emoji-picker-scroll::-webkit-scrollbar-thumb {
                    background: rgba(0, 242, 255, 0.2);
                    borderRadius: 10px;
                }
                .emoji-picker-scroll::-webkit-scrollbar-thumb:hover {
                    background: rgba(0, 242, 255, 0.4);
                }
                .emoji-picker-scroll {
                    scrollbar-width: thin;
                    scrollbar-color: rgba(0, 242, 255, 0.2) transparent;
                }
                
                .emoji-tabs-scroll::-webkit-scrollbar {
                    display: none;
                }
                .emoji-tabs-scroll {
                    scrollbar-width: none;
                    -ms-overflow-style: none;
                }
            `}</style>
        </div>
        </ErrorBoundary>
    );
}

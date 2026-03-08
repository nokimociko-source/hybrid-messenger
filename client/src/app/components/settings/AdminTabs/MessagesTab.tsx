import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../../supabaseClient';
import { AdminMessage } from './types';
import { AdminTheme } from './theme';
import { Spinner } from 'folds';

interface MessagesTabProps {
    onDeleteMessage: (messageId: string) => void | Promise<void>;
}

/**
 * Escapes special ILIKE characters to prevent surprising search results.
 */
function escapeIlike(input: string): string {
    return input.replace(/[%_\\]/g, '\\$&');
}

/**
 * Robustly strips HTML tags using the browser's DOMParser.
 */
function stripHtml(html: string): string {
    if (typeof DOMParser === 'undefined') {
        return html.replace(/<[^>]*>?/gm, ''); // Fallback for non-browser environments
    }
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
}

export const MessagesTab: React.FC<MessagesTabProps> = ({ onDeleteMessage }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeSearch, setActiveSearch] = useState('');
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const queryClient = useQueryClient();

    const { data: messages, isLoading, error } = useQuery({
        queryKey: ['admin', 'messages-search', activeSearch],
        queryFn: async () => {
            if (!activeSearch) return [];
            const { data, error } = await supabase
                .from('messages')
                .select('*, sender:users(username)')
                .ilike('content', `%${escapeIlike(activeSearch)}%`)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            return data as AdminMessage[];
        },
        enabled: activeSearch.length >= 2,
        placeholderData: (previousData) => previousData, // Smooth transitions
    });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = searchQuery.trim();
        if (trimmed.length < 2) return;
        setActiveSearch(trimmed);
    };

    const handleDelete = async (messageId: string) => {
        setDeletingId(messageId);
        try {
            await onDeleteMessage(messageId);
            // Even though parent invalidates 'admin', we do it explicitly for this specific query
            queryClient.invalidateQueries({ queryKey: ['admin', 'messages-search', activeSearch] });
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <form
                onSubmit={handleSearch}
                style={{ display: 'flex', gap: '12px' }}
                aria-label="Поиск сообщений"
            >
                <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Минимум 2 символа для поиска..."
                    aria-label="Запрос для поиска"
                    style={{
                        flex: 1,
                        padding: '12px 16px',
                        background: AdminTheme.colors.cardBg,
                        border: `1px solid ${AdminTheme.colors.tableBorder}`,
                        borderRadius: '12px',
                        color: AdminTheme.colors.textMain,
                        outline: 'none'
                    }}
                />
                <button
                    type="submit"
                    disabled={searchQuery.trim().length < 2}
                    style={AdminTheme.styles.button(searchQuery.trim().length < 2 ? 'ghost' : 'primary')}
                >
                    ПОИСК
                </button>
            </form>

            {error && (
                <div style={{
                    padding: '16px',
                    background: 'rgba(255,60,60,0.1)',
                    border: `1px solid ${AdminTheme.colors.danger}`,
                    borderRadius: '12px',
                    color: '#ff4d4d',
                    textAlign: 'center',
                    fontSize: '14px'
                }}>
                    Ошибка поиска: {error instanceof Error ? error.message : 'Неизвестная ошибка'}
                </div>
            )}

            {!activeSearch && !isLoading && (
                <div style={{ textAlign: 'center', color: AdminTheme.colors.textDim, padding: '40px' }}>
                    Введите запрос (минимум 2 символа), чтобы начать поиск
                </div>
            )}

            {isLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                    <Spinner size="200" variant="Secondary" />
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {(messages || []).map(msg => (
                        <div key={msg.id} style={{
                            padding: '16px',
                            background: AdminTheme.colors.cardBg,
                            border: `1px solid ${AdminTheme.colors.tableBorder}`,
                            borderRadius: '12px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div style={{ minWidth: 0, flex: 1, marginRight: '16px' }}>
                                <div style={{
                                    fontSize: '12px',
                                    color: AdminTheme.colors.primary,
                                    marginBottom: '4px',
                                    fontWeight: '600'
                                }}>
                                    @{msg.sender?.username || 'Unknown'}
                                </div>
                                <div
                                    style={{
                                        color: AdminTheme.colors.textMain,
                                        fontSize: '14px',
                                        lineHeight: '1.4',
                                        wordBreak: 'break-word'
                                    }}
                                >
                                    {stripHtml(msg.content)}
                                </div>
                                <div style={{
                                    fontSize: '10px',
                                    color: AdminTheme.colors.textDim,
                                    marginTop: '8px'
                                }}>
                                    {new Date(msg.created_at).toLocaleString()} | ID: {msg.id}
                                </div>
                            </div>
                            <button
                                onClick={() => handleDelete(msg.id)}
                                disabled={deletingId === msg.id}
                                style={AdminTheme.styles.button('danger')}
                                aria-label={`Удалить сообщение от ${msg.sender?.username || 'пользователя'}`}
                            >
                                {deletingId === msg.id ? '...' : 'УДАЛИТЬ'}
                            </button>
                        </div>
                    ))}
                    {activeSearch && (!messages || messages.length === 0) && (
                        <div style={{ textAlign: 'center', color: AdminTheme.colors.textDim, padding: '40px' }}>
                            Ничего не найдено
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

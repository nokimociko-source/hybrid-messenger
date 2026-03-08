import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../../supabaseClient';
import { AdminRoom, AdminMessage } from './types';
import { AdminTheme } from './theme';
import { Spinner, Icon, Icons } from 'folds';
import { logger } from '../../../utils/logger';

interface RoomsTabProps {
    onDeleteRoom: (roomId: string) => void;
    onDeleteMessage: (messageId: string) => void;
}

const PAGE_SIZE = 12;

/**
 * Robustly strips HTML tags using the browser's DOMParser.
 */
function stripHtml(html: string): string {
    if (typeof DOMParser === 'undefined') {
        return html.replace(/<[^>]*>?/gm, '');
    }
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
}

export const RoomsTab: React.FC<RoomsTabProps> = ({ onDeleteRoom, onDeleteMessage }) => {
    const [page, setPage] = useState(0);
    const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
    const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
    const queryClient = useQueryClient();

    const { data: roomsData, isLoading: isLoadingRooms, error: roomsError } = useQuery({
        queryKey: ['admin', 'rooms', page],
        queryFn: async () => {
            const { data, count, error } = await supabase
                .from('rooms')
                .select('*', { count: 'exact' })
                .order('created_at', { ascending: false })
                .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

            if (error) throw error;
            return { rooms: (data || []) as AdminRoom[], total: count || 0 };
        }
    });

    const { data: messagesData, isLoading: isLoadingMessages, error: messagesError } = useQuery({
        queryKey: ['admin', 'room-messages', selectedRoomId],
        queryFn: async () => {
            if (!selectedRoomId) return [];
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .eq('room_id', selectedRoomId)
                .order('created_at', { ascending: false })
                .limit(20);
            if (error) throw error;
            return data as AdminMessage[];
        },
        enabled: !!selectedRoomId
    });

    const handleDeleteMessageInternal = async (messageId: string) => {
        setDeletingMessageId(messageId);
        try {
            await onDeleteMessage(messageId);
            queryClient.invalidateQueries({ queryKey: ['admin', 'room-messages', selectedRoomId] });
        } finally {
            setDeletingMessageId(null);
        }
    };

    if (isLoadingRooms) return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <Spinner size="200" variant="Secondary" />
        </div>
    );

    if (roomsError) return (
        <div style={{
            padding: '16px',
            background: 'rgba(255,60,60,0.1)',
            border: `1px solid ${AdminTheme.colors.danger}`,
            borderRadius: '12px',
            color: '#ff4d4d',
            textAlign: 'center',
            fontSize: '14px'
        }}>
            Ошибка загрузки комнат: {roomsError instanceof Error ? roomsError.message : 'Неизвестная ошибка'}
        </div>
    );

    const rooms = roomsData?.rooms || [];
    const total = roomsData?.total || 0;
    const totalPages = Math.ceil(total / PAGE_SIZE);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                {rooms.map(room => (
                    <div key={room.id} style={{
                        ...AdminTheme.styles.card,
                        position: 'relative'
                    }}>
                        <div style={{
                            fontSize: '11px',
                            color: AdminTheme.colors.textDim,
                            textTransform: 'uppercase',
                            marginBottom: '8px',
                            fontWeight: '700'
                        }}>
                            {room.type}
                        </div>
                        <div style={{
                            fontSize: '18px',
                            fontWeight: '700',
                            color: AdminTheme.colors.textMain,
                            marginBottom: '4px'
                        }}>
                            {room.name || 'Без названия'}
                        </div>
                        <div style={{
                            fontSize: '12px',
                            color: AdminTheme.colors.textMuted,
                            marginBottom: '16px',
                            fontFamily: 'monospace'
                        }}>
                            ID: {room.id}
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                onClick={() => setSelectedRoomId(selectedRoomId === room.id ? null : room.id)}
                                aria-label={selectedRoomId === room.id ? `Скрыть сообщения комнаты ${room.name}` : `Показать сообщения комнаты ${room.name}`}
                                style={{
                                    ...AdminTheme.styles.button('primary'),
                                    flex: 1
                                }}
                            >
                                {selectedRoomId === room.id ? 'Скрыть' : 'Сообщения'}
                            </button>
                            <button
                                onClick={() => onDeleteRoom(room.id)}
                                aria-label={`Удалить комнату ${room.name}`}
                                style={AdminTheme.styles.button('danger')}
                            >
                                <Icon size="100" src={Icons.Delete} />
                            </button>
                        </div>

                        {selectedRoomId === room.id && (
                            <div style={{
                                background: 'rgba(0,0,0,0.2)',
                                borderRadius: '8px',
                                padding: '12px',
                                marginTop: '12px'
                            }}>
                                <div style={{
                                    fontSize: '10px',
                                    color: AdminTheme.colors.primary,
                                    marginBottom: '8px',
                                    fontWeight: '700'
                                }}>
                                    ПОСЛЕДНИЕ СООБЩЕНИЯ:
                                </div>

                                {messagesError && (
                                    <div style={{ fontSize: '10px', color: AdminTheme.colors.danger, marginBottom: '8px' }}>
                                        Ошибка загрузки сообщений.
                                    </div>
                                )}

                                {isLoadingMessages ? <Spinner size="100" variant="Secondary" /> : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        {(messagesData || []).map(m => (
                                            <div key={m.id} style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                fontSize: '11px',
                                                color: 'rgba(255,255,255,0.7)',
                                                padding: '4px',
                                                background: 'rgba(255,255,255,0.02)',
                                                borderRadius: '4px'
                                            }}>
                                                <div style={{
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                    marginRight: '8px'
                                                }}>
                                                    {stripHtml(m.content)}
                                                </div>
                                                <div
                                                    onClick={() => !deletingMessageId && handleDeleteMessageInternal(m.id)}
                                                    role="button"
                                                    aria-label={`Удалить сообщение: ${m.id}`}
                                                    style={{
                                                        color: deletingMessageId === m.id ? AdminTheme.colors.textDim : AdminTheme.colors.danger,
                                                        cursor: deletingMessageId === m.id ? 'wait' : 'pointer',
                                                        flexShrink: 0
                                                    }}
                                                >
                                                    {deletingMessageId === m.id ? '...' : 'УДАЛИТЬ'}
                                                </div>
                                            </div>
                                        ))}
                                        {(!messagesData || messagesData.length === 0) && (
                                            <div style={{ fontSize: '11px', color: AdminTheme.colors.textDim }}>Нет сообщений</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {totalPages > 1 && (
                <div style={{ padding: '16px', display: 'flex', justifyContent: 'center', gap: '8px' }}>
                    <button
                        onClick={() => setPage(p => Math.max(0, p - 1))}
                        disabled={page === 0}
                        aria-label="Предыдущая страница"
                        style={AdminTheme.styles.button('ghost')}
                    >
                        Назад
                    </button>
                    <span style={{ color: AdminTheme.colors.textMuted, alignSelf: 'center' }}>Страница {page + 1} из {totalPages}</span>
                    <button
                        onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                        disabled={page === totalPages - 1}
                        aria-label="Следующая страница"
                        style={AdminTheme.styles.button('ghost')}
                    >
                        Вперед
                    </button>
                </div>
            )}
        </div>
    );
};

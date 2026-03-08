import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../../supabaseClient';
import { AdminUser } from './types';
import { AdminTheme } from './theme';
import { MetricCard } from './MetricCard';
import { Spinner } from 'folds';
import { logger } from '../../../utils/logger';

interface UsersTabProps {
    isUserOnline: (userId: string) => boolean;
}

const PAGE_SIZE = 50;

export const UsersTab: React.FC<UsersTabProps> = ({ isUserOnline }) => {
    const [page, setPage] = useState(0);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const queryClient = useQueryClient();

    const { data, isLoading, error } = useQuery({
        queryKey: ['admin', 'users', page],
        queryFn: async () => {
            const { data, count, error } = await supabase
                .from('users')
                .select('*, user_presence(status, updated_at, last_seen)', { count: 'exact' })
                .order('created_at', { ascending: false })
                .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

            if (error) throw error;

            return {
                users: (data || []).map((u: any) => ({
                    ...u,
                    status: u.user_presence?.[0]?.status || u.status || 'offline',
                    updated_at: u.user_presence?.[0]?.updated_at || u.user_presence?.[0]?.last_seen || u.created_at
                })) as AdminUser[],
                total: count || 0
            };
        },
    });

    const updateStatusMutation = useMutation({
        mutationFn: async ({ userId, newStatus }: { userId: string, newStatus: string }) => {
            setUpdatingId(userId);
            try {
                const { error } = await supabase
                    .from('users')
                    .update({ status: newStatus })
                    .eq('id', userId);
                if (error) throw error;
            } finally {
                setUpdatingId(null);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
        },
        onError: (err) => {
            logger.error('Error updating user status:', err);
        }
    });

    if (isLoading) return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <Spinner size="200" variant="Secondary" />
        </div>
    );

    if (error) return (
        <div style={{
            padding: '16px',
            background: 'rgba(255,60,60,0.1)',
            border: `1px solid ${AdminTheme.colors.danger}`,
            borderRadius: '12px',
            color: '#ff4d4d',
            textAlign: 'center',
            fontSize: '14px'
        }}>
            Ошибка загрузки пользователей: {error instanceof Error ? error.message : 'Неизвестная ошибка'}
        </div>
    );

    const users = data?.users || [];
    const total = data?.total || 0;
    const onlineCount = users.filter(u => isUserOnline(u.id)).length;
    const totalPages = Math.ceil(total / PAGE_SIZE);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                <MetricCard title="Всего" value={total} trend="OK" />
                <MetricCard title="Админы" value={users.filter(u => u.is_admin).length} trend="OK" />
                <MetricCard title="В сети" value={onlineCount} trend="Live" />
            </div>

            <div style={{
                background: AdminTheme.colors.tableHeaderBg,
                borderRadius: '16px',
                border: `1px solid ${AdminTheme.colors.tableBorder}`,
                overflow: 'hidden'
            }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: AdminTheme.colors.tableHeaderBg, borderBottom: `1px solid ${AdminTheme.colors.tableBorder}` }}>
                            <th style={AdminTheme.styles.tableHeader}>UID / ЮЗЕРНЕЙМ</th>
                            <th style={AdminTheme.styles.tableHeader}>СТАТУС</th>
                            <th style={AdminTheme.styles.tableHeader}>ДЕЙСТВИЯ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => {
                            const online = isUserOnline(user.id);
                            const isUpdating = updatingId === user.id;
                            return (
                                <tr key={user.id} style={{ borderBottom: `1px solid ${AdminTheme.colors.tableBorder}` }}>
                                    <td style={AdminTheme.styles.tableCell}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{
                                                width: '32px', height: '32px', borderRadius: '50%',
                                                background: AdminTheme.colors.primaryBg, color: AdminTheme.colors.primary,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: '12px', flexShrink: 0
                                            }}>
                                                {(user.username?.[0] ?? '?').toUpperCase()}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: '600', fontSize: '14px', color: AdminTheme.colors.textMain }}>@{user.username}</div>
                                                <div style={{ fontSize: '10px', color: AdminTheme.colors.textDim, fontFamily: 'monospace' }}>{user.id}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={AdminTheme.styles.tableCell}>
                                        <span style={{
                                            padding: '4px 8px',
                                            borderRadius: '6px',
                                            fontSize: '11px',
                                            background: online ? AdminTheme.colors.successBg : AdminTheme.colors.cardBg,
                                            color: online ? AdminTheme.colors.success : AdminTheme.colors.textDim,
                                            fontWeight: '600'
                                        }}>
                                            {online ? 'ONLINE' : 'OFFLINE'}
                                        </span>
                                        {!online && user.status === 'online' && (
                                            <div style={{ fontSize: '9px', color: AdminTheme.colors.danger, marginTop: '4px', opacity: 0.5 }}>STALE RECORD</div>
                                        )}
                                    </td>
                                    <td style={AdminTheme.styles.tableCell}>
                                        <button
                                            onClick={() => updateStatusMutation.mutate({
                                                userId: user.id,
                                                newStatus: user.status === 'banned' ? 'offline' : 'banned'
                                            })}
                                            disabled={isUpdating}
                                            aria-label={user.status === 'banned' ? `Разбанить пользователя ${user.username}` : `Забанить пользователя ${user.username}`}
                                            style={{
                                                ...AdminTheme.styles.button(user.status === 'banned' ? 'primary' : 'danger'),
                                                minWidth: '100px',
                                                cursor: isUpdating ? 'wait' : 'pointer'
                                            }}
                                        >
                                            {isUpdating ? '...' : (user.status === 'banned' ? 'РАЗБАНИТЬ' : 'ЗАБАНИТЬ')}
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {totalPages > 1 && (
                    <div style={{ padding: '16px', display: 'flex', justifyContent: 'center', gap: '8px', borderTop: `1px solid ${AdminTheme.colors.tableBorder}` }}>
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
        </div>
    );
};

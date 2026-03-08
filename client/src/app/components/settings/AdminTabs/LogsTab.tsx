import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../../supabaseClient';
import { AdminMessage } from './types';
import { AdminTheme } from './theme';
import { Spinner } from 'folds';

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

export const LogsTab: React.FC = () => {
    const { data: logs, isLoading, error, refetch } = useQuery({
        queryKey: ['admin', 'logs'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100);
            if (error) throw error;
            return data as AdminMessage[];
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
            Ошибка загрузки логов: {error instanceof Error ? error.message : 'Неизвестная ошибка'}
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px'
            }}>
                <div style={{ fontSize: '14px', color: AdminTheme.colors.textMuted }}>
                    Последние 100 сообщений в системе
                </div>
                <button
                    onClick={() => refetch()}
                    aria-label="Обновить логи"
                    style={AdminTheme.styles.button('primary')}
                >
                    ОБНОВИТЬ
                </button>
            </div>
            {(logs || []).map(log => (
                <div key={log.id} style={{
                    padding: '10px 16px',
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: '8px',
                    borderLeft: `3px solid ${AdminTheme.colors.primary}`,
                    fontSize: '12px',
                    borderRight: `1px solid ${AdminTheme.colors.tableBorder}`,
                    borderTop: `1px solid ${AdminTheme.colors.tableBorder}`,
                    borderBottom: `1px solid ${AdminTheme.colors.tableBorder}`
                }}>
                    <div style={{ display: 'flex', gap: '8px', color: AdminTheme.colors.textDim, marginBottom: '4px' }}>
                        <span>{new Date(log.created_at).toLocaleTimeString()}</span>
                        <span>|</span>
                        <span style={{ color: AdminTheme.colors.primary }}>ROOM: {log.room_id}</span>
                        <span>|</span>
                        <span>SENDER: {log.sender_id}</span>
                    </div>
                    <div style={{ color: AdminTheme.colors.textMain }}>{stripHtml(log.content)}</div>
                </div>
            ))}
            {(!logs || logs.length === 0) && (
                <div style={{ textAlign: 'center', color: AdminTheme.colors.textDim, padding: '40px' }}>
                    Логов пока нет
                </div>
            )}
        </div>
    );
};

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../../supabaseClient';
import { AdminReport } from './types';
import { AdminTheme } from './theme';
import { Spinner } from 'folds';
import { logger } from '../../../utils/logger';

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

export const ReportsTab: React.FC = () => {
    const queryClient = useQueryClient();

    const { data: reports, isLoading, error } = useQuery({
        queryKey: ['admin', 'reports'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('reports')
                .select('*, reporter:users!reporter_id(username)')
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data as AdminReport[];
        }
    });

    const updateStatusMutation = useMutation({
        mutationFn: async ({ reportId, newStatus }: { reportId: string, newStatus: string }) => {
            const { error } = await supabase
                .from('reports')
                .update({ status: newStatus })
                .eq('id', reportId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] });
        },
        onError: (err) => {
            logger.error('Error updating report status:', err);
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
            Ошибка загрузки жалоб: {error instanceof Error ? error.message : 'Неизвестная ошибка'}
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {(reports || []).map(report => (
                <div key={report.id} style={AdminTheme.styles.card}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'start',
                        marginBottom: '12px'
                    }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                <span style={{
                                    color: '#ff9500',
                                    fontWeight: '700',
                                    fontSize: '16px'
                                }}>
                                    {report.reason}
                                </span>
                                <span style={{
                                    padding: '2px 6px',
                                    background: AdminTheme.colors.primaryBg,
                                    color: AdminTheme.colors.primary,
                                    borderRadius: '4px',
                                    fontSize: '10px',
                                    fontWeight: '800'
                                }}>
                                    {report.status.toUpperCase()}
                                </span>
                            </div>
                            <div style={{ fontSize: '12px', color: AdminTheme.colors.textMuted }}>
                                От: <span style={{ color: AdminTheme.colors.textMain }}>@{report.reporter?.username || 'System'}</span> | {new Date(report.created_at).toLocaleString()}
                            </div>
                        </div>
                        <select
                            value={report.status}
                            onChange={(e) => updateStatusMutation.mutate({
                                reportId: report.id,
                                newStatus: e.target.value
                            })}
                            disabled={updateStatusMutation.isPending}
                            aria-label="Изменить статус жалобы"
                            style={{
                                background: '#1a1a1a',
                                color: AdminTheme.colors.textMain,
                                border: `1px solid ${AdminTheme.colors.tableBorder}`,
                                padding: '6px',
                                borderRadius: '8px',
                                outline: 'none',
                                cursor: updateStatusMutation.isPending ? 'wait' : 'pointer'
                            }}
                        >
                            <option value="open">ОТКРЫТА</option>
                            <option value="reviewing">В РАБОТЕ</option>
                            <option value="resolved">РЕШЕНА</option>
                            <option value="rejected">ОТКЛОНЕНА</option>
                        </select>
                    </div>

                    <div
                        style={{
                            background: 'rgba(255,255,255,0.02)',
                            padding: '12px',
                            borderRadius: '8px',
                            fontSize: '14px',
                            color: AdminTheme.colors.textMain,
                            lineHeight: '1.5',
                            wordBreak: 'break-word',
                            border: `1px solid ${AdminTheme.colors.tableBorder}`
                        }}
                    >
                        {stripHtml(report.description)}
                    </div>

                    <div style={{ marginTop: '16px', display: 'flex', gap: '10px' }}>
                        <button
                            onClick={() => alert('Feature coming soon: Check Target')}
                            aria-label={`Проверить цель: ${report.target_type}`}
                            style={{
                                ...AdminTheme.styles.button('ghost'),
                                border: `1px solid ${AdminTheme.colors.tableBorder}`
                            }}
                        >
                            ПРОВЕРИТЬ ЦЕЛЬ ({report.target_type})
                        </button>
                        <button
                            onClick={() => alert('Feature coming soon: Delete Content')}
                            aria-label="Удалить контент по жалобе"
                            style={AdminTheme.styles.button('danger')}
                        >
                            УДАЛИТЬ КОНТЕНТ
                        </button>
                    </div>
                </div>
            ))}
            {(!reports || reports.length === 0) && (
                <div style={{ textAlign: 'center', color: AdminTheme.colors.textDim, padding: '40px' }}>
                    Жалоб нет
                </div>
            )}
        </div>
    );
};

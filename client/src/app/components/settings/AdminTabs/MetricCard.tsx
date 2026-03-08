import React from 'react';
import { AdminTheme } from './theme';

interface MetricCardProps {
    title: string;
    value: string | number;
    trend: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({ title, value, trend }) => {
    const isPositive = trend === 'Live' || trend === 'OK';

    return (
        <div style={AdminTheme.styles.card}>
            <div style={{
                fontSize: '12px',
                color: AdminTheme.colors.textMuted,
                textTransform: 'uppercase',
                marginBottom: '8px',
                fontWeight: '700'
            }}>
                {title}
            </div>
            <div style={{
                fontSize: '32px',
                fontWeight: '800',
                color: AdminTheme.colors.textMain,
                marginBottom: '4px'
            }}>
                {value}
            </div>
            <div style={{
                fontSize: '11px',
                color: isPositive ? AdminTheme.colors.primary : AdminTheme.colors.danger,
                fontWeight: '700'
            }}>
                {trend}
            </div>
        </div>
    );
};

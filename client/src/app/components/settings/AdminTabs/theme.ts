export const AdminTheme = {
    colors: {
        primary: '#00f2ff',
        primaryBg: 'rgba(0, 242, 255, 0.1)',
        danger: '#ff4d4d',
        dangerBg: 'rgba(255, 60, 60, 0.1)',
        success: '#00ff7f',
        successBg: 'rgba(0, 255, 127, 0.1)',
        bg: '#0a0a0a',
        cardBg: 'rgba(255,255,255,0.03)',
        cardBorder: 'rgba(255,255,255,0.08)',
        textMain: '#ffffff',
        textMuted: 'rgba(255,255,255,0.5)',
        textDim: 'rgba(255,255,255,0.3)',
        tableHeaderBg: 'rgba(255,255,255,0.02)',
        tableBorder: 'rgba(255,255,255,0.05)',
    },
    styles: {
        card: {
            padding: '20px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '16px',
        },
        button: (variant: 'primary' | 'danger' | 'ghost' = 'primary') => ({
            padding: '8px 16px',
            background: variant === 'primary' ? 'rgba(0, 242, 255, 0.1)' : (variant === 'danger' ? 'rgba(255, 60, 60, 0.1)' : 'transparent'),
            border: variant === 'ghost' ? 'none' : '1px solid',
            borderColor: variant === 'primary' ? '#00f2ff' : (variant === 'danger' ? '#ff4d4d' : 'transparent'),
            borderRadius: '8px',
            color: variant === 'primary' ? '#00f2ff' : (variant === 'danger' ? '#ff4d4d' : 'rgba(255,255,255,0.5)'),
            fontSize: '13px',
            fontWeight: '600' as const,
            cursor: 'pointer',
            transition: 'all 0.2s',
        }),
        tableHeader: {
            padding: '16px',
            color: 'rgba(255,255,255,0.5)',
            fontSize: '12px',
            fontWeight: '600' as const,
            textAlign: 'left' as const,
            textTransform: 'uppercase' as const,
        },
        tableCell: {
            padding: '16px',
            borderBottom: '1px solid rgba(255,255,255,0.03)',
        }
    }
};

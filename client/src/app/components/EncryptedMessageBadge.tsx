import React from 'react';
import { Icon, Icons } from 'folds';

interface EncryptedMessageBadgeProps {
    isEncrypted: boolean;
    size?: 'small' | 'normal';
}

export function EncryptedMessageBadge({ isEncrypted, size = 'normal' }: EncryptedMessageBadgeProps) {
    if (!isEncrypted) return null;

    return (
        <div
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: size === 'small' ? '2px 6px' : '4px 8px',
                background: 'rgba(0, 242, 255, 0.1)',
                border: '1px solid rgba(0, 242, 255, 0.3)',
                borderRadius: '4px',
                fontSize: size === 'small' ? '10px' : '12px',
                color: '#00f2ff',
                fontWeight: 500
            }}
            title="Сообщение зашифровано end-to-end"
        >
            <Icon src={Icons.Lock} size={size === 'small' ? '50' : '100'} />
            <span>E2E</span>
        </div>
    );
}

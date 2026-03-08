import React, { useState } from 'react';
import { Icon, Icons, Spinner } from 'folds';

interface CatloverModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    type?: 'confirm' | 'prompt' | 'alert';
    defaultValue?: string;
    placeholder?: string;
    onConfirm?: (value?: string) => void;
    onCancel?: () => void;
    onClose?: () => void;
    isDanger?: boolean;
}

export function CatloverModal({
    isOpen,
    title,
    message,
    confirmLabel = 'ОК',
    cancelLabel = 'Отмена',
    type = 'confirm',
    defaultValue = '',
    placeholder = '',
    onConfirm,
    onCancel,
    onClose,
    isDanger = false
}: CatloverModalProps) {
    const [inputValue, setInputValue] = useState(defaultValue);

    const handleConfirm = () => {
        if (typeof onConfirm === 'function') {
            if (type === 'prompt') {
                onConfirm(inputValue);
            } else {
                onConfirm();
            }
        }
    };

    const handleCancel = () => {
        onCancel?.();
        onClose?.();
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(15px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            animation: 'fadeIn 0.2s ease-out'
        }} onClick={handleCancel}>
            <div style={{
                background: 'linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%)',
                border: `1px solid ${isDanger ? 'rgba(255, 77, 77, 0.3)' : 'rgba(0, 242, 255, 0.3)'}`,
                borderRadius: '24px',
                width: '400px',
                maxWidth: '90%',
                padding: '24px',
                boxShadow: `0 20px 60px rgba(0, 0, 0, 0.5), 0 0 20px ${isDanger ? 'rgba(255, 77, 77, 0.05)' : 'rgba(0, 242, 255, 0.05)'}`,
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                animation: 'modalSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }} onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '12px',
                        background: isDanger ? 'rgba(255, 77, 77, 0.1)' : 'rgba(0, 242, 255, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isDanger ? '#ff4d4d' : '#00f2ff'
                    }}>
                        <Icon size="200" src={isDanger ? Icons.Cross : Icons.Info} />
                    </div>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#fff' }}>{title}</h3>
                </div>

                {/* Message */}
                <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', lineHeight: '1.5' }}>
                    {message}
                </div>

                {/* Input Area (for prompt) */}
                {type === 'prompt' && (
                    <input
                        autoFocus
                        value={inputValue}
                        onChange={e => setInputValue(e.target.value)}
                        placeholder={placeholder}
                        onKeyDown={e => e.key === 'Enter' && handleConfirm()}
                        style={{
                            width: '100%',
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '12px',
                            padding: '12px 16px',
                            color: '#fff',
                            fontSize: '14px',
                            outline: 'none',
                            transition: 'border-color 0.2s',
                        }}
                        onFocus={e => e.currentTarget.style.borderColor = 'rgba(0, 242, 255, 0.5)'}
                        onBlur={e => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
                    />
                )}

                {/* Buttons */}
                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                    {type !== 'alert' && (
                        <button
                            onClick={handleCancel}
                            style={{
                                flex: 1,
                                padding: '12px',
                                background: 'transparent',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '12px',
                                color: 'rgba(255, 255, 255, 0.5)',
                                fontWeight: '500',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                e.currentTarget.style.color = '#fff';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)';
                            }}
                        >
                            {cancelLabel}
                        </button>
                    )}
                    <button
                        onClick={handleConfirm}
                        style={{
                            flex: 1,
                            padding: '12px',
                            background: isDanger ? 'rgba(255, 77, 77, 0.15)' : 'rgba(0, 242, 255, 0.15)',
                            border: `1px solid ${isDanger ? 'rgba(255, 77, 77, 0.3)' : 'rgba(0, 242, 255, 0.3)'}`,
                            borderRadius: '12px',
                            color: isDanger ? '#ff4d4d' : '#00f2ff',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.background = isDanger ? 'rgba(255, 77, 77, 0.25)' : 'rgba(0, 242, 255, 0.25)';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.background = isDanger ? 'rgba(255, 77, 77, 0.15)' : 'rgba(0, 242, 255, 0.15)';
                            e.currentTarget.style.transform = 'translateY(0)';
                        }}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

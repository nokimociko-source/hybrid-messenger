import React, { useState } from 'react';
import { Icon, Icons } from 'folds';

interface CatloverConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    type?: 'confirm' | 'prompt' | 'alert';
    defaultValue?: string;
    placeholder?: string;
    onConfirm?: (value?: string) => void;
    onCancel: () => void;
    isDanger?: boolean;
}

export function CatloverConfirmModal({
    isOpen,
    title,
    message,
    confirmLabel = 'Подтвердить',
    cancelLabel = 'Отмена',
    type = 'confirm',
    defaultValue = '',
    placeholder = '',
    onConfirm,
    onCancel,
    isDanger = false
}: CatloverConfirmModalProps) {
    const [inputValue, setInputValue] = useState(defaultValue);

    if (!isOpen) return null;

    const handleConfirm = () => {
        if (typeof onConfirm === 'function') {
            if (type === 'prompt') {
                onConfirm(inputValue);
            } else {
                onConfirm();
            }
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(20px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            animation: 'fadeIn 0.3s ease-out'
        }} onClick={onCancel}>
            <div style={{
                background: 'linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%)',
                border: `1px solid ${isDanger ? 'rgba(255, 77, 77, 0.3)' : 'rgba(0, 242, 255, 0.3)'}`,
                borderRadius: '28px',
                width: '380px',
                maxWidth: '90%',
                padding: '32px 24px 24px',
                boxShadow: `0 30px 60px rgba(0, 0, 0, 0.6), 0 0 0 1px ${isDanger ? 'rgba(255, 77, 77, 0.1)' : 'rgba(0, 242, 255, 0.1)'}`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                gap: '20px',
                animation: 'modalSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
            }} onClick={e => e.stopPropagation()}>

                {/* Icon Wrapper */}
                <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '20px',
                    background: isDanger ? 'rgba(255, 77, 77, 0.1)' : 'rgba(0, 242, 255, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isDanger ? '#ff4d4d' : '#00f2ff',
                    marginBottom: '8px',
                    border: `1px solid ${isDanger ? 'rgba(255, 77, 77, 0.2)' : 'rgba(0, 242, 255, 0.2)'}`
                }}>
                    <Icon size="300" src={isDanger ? Icons.Cross : Icons.Info} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                    <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#fff', letterSpacing: '-0.5px' }}>
                        {title}
                    </h3>
                    <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px', lineHeight: '1.6' }}>
                        {message}
                    </p>
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
                            width: '90%',
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '12px',
                            padding: '12px 16px',
                            color: '#fff',
                            fontSize: '14px',
                            outline: 'none',
                            transition: 'border-color 0.2s',
                            textAlign: 'center'
                        }}
                        onFocus={e => e.currentTarget.style.borderColor = 'rgba(0, 242, 255, 0.5)'}
                        onBlur={e => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
                    />
                )}

                {/* Buttons Container */}
                <div style={{ display: 'flex', width: '100%', gap: '12px', marginTop: '12px' }}>
                    {type !== 'alert' && (
                        <button
                            onClick={onCancel}
                            style={{
                                flex: 1,
                                padding: '14px',
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '16px',
                                color: '#fff',
                                fontSize: '15px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                outline: 'none'
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                            }}
                        >
                            {cancelLabel}
                        </button>
                    )}
                    <button
                        onClick={handleConfirm}
                        style={{
                            flex: 1,
                            padding: '14px',
                            background: isDanger ? '#ff4d4d' : '#00f2ff',
                            border: 'none',
                            borderRadius: '16px',
                            color: isDanger ? '#fff' : '#000',
                            fontSize: '15px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: isDanger ? '0 8px 20px rgba(255, 77, 77, 0.3)' : '0 8px 20px rgba(0, 242, 255, 0.3)',
                            outline: 'none'
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = isDanger ? '0 12px 24px rgba(255, 77, 77, 0.4)' : '0 12px 24px rgba(0, 242, 255, 0.4)';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = isDanger ? '0 8px 20px rgba(255, 77, 77, 0.3)' : '0 8px 20px rgba(0, 242, 255, 0.3)';
                        }}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

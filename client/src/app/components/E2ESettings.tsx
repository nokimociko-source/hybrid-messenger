import { logger } from '../utils/logger';
import React, { useState, useEffect } from 'react';
import { useNaClE2E } from '../hooks/useNaClE2E';
import { supabase } from '../../supabaseClient';
import { useEncryption } from '../context/EncryptionContext';

interface E2ESettingsProps {
    onClose: () => void;
}

const STORAGE_KEY = 'e2e_enabled';

export function E2ESettings({ onClose }: E2ESettingsProps) {
    const { e2eEnabled: enabled, setE2EEnabled } = useEncryption();
    const [hasChanges, setHasChanges] = useState(false);
    const [pendingEnabled, setPendingEnabled] = useState(enabled);
    const [publicKeyPreview, setPublicKeyPreview] = useState<string>('');
    const [showSuccessNotification, setShowSuccessNotification] = useState(false);
    const { isReady, error, regenerateKeys } = useNaClE2E();

    useEffect(() => {
        setPendingEnabled(enabled);
    }, [enabled]);

    useEffect(() => {
        // Load public key preview
        loadPublicKeyPreview();
    }, []);

    const loadPublicKeyPreview = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase
                    .from('users')
                    .select('public_key')
                    .eq('id', user.id)
                    .single();

                if (data?.public_key) {
                    // Show first and last 20 characters
                    const key = data.public_key;
                    setPublicKeyPreview(`${key.slice(0, 20)}...${key.slice(-20)}`);
                }
            }
        } catch (err) {
            logger.error('Failed to load public key:', err);
        }
    };

    const handleToggle = () => {
        setPendingEnabled(!pendingEnabled);
        setHasChanges(true);
    };

    const handleSave = () => {
        setE2EEnabled(pendingEnabled);
        setHasChanges(false);
        onClose();
    };

    const handleRegenerateKeys = async () => {
        if (confirm('Вы уверены? Это сделает все старые зашифрованные сообщения нечитаемыми.')) {
            await regenerateKeys();
            await loadPublicKeyPreview();
            setShowSuccessNotification(true);
            setTimeout(() => setShowSuccessNotification(false), 3000);
        }
    };

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.8)',
                backdropFilter: 'blur(10px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                animation: 'fadeIn 0.2s ease-out',
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: 'linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%)',
                    border: '1px solid rgba(0, 242, 255, 0.3)',
                    borderRadius: '16px',
                    padding: '24px',
                    minWidth: '500px',
                    maxWidth: '90%',
                    maxHeight: '80vh',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '20px',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}
                >
                    <h3
                        style={{
                            fontSize: '20px',
                            fontWeight: '600',
                            color: '#fff',
                            margin: 0,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                        }}
                    >
                        <span style={{ fontSize: '24px' }}>🔒</span>
                        Сквозное шифрование (E2E)
                    </h3>
                    <div
                        onClick={onClose}
                        style={{
                            cursor: 'pointer',
                            color: 'rgba(255, 255, 255, 0.6)',
                            fontSize: '24px',
                            lineHeight: '1',
                            padding: '4px 8px',
                        }}
                    >
                        ×
                    </div>
                </div>

                {/* Status */}
                {isReady && (
                    <div
                        style={{
                            padding: '12px 16px',
                            background: 'rgba(0, 242, 255, 0.1)',
                            border: '1px solid rgba(0, 242, 255, 0.3)',
                            borderRadius: '8px',
                            fontSize: '13px',
                            color: '#00f2ff',
                        }}
                    >
                        ✓ Ключи шифрования инициализированы
                    </div>
                )}

                {error && (
                    <div
                        style={{
                            padding: '12px 16px',
                            background: 'rgba(255, 0, 0, 0.1)',
                            border: '1px solid rgba(255, 0, 0, 0.3)',
                            borderRadius: '8px',
                            fontSize: '13px',
                            color: '#ff4444',
                        }}
                    >
                        ⚠ {error}
                    </div>
                )}

                {/* Enable/Disable Toggle */}
                <div
                    style={{
                        padding: '16px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        borderRadius: '12px',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}
                    >
                        <div>
                            <div style={{ fontSize: '15px', color: '#fff', fontWeight: '500' }}>
                                Включить E2E шифрование
                            </div>
                            <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)', marginTop: '4px' }}>
                                Сообщения будут зашифрованы на вашем устройстве
                            </div>
                        </div>
                        <label
                            style={{
                                position: 'relative',
                                display: 'inline-block',
                                width: '50px',
                                height: '26px',
                                cursor: 'pointer',
                            }}
                        >
                            <input
                                id="e2e-enabled-checkbox"
                                name="e2e-enabled"
                                type="checkbox"
                                checked={enabled}
                                onChange={handleToggle}
                                style={{ opacity: 0, width: 0, height: 0 }}
                            />
                            <span
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    background: enabled ? 'rgba(0, 242, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                                    borderRadius: '26px',
                                    transition: '0.3s',
                                    border: `1px solid ${enabled ? 'rgba(0, 242, 255, 0.5)' : 'rgba(255, 255, 255, 0.2)'}`,
                                }}
                            >
                                <span
                                    style={{
                                        position: 'absolute',
                                        content: '',
                                        height: '18px',
                                        width: '18px',
                                        left: enabled ? '28px' : '4px',
                                        bottom: '3px',
                                        background: enabled ? '#00f2ff' : 'rgba(255, 255, 255, 0.5)',
                                        borderRadius: '50%',
                                        transition: '0.3s',
                                    }}
                                />
                            </span>
                        </label>
                    </div>
                </div>

                {/* Info */}
                <div
                    style={{
                        padding: '16px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        borderRadius: '12px',
                    }}
                >
                    <div style={{ fontSize: '15px', color: '#fff', fontWeight: '500', marginBottom: '8px' }}>
                        Как это работает?
                    </div>
                    <ul
                        style={{
                            fontSize: '13px',
                            color: 'rgba(255, 255, 255, 0.7)',
                            lineHeight: '1.6',
                            margin: 0,
                            paddingLeft: '20px',
                        }}
                    >
                        <li>Ваши сообщения шифруются на устройстве перед отправкой</li>
                        <li>Используется ECDH (P-256) + AES-GCM шифрование</li>
                        <li>Perfect Forward Secrecy — каждое сообщение с уникальным ключом</li>
                        <li>Только получатель может расшифровать сообщения</li>
                        <li>Сервер не имеет доступа к содержимому</li>
                        <li>Зашифрованные сообщения помечены префиксом 🔒</li>
                    </ul>
                </div>

                {/* Public Key */}
                {publicKeyPreview && (
                    <div
                        style={{
                            padding: '16px',
                            background: 'rgba(255, 255, 255, 0.03)',
                            borderRadius: '12px',
                        }}
                    >
                        <div style={{ fontSize: '15px', color: '#fff', fontWeight: '500', marginBottom: '8px' }}>
                            Ваш публичный ключ
                        </div>
                        <div
                            style={{
                                fontSize: '12px',
                                color: 'rgba(255, 255, 255, 0.5)',
                                fontFamily: 'monospace',
                                wordBreak: 'break-all',
                                padding: '8px',
                                background: 'rgba(0, 0, 0, 0.3)',
                                borderRadius: '6px',
                            }}
                        >
                            {publicKeyPreview}
                        </div>
                    </div>
                )}

                {/* Regenerate Keys */}
                <div
                    style={{
                        padding: '16px',
                        background: 'rgba(255, 100, 0, 0.05)',
                        border: '1px solid rgba(255, 100, 0, 0.2)',
                        borderRadius: '12px',
                    }}
                >
                    <div style={{ fontSize: '15px', color: '#fff', fontWeight: '500', marginBottom: '8px' }}>
                        Перегенерировать ключи
                    </div>
                    <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '12px' }}>
                        ⚠️ Внимание: Старые зашифрованные сообщения станут нечитаемыми
                    </div>
                    <button
                        onClick={handleRegenerateKeys}
                        style={{
                            padding: '8px 16px',
                            background: 'rgba(255, 100, 0, 0.2)',
                            border: '1px solid rgba(255, 100, 0, 0.4)',
                            borderRadius: '8px',
                            color: '#ff6400',
                            fontSize: '13px',
                            cursor: 'pointer',
                        }}
                    >
                        Перегенерировать
                    </button>
                </div>

                {/* Actions */}
                <div
                    style={{
                        display: 'flex',
                        gap: '12px',
                        justifyContent: 'flex-end',
                        paddingTop: '8px',
                        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                    }}
                >
                    <button
                        onClick={onClose}
                        style={{
                            padding: '10px 20px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '8px',
                            color: '#fff',
                            fontSize: '14px',
                            cursor: 'pointer',
                        }}
                    >
                        Отмена
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!hasChanges}
                        style={{
                            padding: '10px 20px',
                            background: hasChanges ? 'rgba(0, 242, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                            border: `1px solid ${hasChanges ? 'rgba(0, 242, 255, 0.5)' : 'rgba(255, 255, 255, 0.2)'}`,
                            borderRadius: '8px',
                            color: hasChanges ? '#00f2ff' : 'rgba(255, 255, 255, 0.5)',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: hasChanges ? 'pointer' : 'not-allowed',
                        }}
                    >
                        Сохранить
                    </button>
                </div>

                {/* Success Notification */}
                {showSuccessNotification && (
                    <div
                        style={{
                            position: 'fixed',
                            top: '24px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            padding: '20px 28px',
                            background: 'linear-gradient(135deg, rgba(0, 242, 255, 0.98) 0%, rgba(0, 200, 255, 0.98) 100%)',
                            border: '2px solid rgba(255, 255, 255, 0.4)',
                            borderRadius: '16px',
                            boxShadow: '0 12px 48px rgba(0, 242, 255, 0.5), 0 0 80px rgba(0, 242, 255, 0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                            zIndex: 10000,
                            animation: 'slideDown 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                            backdropFilter: 'blur(10px)',
                            minWidth: '320px',
                        }}
                    >
                        <div
                            style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '50%',
                                background: 'rgba(255, 255, 255, 0.25)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '28px',
                                fontWeight: 'bold',
                                color: '#000',
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                                animation: 'pulse 0.6s ease-out',
                            }}
                        >
                            ✓
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{
                                fontSize: '17px',
                                fontWeight: '700',
                                color: '#000',
                                marginBottom: '4px',
                                letterSpacing: '0.3px'
                            }}>
                                🎉 Успешно!
                            </div>
                            <div style={{
                                fontSize: '14px',
                                color: 'rgba(0, 0, 0, 0.75)',
                                lineHeight: '1.4'
                            }}>
                                Ключи успешно перегенерированы
                            </div>
                        </div>
                        <div
                            onClick={() => setShowSuccessNotification(false)}
                            style={{
                                cursor: 'pointer',
                                fontSize: '24px',
                                color: 'rgba(0, 0, 0, 0.5)',
                                lineHeight: '1',
                                padding: '4px',
                                transition: 'color 0.2s',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(0, 0, 0, 0.8)'}
                            onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(0, 0, 0, 0.5)'}
                        >
                            ×
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                @keyframes slideDown {
                    from {
                        opacity: 0;
                        transform: translateX(-50%) translateY(-30px) scale(0.9);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(-50%) translateY(0) scale(1);
                    }
                }
                
                @keyframes pulse {
                    0% {
                        transform: scale(0.8);
                        opacity: 0.5;
                    }
                    50% {
                        transform: scale(1.1);
                    }
                    100% {
                        transform: scale(1);
                        opacity: 1;
                    }
                }
            `}</style>
        </div>
    );
}

// Helper function to check if E2E is enabled
export function isE2EEnabled(): boolean {
    return localStorage.getItem(STORAGE_KEY) === 'true';
}

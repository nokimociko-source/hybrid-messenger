import React, { useState } from 'react';
import { Icon, Icons, Spinner } from 'folds';
import { useEncryption } from '../context/EncryptionContext';
import { useTranslation } from 'react-i18next';
import { E2EERecoveryModal } from './E2EERecoveryModal';

interface MasterPasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function MasterPasswordModal({ isOpen, onClose, onSuccess }: MasterPasswordModalProps) {
    const { t } = useTranslation();
    const { unlock } = useEncryption();
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showRecovery, setShowRecovery] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async () => {
        if (!password) return;
        setLoading(true);
        setError(null);
        try {
            const success = await unlock(password);
            if (success) {
                onSuccess();
                onClose();
            } else {
                setError(t('encryption.wrong_password'));
            }
        } catch (err) {
            setError(t('encryption.error'));
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(20px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            animation: 'fadeIn 0.3s ease-out'
        }}>
            <div style={{
                background: 'rgba(20, 20, 20, 0.8)',
                border: '1px solid rgba(0, 242, 255, 0.2)',
                borderRadius: '32px',
                width: '420px',
                padding: '40px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 30px rgba(0, 242, 255, 0.1)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                gap: '24px'
            }}>
                <style>{`
                    @keyframes pulse-shield {
                        0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(0, 242, 255, 0.4), inset 0 0 20px rgba(0, 242, 255, 0.2); }
                        70% { transform: scale(1.05); box-shadow: 0 0 0 15px rgba(0, 242, 255, 0), inset 0 0 25px rgba(0, 242, 255, 0.3); }
                        100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(0, 242, 255, 0), inset 0 0 20px rgba(0, 242, 255, 0.2); }
                    }
                `}</style>

                <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '28px',
                    background: 'rgba(0, 242, 255, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#00f2ff',
                    marginBottom: '8px',
                    animation: 'pulse-shield 2s infinite cubic-bezier(0.4, 0, 0.6, 1)',
                    border: '1px solid rgba(0, 242, 255, 0.3)'
                }}>
                    <Icon size="400" src={Icons.Lock} />
                </div>

                <div>
                    <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#fff', margin: '0 0 8px 0' }}>
                        {t('encryption.master_password_title', 'Защищенный чат')}
                    </h2>
                    <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.5)', lineHeight: '1.6' }}>
                        {t('encryption.master_password_desc', 'Введите ваш мастер-пароль для расшифровки сообщений. Сообщения не покидают устройство в открытом виде.')}
                    </p>
                </div>

                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ position: 'relative', width: '100%' }}>
                        <input
                            type={showPassword ? "text" : "password"}
                            autoFocus
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                            placeholder={t('encryption.password_placeholder', 'Ваш секретный ключ...')}
                            style={{
                                width: '100%',
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '2px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '16px',
                                padding: '16px 48px 16px 20px',
                                color: '#fff',
                                fontSize: '16px',
                                outline: 'none',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                textAlign: 'center'
                            }}
                            onFocus={(e) => {
                                e.currentTarget.style.borderColor = 'rgba(0, 242, 255, 0.5)';
                                e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 242, 255, 0.1)';
                            }}
                            onBlur={(e) => {
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                        />
                        <button
                            onClick={() => setShowPassword(!showPassword)}
                            style={{
                                position: 'absolute',
                                right: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'none',
                                border: 'none',
                                color: 'rgba(255, 255, 255, 0.3)',
                                cursor: 'pointer',
                                padding: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'color 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(0, 242, 255, 0.8)'}
                            onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.3)'}
                        >
                            <Icon size="200" src={showPassword ? Icons.EyeBlind : Icons.Eye} />
                        </button>
                    </div>

                    {error && (
                        <div style={{ color: '#ff4d4d', fontSize: '13px', marginTop: '4px' }}>
                            {error}
                        </div>
                    )}

                    <div style={{ textAlign: 'center', marginTop: '4px' }}>
                        <button
                            onClick={() => setShowRecovery(true)}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'rgba(0, 242, 255, 0.7)',
                                fontSize: '13px',
                                fontWeight: '500',
                                cursor: 'pointer',
                                textDecoration: 'underline'
                            }}
                        >
                            {t('encryption.forgot_password', 'Забыли пароль?')}
                        </button>
                    </div>
                </div>

                <div style={{ width: '100%', display: 'flex', gap: '12px' }}>
                    <button
                        onClick={onClose}
                        style={{
                            flex: 1,
                            padding: '16px',
                            background: 'transparent',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '16px',
                            color: 'rgba(255, 255, 255, 0.6)',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        {t('common.cancel', 'Отмена')}
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || !password}
                        style={{
                            flex: 2,
                            padding: '16px',
                            background: 'linear-gradient(135deg, #00f2ff 0%, #0072ff 100%)',
                            border: 'none',
                            borderRadius: '16px',
                            color: '#fff',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            opacity: loading || !password ? 0.5 : 1,
                            transform: loading ? 'scale(0.98)' : 'scale(1)'
                        }}
                    >
                        {loading ? <Spinner variant="Secondary" /> : t('encryption.unlock', 'Открыть')}
                    </button>
                </div>
            </div>

            <E2EERecoveryModal
                isOpen={showRecovery}
                onClose={() => setShowRecovery(false)}
                onSuccess={() => {
                    setShowRecovery(false);
                    onSuccess();
                    onClose();
                }}
            />
        </div>
    );
}

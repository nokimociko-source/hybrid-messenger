import React, { useState } from 'react';
import { Icon, Icons, Spinner } from 'folds';
import { useEncryption } from '../context/EncryptionContext';
import { useTranslation } from 'react-i18next';

interface RecoveryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function E2EERecoveryModal({ isOpen, onClose, onSuccess }: RecoveryModalProps) {
    const { t } = useTranslation();
    const { recover } = useEncryption();
    const [step, setStep] = useState<1 | 2>(1);
    const [mnemonic, setMnemonic] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showMnemonic, setShowMnemonic] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleNextStep = () => {
        if (!mnemonic.trim()) return;
        setStep(2);
        setError(null);
    };

    const handleRecover = async () => {
        if (newPassword !== confirmPassword) {
            setError(t('encryption.passwords_dont_match', 'Пароли не совпадают'));
            return;
        }
        if (newPassword.length < 4) {
            setError(t('encryption.password_too_short', 'Пароль слишком короткий'));
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const success = await recover(mnemonic.trim().toLowerCase(), newPassword);
            if (success) {
                onSuccess();
            } else {
                setError(t('encryption.invalid_mnemonic', 'Неверная фраза восстановления'));
                setStep(1);
            }
        } catch (err) {
            setError(t('encryption.recovery_error', 'Ошибка при восстановлении'));
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
            background: 'rgba(0, 0, 0, 0.9)',
            backdropFilter: 'blur(30px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 11000,
            animation: 'fadeIn 0.3s ease-out'
        }}>
            <div style={{
                background: 'rgba(20, 20, 20, 0.9)',
                border: '1px solid rgba(0, 242, 255, 0.3)',
                borderRadius: '32px',
                width: '460px',
                padding: '40px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(0, 242, 255, 0.15)',
                display: 'flex',
                flexDirection: 'column',
                gap: '24px'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '20px',
                        background: 'rgba(0, 242, 255, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#00f2ff',
                        margin: '0 auto 16px',
                    }}>
                        <Icon size="300" src={step === 1 ? Icons.Shield : Icons.Lock} />
                    </div>
                    <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#fff', margin: '0 0 8px 0' }}>
                        {step === 1 ? 'Восстановление доступа' : 'Новый пароль'}
                    </h2>
                    <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.5)', lineHeight: '1.6' }}>
                        {step === 1
                            ? 'Введите 12 слов вашей фразы восстановления через пробел.'
                            : 'Придумайте новый мастер-пароль для ваших зашифрованных чатов.'}
                    </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {step === 1 ? (
                        <div style={{ position: 'relative', width: '100%' }}>
                            <textarea
                                autoFocus
                                value={mnemonic}
                                onChange={(e) => setMnemonic(e.target.value)}
                                placeholder="apple banana cherry..."
                                style={{
                                    width: '100%',
                                    height: '140px',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '2px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '16px',
                                    padding: '16px 48px 16px 16px',
                                    color: '#fff',
                                    fontSize: '15px',
                                    outline: 'none',
                                    resize: 'none',
                                    transition: 'all 0.3s',
                                    WebkitTextSecurity: showMnemonic ? 'none' : 'disc'
                                } as React.CSSProperties}
                                onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(0, 242, 255, 0.5)'}
                                onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
                            />
                            <button
                                onClick={() => setShowMnemonic(!showMnemonic)}
                                style={{
                                    position: 'absolute',
                                    right: '12px',
                                    top: '12px',
                                    background: 'none',
                                    border: 'none',
                                    color: 'rgba(255, 255, 255, 0.3)',
                                    cursor: 'pointer',
                                    padding: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    zIndex: 10
                                }}
                            >
                                <Icon size="200" src={showMnemonic ? Icons.EyeBlind : Icons.Eye} />
                            </button>
                        </div>
                    ) : (
                        <>
                            <div style={{ position: 'relative', width: '100%' }}>
                                <input
                                    type={showNewPassword ? "text" : "password"}
                                    autoFocus
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Новый мастер-пароль"
                                    style={inputStyle}
                                />
                                <button
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                    style={eyeButtonStyle}
                                >
                                    <Icon size="200" src={showNewPassword ? Icons.EyeBlind : Icons.Eye} />
                                </button>
                            </div>
                            <div style={{ position: 'relative', width: '100%' }}>
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Подтвердите пароль"
                                    style={inputStyle}
                                />
                                <button
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    style={eyeButtonStyle}
                                >
                                    <Icon size="200" src={showConfirmPassword ? Icons.EyeBlind : Icons.Eye} />
                                </button>
                            </div>
                        </>
                    )}

                    {error && (
                        <div style={{ color: '#ff4d4d', fontSize: '13px', textAlign: 'center' }}>
                            {error}
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        onClick={step === 1 ? onClose : () => setStep(1)}
                        style={secondaryButtonStyle}
                    >
                        {step === 1 ? 'Отмена' : 'Назад'}
                    </button>
                    <button
                        onClick={step === 1 ? handleNextStep : handleRecover}
                        disabled={loading || (step === 1 ? !mnemonic : !newPassword)}
                        style={primaryButtonStyle(loading || (step === 1 ? !mnemonic : !newPassword))}
                    >
                        {loading ? <Spinner variant="Secondary" /> : (step === 1 ? 'Далее' : 'Восстановить')}
                    </button>
                </div>
            </div>
        </div>
    );
}

const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '2px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '16px',
    padding: '16px 20px',
    color: '#fff',
    fontSize: '16px',
    outline: 'none',
    textAlign: 'center'
};

const eyeButtonStyle: React.CSSProperties = {
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
    transition: 'color 0.2s',
    zIndex: 10
};

const secondaryButtonStyle: React.CSSProperties = {
    flex: 1,
    padding: '16px',
    background: 'transparent',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '16px',
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '600',
    cursor: 'pointer'
};

const primaryButtonStyle = (disabled: boolean): React.CSSProperties => ({
    flex: 2,
    padding: '16px',
    background: 'linear-gradient(135deg, #00f2ff 0%, #0072ff 100%)',
    border: 'none',
    borderRadius: '16px',
    color: '#fff',
    fontWeight: '700',
    cursor: 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'all 0.3s'
});

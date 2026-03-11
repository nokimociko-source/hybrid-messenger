import React, { useState } from 'react';
import { useEncryption } from '../context/EncryptionContext';
import { CatloverModal } from './CatloverModal';
import { Icon, Icons } from 'folds';

interface EncryptionSetupModalProps {
    isOpen: boolean;
    onClose: () => void;
    roomId: string;
}

export function EncryptionSetupModal({ isOpen, onClose, roomId }: EncryptionSetupModalProps) {
    const { unlock, e2eEnabled, setE2EEnabled, masterKey } = useEncryption();
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleEnableE2EE = async () => {
        if (!password && !masterKey) {
            setError('Введите пароль для активации шифрования');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            if (!masterKey) {
                const success = await unlock(password);
                if (!success) {
                    setError('Неверный пароль или ошибка создания ключа');
                    setLoading(false);
                    return;
                }
            }
            setE2EEnabled(true);
            onClose();
        } catch (err) {
            setError('Ошибка при настройке шифрования');
        } finally {
            setLoading(false);
        }
    };

    return (
        <CatloverModal isOpen={isOpen} onClose={onClose} title="Настройка шифрования">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'center' }}>
                <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '20px',
                    background: 'rgba(0, 242, 255, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#00f2ff',
                    margin: '0 auto',
                    border: '1px solid rgba(0, 242, 255, 0.3)'
                }}>
                    <Icon size="400" src={Icons.Lock} />
                </div>

                <div>
                    <h3 style={{ marginBottom: '8px' }}>Защита ваших сообщений</h3>
                    <p style={{ fontSize: '14px', opacity: 0.7, lineHeight: '1.5' }}>
                        Для доступа к этому чату необходимо включить сквозное шифрование. 
                        Ваши сообщения будут зашифрованы вашим мастер-паролем.
                    </p>
                </div>

                {!masterKey && (
                    <div style={{ width: '100%' }}>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Введите ваш мастер-пароль"
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '10px',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: '#fff'
                            }}
                        />
                    </div>
                )}

                {error && (
                    <div style={{ color: '#ff4d4d', fontSize: '13px' }}>{error}</div>
                )}

                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        onClick={onClose}
                        style={{
                            flex: 1,
                            padding: '12px',
                            borderRadius: '10px',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: '#fff',
                            cursor: 'pointer'
                        }}
                    >
                        Отмена
                    </button>
                    <button
                        onClick={handleEnableE2EE}
                        disabled={loading}
                        style={{
                            flex: 2,
                            padding: '12px',
                            borderRadius: '10px',
                            background: '#00f2ff',
                            color: '#000',
                            fontWeight: 'bold',
                            border: 'none',
                            cursor: 'pointer',
                            opacity: loading ? 0.7 : 1
                        }}
                    >
                        {loading ? 'Настройка...' : 'Включить защиту'}
                    </button>
                </div>
            </div>
        </CatloverModal>
    );
}

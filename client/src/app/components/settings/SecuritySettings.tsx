import React, { useState } from 'react';
import { Icon, Icons } from 'folds';
import { CatloverModal } from '../CatloverModal';

interface SecuritySettingsProps {
    onClose: () => void;
}

export function SecuritySettings({ onClose }: SecuritySettingsProps) {
    const [masterPassword, setMasterPassword] = useState(localStorage.getItem('master_password') || '');
    const [isEncryptionEnabled, setIsEncryptionEnabled] = useState(localStorage.getItem('encryption_enabled') === 'true');
    const [adminKey, setAdminKey] = useState(localStorage.getItem('admin_access_key') || '2024');

    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [showKeyModal, setShowKeyModal] = useState(false);
    const [tempKey, setTempKey] = useState('');
    const [tempPassword, setTempPassword] = useState('');

    const handleToggleEncryption = () => {
        if (!isEncryptionEnabled && !masterPassword) {
            setShowPasswordModal(true);
            return;
        }
        const newState = !isEncryptionEnabled;
        setIsEncryptionEnabled(newState);
        localStorage.setItem('encryption_enabled', String(newState));
    };

    const handleSavePassword = (pwd?: string) => {
        if (!pwd) return;
        setMasterPassword(pwd);
        localStorage.setItem('master_password', pwd);
        localStorage.setItem('encryption_enabled', 'true');
        setIsEncryptionEnabled(true);
        setShowPasswordModal(false);
    };

    const handleSaveAdminKey = (key?: string) => {
        if (!key) return;
        setAdminKey(key);
        localStorage.setItem('admin_access_key', key);
        setShowKeyModal(false);
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(20px)',
            zIndex: 100000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            animation: 'fadeIn 0.3s ease-out'
        }}>
            <div style={{
                width: '100%',
                maxWidth: '500px',
                background: 'linear-gradient(135deg, #151515 0%, #0a0a0a 100%)',
                border: '1px solid rgba(0, 242, 255, 0.2)',
                borderRadius: '24px',
                padding: '32px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
                display: 'flex',
                flexDirection: 'column',
                gap: '24px'
            }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '16px',
                            background: 'rgba(0, 242, 255, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#00f2ff'
                        }}>
                            <Icon size="200" src={Icons.Lock} />
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '20px', color: '#fff' }}>Приватность и Безопасность</h2>
                            <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>Защитите свои данные и доступ к панели</p>
                        </div>
                    </div>
                    <div onClick={onClose} style={{ cursor: 'pointer', color: 'rgba(255,255,255,0.3)', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}>
                        <Icon size="200" src={Icons.Cross} />
                    </div>
                </div>

                {/* Section: Saved Messages Encryption */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontSize: '15px', color: '#fff', fontWeight: '500', marginBottom: '4px' }}>Шифрование "Избранного"</div>
                            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Локальное шифрование AES-256 для сохраненных сообщений</div>
                        </div>
                        <div
                            onClick={handleToggleEncryption}
                            style={{
                                width: '44px',
                                height: '24px',
                                borderRadius: '12px',
                                background: isEncryptionEnabled ? '#00f2ff' : 'rgba(255,255,255,0.1)',
                                position: 'relative',
                                cursor: 'pointer',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                            }}
                        >
                            <div style={{
                                width: '18px',
                                height: '18px',
                                borderRadius: '50%',
                                background: '#fff',
                                position: 'absolute',
                                top: '3px',
                                left: isEncryptionEnabled ? '23px' : '3px',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                            }} />
                        </div>
                    </div>

                    {isEncryptionEnabled && (
                        <div
                            onClick={() => setShowPasswordModal(true)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                marginTop: '8px',
                                color: '#00f2ff',
                                fontSize: '13px',
                                cursor: 'pointer',
                                padding: '8px 12px',
                                background: 'rgba(0, 242, 255, 0.05)',
                                borderRadius: '8px',
                                border: '1px solid rgba(0, 242, 255, 0.1)'
                            }}
                        >
                            <Icon size="100" src={Icons.Setting} />
                            <span>Изменить мастер-пароль</span>
                        </div>
                    )}
                </div>

                {/* Section: Admin Access */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px' }}>
                    <div style={{ fontSize: '15px', color: '#fff', fontWeight: '500' }}>Доступ к панели администратора</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                            Текущий ключ: <span style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace' }}>••••••</span>
                        </div>
                        <button
                            onClick={() => setShowKeyModal(true)}
                            style={{
                                padding: '8px 16px',
                                background: 'transparent',
                                border: '1px solid rgba(0, 242, 255, 0.3)',
                                borderRadius: '8px',
                                color: '#00f2ff',
                                fontSize: '13px',
                                fontWeight: '500',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0, 242, 255, 0.1)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                            Сменить ключ
                        </button>
                    </div>
                </div>

                {/* Alert/Warning */}
                <div style={{
                    padding: '16px',
                    background: 'rgba(255, 184, 0, 0.05)',
                    border: '1px solid rgba(255, 184, 0, 0.2)',
                    borderRadius: '16px',
                    display: 'flex',
                    gap: '12px'
                }}>
                    <Icon size="200" src={Icons.Info} style={{ color: '#ffb800' }} />
                    <div style={{ fontSize: '13px', color: 'rgba(255, 184, 0, 0.8)', lineHeight: '1.5' }}>
                        ВНИМАНИЕ: Если вы забудете мастер-пароль, вы потеряете доступ к своим зашифрованным сообщениям. Эти данные не могут быть восстановлены.
                    </div>
                </div>

                <CatloverModal
                    isOpen={showPasswordModal}
                    type="prompt"
                    title="Мастер-пароль"
                    message="Установите пароль для шифрования данных. Он будет храниться только локально."
                    placeholder="Ваш секретный пароль"
                    defaultValue={masterPassword}
                    confirmLabel="Установить"
                    onConfirm={handleSavePassword}
                    onCancel={() => setShowPasswordModal(false)}
                />

                <CatloverModal
                    isOpen={showKeyModal}
                    type="prompt"
                    title="Ключ доступа"
                    message="Введите новый ключ для входа в панель администратора:"
                    placeholder="Новый ключ"
                    defaultValue={adminKey}
                    confirmLabel="Обновить"
                    onConfirm={handleSaveAdminKey}
                    onCancel={() => setShowKeyModal(false)}
                />
            </div>
        </div>
    );
}

import { logger } from '../../utils/logger';
import React, { useState, useEffect } from 'react';
import { BlockedUsersModal } from '../BlockedUsersModal';
import { CatloverModal } from '../CatloverModal';
import { supabase } from '../../../supabaseClient';
import { useEncryption } from '../../context/EncryptionContext';
import { Icon, Icons, Spinner } from 'folds';
import { MnemonicService } from '../../utils/MnemonicService';
import { encryptText } from '../../utils/encryption';

interface PrivacySettingsProps {
    onBack: () => void;
}

interface PrivacyPreferences {
    showOnlineStatus: boolean;
    showLastSeen: boolean;
    showReadReceipts: boolean;
    showTypingIndicator: boolean;
    allowInvites: 'everyone' | 'contacts' | 'nobody';
    allowCalls: 'everyone' | 'contacts' | 'nobody';
    profilePhotoVisibility: 'everyone' | 'contacts' | 'nobody';
}

const STORAGE_KEY = 'privacy_preferences';

const defaultPreferences: PrivacyPreferences = {
    showOnlineStatus: true,
    showLastSeen: true,
    showReadReceipts: true,
    showTypingIndicator: true,
    allowInvites: 'everyone',
    allowCalls: 'contacts',
    profilePhotoVisibility: 'everyone',
};

export function PrivacySettings({ onBack }: PrivacySettingsProps) {
    const [preferences, setPreferences] = useState<PrivacyPreferences>(defaultPreferences);
    const [hasChanges, setHasChanges] = useState(false);
    const [showBlockedUsers, setShowBlockedUsers] = useState(false);
    const [blockedCount, setBlockedCount] = useState(0);
    const { mnemonic, generateMnemonic, verifyMnemonic, masterKey } = useEncryption();
    const [isGeneratingMnemonic, setIsGeneratingMnemonic] = useState(false);
    const [recoveryStatus, setRecoveryStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean;
        type: 'alert' | 'confirm';
        title: string;
        message: string;
        isDanger?: boolean;
    }>({
        isOpen: false,
        type: 'alert',
        title: '',
        message: ''
    });

    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                setPreferences({ ...defaultPreferences, ...JSON.parse(stored) });
            } catch (err) {
                logger.error('Failed to parse preferences:', err);
            }
        }

        // Load blocked users count
        loadBlockedCount();
    }, []);

    const loadBlockedCount = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { count, error } = await supabase
                .from('blocked_users')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id);

            if (error) throw error;
            setBlockedCount(count || 0);
        } catch (err) {
            logger.error('Error loading blocked count:', err);
        }
    };

    const updatePreference = <K extends keyof PrivacyPreferences>(
        key: K,
        value: PrivacyPreferences[K]
    ) => {
        setPreferences(prev => ({ ...prev, [key]: value }));
        setHasChanges(true);
    };

    const handleSave = () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
        setHasChanges(false);
        setModalConfig({
            isOpen: true,
            type: 'alert',
            title: 'Уведомление',
            message: 'Настройки конфиденциальности сохранены'
        });
    };

    const handleGenerateRecovery = async () => {
        setIsGeneratingMnemonic(true);
        try {
            const phrase = generateMnemonic();
            const { data: { user } } = await supabase.auth.getUser();

            if (user && masterKey) {
                const hash = await MnemonicService.hashMnemonic(phrase);
                const recoveryBundle = await encryptText(masterKey, phrase);

                // If migration is needed (auto-bundle using current masterKey as password)
                const passwordBundle = await encryptText(masterKey, masterKey);

                const { error } = await supabase
                    .from('users')
                    .update({
                        recovery_phrase_hash: hash,
                        recovery_master_key: recoveryBundle,
                        encrypted_master_key: passwordBundle
                    })
                    .eq('id', user.id);

                if (error) throw error;
                setRecoveryStatus('success');
            } else if (!masterKey) {
                setModalConfig({
                    isOpen: true,
                    type: 'alert',
                    title: 'Ошибка',
                    message: 'Сначала разблокируйте защищенные чаты мастер-паролем'
                });
            }
        } catch (err) {
            logger.error('Error generating mnemonic:', err);
            setRecoveryStatus('error');
            setModalConfig({
                isOpen: true,
                type: 'alert',
                title: 'Ошибка',
                message: 'Не удалось сохранить фразу восстановления'
            });
        } finally {
            setIsGeneratingMnemonic(false);
        }
    };

    const renderToggle = (
        label: string,
        description: string,
        key: keyof PrivacyPreferences,
        value: boolean
    ) => (
        <div
            onClick={() => updatePreference(key, !value as any)}
            style={{
                padding: '16px',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '12px',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
            }}
        >
            <div>
                <div style={{ fontSize: '15px', color: '#fff', fontWeight: '500' }}>
                    {label}
                </div>
                <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)' }}>
                    {description}
                </div>
            </div>
            <div
                style={{
                    width: '48px',
                    height: '28px',
                    borderRadius: '14px',
                    background: value ? 'rgba(0, 242, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                    border: `1px solid ${value ? 'rgba(0, 242, 255, 0.5)' : 'rgba(255, 255, 255, 0.2)'}`,
                    position: 'relative',
                    transition: 'all 0.2s',
                }}
            >
                <div
                    style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: value ? '#00f2ff' : '#fff',
                        position: 'absolute',
                        top: '3px',
                        left: value ? '24px' : '3px',
                        transition: 'all 0.2s',
                    }}
                />
            </div>
        </div>
    );

    const renderSelect = (
        label: string,
        description: string,
        key: keyof PrivacyPreferences,
        value: string
    ) => {
        const selectId = `privacy-${key}-select`;
        return (
            <div style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px' }}>
                <label
                    htmlFor={selectId}
                    style={{ fontSize: '15px', color: '#fff', fontWeight: '500', marginBottom: '4px', display: 'block' }}
                >
                    {label}
                </label>
                <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '12px' }}>
                    {description}
                </div>
                <select
                    id={selectId}
                    name={selectId}
                    value={value}
                    onChange={(e) => updatePreference(key, e.target.value as any)}
                    style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(0, 242, 255, 0.3)',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '14px',
                        cursor: 'pointer',
                    }}
                >
                    <option value="everyone">Все пользователи</option>
                    <option value="contacts">Только контакты</option>
                    <option value="nobody">Никто</option>
                </select>
            </div>
        );
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Info Banner */}
            <div style={{ padding: '16px', background: 'rgba(0, 242, 255, 0.1)', border: '1px solid rgba(0, 242, 255, 0.3)', borderRadius: '12px' }}>
                <div style={{ fontSize: '14px', color: '#00f2ff', display: 'flex', alignItems: 'start', gap: '12px' }}>
                    <span style={{ fontSize: '20px' }}>🔒</span>
                    <div>
                        <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                            Ваша конфиденциальность под контролем
                        </div>
                        <div style={{ fontSize: '13px', color: 'rgba(0, 242, 255, 0.8)' }}>
                            Настройте, кто может видеть вашу информацию и связываться с вами
                        </div>
                    </div>
                </div>
            </div>

            {/* Online Status */}
            {renderToggle(
                'Показывать статус "в сети"',
                'Другие пользователи увидят, когда вы онлайн',
                'showOnlineStatus',
                preferences.showOnlineStatus
            )}

            {/* Last Seen */}
            {renderToggle(
                'Показывать время последнего визита',
                'Отображать, когда вы были в сети последний раз',
                'showLastSeen',
                preferences.showLastSeen
            )}

            {/* Read Receipts */}
            {renderToggle(
                'Отправлять отчеты о прочтении',
                'Отправитель увидит, что вы прочитали сообщение',
                'showReadReceipts',
                preferences.showReadReceipts
            )}

            {/* Typing Indicator */}
            {renderToggle(
                'Показывать индикатор набора',
                'Собеседник увидит, когда вы печатаете',
                'showTypingIndicator',
                preferences.showTypingIndicator
            )}

            {/* Profile Photo Visibility */}
            {renderSelect(
                'Кто может видеть фото профиля',
                'Выберите, кто может просматривать ваше фото',
                'profilePhotoVisibility',
                preferences.profilePhotoVisibility
            )}

            {/* Allow Invites */}
            {renderSelect(
                'Кто может добавлять в группы',
                'Выберите, кто может приглашать вас в группы',
                'allowInvites',
                preferences.allowInvites
            )}

            {/* Allow Calls */}
            {renderSelect(
                'Кто может звонить',
                'Выберите, кто может совершать вам звонки',
                'allowCalls',
                preferences.allowCalls
            )}

            {/* E2EE Recovery Phrase */}
            <div style={{
                padding: '20px',
                background: 'rgba(0, 242, 255, 0.05)',
                border: '1px solid rgba(0, 242, 255, 0.2)',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        background: 'rgba(0, 242, 255, 0.1)',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Icon size="200" src={Icons.Lock} style={{ color: '#00f2ff' }} />
                    </div>
                    <div>
                        <div style={{ color: '#fff', fontSize: '16px', fontWeight: '600' }}>Фраза восстановления (E2EE)</div>
                        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>Используется для восстановления доступа к зашифрованным чатам</div>
                    </div>
                </div>

                {mnemonic ? (
                    <div style={{
                        padding: '16px',
                        background: 'rgba(0, 0, 0, 0.3)',
                        borderRadius: '12px',
                        border: '1px dashed rgba(0, 242, 255, 0.3)',
                        animation: 'fadeIn 0.3s ease-out'
                    }}>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: '8px'
                        }}>
                            {mnemonic.split(' ').map((word, i) => (
                                <div key={i} style={{
                                    padding: '8px',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    borderRadius: '6px',
                                    fontSize: '13px',
                                    color: '#fff',
                                    display: 'flex',
                                    gap: '8px'
                                }}>
                                    <span style={{ color: 'rgba(0, 242, 255, 0.5)', width: '16px' }}>{i + 1}</span>
                                    {word}
                                </div>
                            ))}
                        </div>
                        <div style={{
                            marginTop: '16px',
                            padding: '10px',
                            background: 'rgba(255, 77, 77, 0.1)',
                            borderRadius: '8px',
                            fontSize: '12px',
                            color: '#ff4d4d',
                            textAlign: 'center'
                        }}>
                            ⚠️ Сохраните эту фразу в надежном месте! Она показывается только один раз.
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={handleGenerateRecovery}
                        disabled={isGeneratingMnemonic}
                        style={{
                            padding: '12px',
                            background: 'rgba(0, 242, 255, 0.1)',
                            border: '1px solid #00f2ff',
                            borderRadius: '12px',
                            color: '#00f2ff',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            transition: 'all 0.2s'
                        }}
                    >
                        {isGeneratingMnemonic ? <Spinner size="100" variant="Secondary" /> : <Icon size="100" src={Icons.Plus} />}
                        Сгенерировать фразу восстановления
                    </button>
                )}
            </div>

            {/* Blocked Users */}
            <div
                onClick={() => setShowBlockedUsers(true)}
                style={{
                    padding: '16px',
                    background: 'rgba(255, 77, 77, 0.1)',
                    border: '1px solid rgba(255, 77, 77, 0.3)',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 77, 77, 0.15)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 77, 77, 0.1)';
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontSize: '15px', color: '#ff4d4d', fontWeight: '500' }}>
                            🚫 Заблокированные пользователи
                        </div>
                        <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)' }}>
                            Управление списком заблокированных
                        </div>
                    </div>
                    <div style={{
                        fontSize: '16px',
                        color: '#ff4d4d',
                        fontWeight: '600',
                        background: 'rgba(255, 77, 77, 0.2)',
                        padding: '4px 12px',
                        borderRadius: '12px',
                        minWidth: '32px',
                        textAlign: 'center'
                    }}>
                        {blockedCount}
                    </div>
                </div>
            </div>

            {/* Save Button */}
            {hasChanges && (
                <button
                    onClick={handleSave}
                    style={{
                        padding: '12px 24px',
                        background: 'rgba(0, 242, 255, 0.2)',
                        border: '1px solid rgba(0, 242, 255, 0.5)',
                        borderRadius: '8px',
                        color: '#00f2ff',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer',
                    }}
                >
                    Сохранить изменения
                </button>
            )}

            {/* Blocked Users Modal */}
            {showBlockedUsers && (
                <BlockedUsersModal
                    onClose={() => {
                        setShowBlockedUsers(false);
                        loadBlockedCount(); // Reload count when modal closes
                    }}
                />
            )}

            <CatloverModal
                isOpen={modalConfig.isOpen}
                type={modalConfig.type}
                title={modalConfig.title}
                message={modalConfig.message}
                isDanger={modalConfig.isDanger}
                onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
                onConfirm={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
            />
        </div>
    );
}

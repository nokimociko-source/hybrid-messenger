import { logger } from '../../utils/logger';
import React, { useState, useEffect } from 'react';
import { playSound } from '../../utils/platformNotifications';
import { CatloverModal } from '../CatloverModal';

interface NotificationSettingsProps {
    onBack: () => void;
}

interface NotificationPreferences {
    enabled: boolean;
    sound: boolean;
    desktop: boolean;
    messagePreview: boolean;
    groupNotifications: boolean;
    directNotifications: boolean;
    mentionOnly: boolean;
    soundType: 'default' | 'custom';
    volume: number;
}

const STORAGE_KEY = 'notification_preferences';

const defaultPreferences: NotificationPreferences = {
    enabled: true,
    sound: true,
    desktop: true,
    messagePreview: true,
    groupNotifications: true,
    directNotifications: true,
    mentionOnly: false,
    soundType: 'default',
    volume: 0.7,
};

export function NotificationSettings({ onBack }: NotificationSettingsProps) {
    const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
    const [hasChanges, setHasChanges] = useState(false);
    const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
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

        if ('Notification' in window) {
            setPermissionStatus(Notification.permission);
        }
    }, []);

    const updatePreference = <K extends keyof NotificationPreferences>(
        key: K,
        value: NotificationPreferences[K]
    ) => {
        setPreferences(prev => ({ ...prev, [key]: value }));
        setHasChanges(true);
    };

    const requestPermission = async () => {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            setPermissionStatus(permission);
            if (permission === 'granted') {
                updatePreference('desktop', true);
            }
        }
    };

    const testSound = () => {
        const audio = playSound('/sound/notification.ogg', false);
        if (audio) {
            audio.volume = preferences.volume;
        }
    };

    const handleSave = () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
        setHasChanges(false);
        setModalConfig({
            isOpen: true,
            type: 'alert',
            title: 'Уведомление',
            message: 'Настройки уведомлений сохранены'
        });
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Master Toggle */}
            <div
                onClick={() => updatePreference('enabled', !preferences.enabled)}
                style={{
                    padding: '16px',
                    background: preferences.enabled ? 'var(--bg-active)' : 'rgba(255, 77, 77, 0.1)',
                    border: `1px solid ${preferences.enabled ? 'var(--border-primary)' : 'rgba(255, 77, 77, 0.3)'}`,
                    borderRadius: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                }}
            >
                <div>
                    <div style={{ fontSize: '16px', color: '#fff', fontWeight: '500' }}>
                        {preferences.enabled ? '🔔 Уведомления включены' : '🔕 Уведомления выключены'}
                    </div>
                    <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)', marginTop: '4px' }}>
                        {preferences.enabled ? 'Вы получаете уведомления' : 'Все уведомления отключены'}
                    </div>
                </div>
                <div
                    style={{
                        width: '52px',
                        height: '30px',
                        borderRadius: '15px',
                        background: preferences.enabled ? 'rgba(0, 242, 255, 0.3)' : 'rgba(255, 77, 77, 0.3)',
                        border: `1px solid ${preferences.enabled ? 'rgba(0, 242, 255, 0.5)' : 'rgba(255, 77, 77, 0.5)'}`,
                        position: 'relative',
                        transition: 'all 0.2s',
                    }}
                >
                    <div
                        style={{
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            background: preferences.enabled ? '#00f2ff' : '#ff4d4d',
                            position: 'absolute',
                            top: '3px',
                            left: preferences.enabled ? '26px' : '3px',
                            transition: 'all 0.2s',
                        }}
                    />
                </div>
            </div>

            {/* Desktop Notifications */}
            {permissionStatus !== 'granted' && (
                <div style={{ padding: '16px', background: 'rgba(255, 149, 0, 0.1)', border: '1px solid rgba(255, 149, 0, 0.3)', borderRadius: '12px' }}>
                    <div style={{ fontSize: '15px', color: '#ff9500', fontWeight: '500', marginBottom: '8px' }}>
                        ⚠️ Разрешение не предоставлено
                    </div>
                    <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '12px' }}>
                        Для получения уведомлений на рабочем столе необходимо разрешение браузера
                    </div>
                    <button
                        onClick={requestPermission}
                        style={{
                            padding: '8px 16px',
                            background: 'rgba(255, 149, 0, 0.2)',
                            border: '1px solid rgba(255, 149, 0, 0.5)',
                            borderRadius: '8px',
                            color: '#ff9500',
                            fontSize: '13px',
                            cursor: 'pointer',
                        }}
                    >
                        Запросить разрешение
                    </button>
                </div>
            )}

            {/* Sound Settings */}
            <div style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div>
                        <div style={{ fontSize: '15px', color: '#fff', fontWeight: '500' }}>
                            Звук уведомлений
                        </div>
                        <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)' }}>
                            Воспроизводить звук при новых сообщениях
                        </div>
                    </div>
                    <div
                        onClick={() => updatePreference('sound', !preferences.sound)}
                        style={{
                            width: '48px',
                            height: '28px',
                            borderRadius: '14px',
                            background: preferences.sound ? 'rgba(0, 242, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                            border: `1px solid ${preferences.sound ? 'rgba(0, 242, 255, 0.5)' : 'rgba(255, 255, 255, 0.2)'}`,
                            position: 'relative',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                        }}
                    >
                        <div
                            style={{
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                background: preferences.sound ? '#00f2ff' : '#fff',
                                position: 'absolute',
                                top: '3px',
                                left: preferences.sound ? '24px' : '3px',
                                transition: 'all 0.2s',
                            }}
                        />
                    </div>
                </div>

                {preferences.sound && (
                    <>
                        <div style={{ marginBottom: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <label htmlFor="notification-volume-input" style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.7)' }}>Громкость</label>
                                <span style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)' }}>{Math.round(preferences.volume * 100)}%</span>
                            </div>
                            <input
                                id="notification-volume-input"
                                name="notification-volume"
                                type="range"
                                min="0"
                                max="1"
                                step="0.1"
                                value={preferences.volume}
                                onChange={(e) => updatePreference('volume', parseFloat(e.target.value))}
                                style={{ width: '100%', cursor: 'pointer' }}
                            />
                        </div>
                        <button
                            onClick={testSound}
                            style={{
                                padding: '8px 16px',
                                background: 'rgba(0, 242, 255, 0.1)',
                                border: '1px solid rgba(0, 242, 255, 0.3)',
                                borderRadius: '8px',
                                color: '#00f2ff',
                                fontSize: '13px',
                                cursor: 'pointer',
                            }}
                        >
                            🔊 Проверить звук
                        </button>
                    </>
                )}
            </div>

            {/* Message Preview */}
            <div
                onClick={() => updatePreference('messagePreview', !preferences.messagePreview)}
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
                        Предпросмотр сообщений
                    </div>
                    <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)' }}>
                        Показывать текст сообщения в уведомлении
                    </div>
                </div>
                <div
                    style={{
                        width: '48px',
                        height: '28px',
                        borderRadius: '14px',
                        background: preferences.messagePreview ? 'rgba(0, 242, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                        border: `1px solid ${preferences.messagePreview ? 'rgba(0, 242, 255, 0.5)' : 'rgba(255, 255, 255, 0.2)'}`,
                        position: 'relative',
                        transition: 'all 0.2s',
                    }}
                >
                    <div
                        style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            background: preferences.messagePreview ? '#00f2ff' : '#fff',
                            position: 'absolute',
                            top: '3px',
                            left: preferences.messagePreview ? '24px' : '3px',
                            transition: 'all 0.2s',
                        }}
                    />
                </div>
            </div>

            {/* Group Notifications */}
            <div
                onClick={() => updatePreference('groupNotifications', !preferences.groupNotifications)}
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
                        Уведомления из групп
                    </div>
                    <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)' }}>
                        Получать уведомления о сообщениях в группах
                    </div>
                </div>
                <div
                    style={{
                        width: '48px',
                        height: '28px',
                        borderRadius: '14px',
                        background: preferences.groupNotifications ? 'rgba(0, 242, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                        border: `1px solid ${preferences.groupNotifications ? 'rgba(0, 242, 255, 0.5)' : 'rgba(255, 255, 255, 0.2)'}`,
                        position: 'relative',
                        transition: 'all 0.2s',
                    }}
                >
                    <div
                        style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            background: preferences.groupNotifications ? '#00f2ff' : '#fff',
                            position: 'absolute',
                            top: '3px',
                            left: preferences.groupNotifications ? '24px' : '3px',
                            transition: 'all 0.2s',
                        }}
                    />
                </div>
            </div>

            {/* Mention Only */}
            {preferences.groupNotifications && (
                <div
                    onClick={() => updatePreference('mentionOnly', !preferences.mentionOnly)}
                    style={{
                        padding: '16px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: '-12px',
                    }}
                >
                    <div>
                        <div style={{ fontSize: '15px', color: '#fff', fontWeight: '500' }}>
                            Только упоминания
                        </div>
                        <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)' }}>
                            Уведомлять только когда вас упомянули
                        </div>
                    </div>
                    <div
                        style={{
                            width: '48px',
                            height: '28px',
                            borderRadius: '14px',
                            background: preferences.mentionOnly ? 'rgba(0, 242, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                            border: `1px solid ${preferences.mentionOnly ? 'rgba(0, 242, 255, 0.5)' : 'rgba(255, 255, 255, 0.2)'}`,
                            position: 'relative',
                            transition: 'all 0.2s',
                        }}
                    >
                        <div
                            style={{
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                background: preferences.mentionOnly ? '#00f2ff' : '#fff',
                                position: 'absolute',
                                top: '3px',
                                left: preferences.mentionOnly ? '24px' : '3px',
                                transition: 'all 0.2s',
                            }}
                        />
                    </div>
                </div>
            )}

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

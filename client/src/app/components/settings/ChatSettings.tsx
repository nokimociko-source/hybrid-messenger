import { logger } from '../../utils/logger';
import React, { useState, useEffect } from 'react';
import { CatloverModal } from '../CatloverModal';

interface ChatSettingsProps {
    onBack: () => void;
}

interface ChatPreferences {
    enterToSend: boolean;
    showTimestamps: boolean;
    groupMessagesBy: 'sender' | 'time' | 'none';
    emojiSize: 'small' | 'medium' | 'large';
    showAvatars: boolean;
    showUsernames: boolean;
    linkPreview: boolean;
    autoDownloadMedia: boolean;
    autoPlayGifs: boolean;
    autoPlayVideos: boolean;
}

const STORAGE_KEY = 'chat_preferences';

const defaultPreferences: ChatPreferences = {
    enterToSend: true,
    showTimestamps: true,
    groupMessagesBy: 'sender',
    emojiSize: 'medium',
    showAvatars: true,
    showUsernames: true,
    linkPreview: true,
    autoDownloadMedia: true,
    autoPlayGifs: true,
    autoPlayVideos: false,
};

export function ChatSettings({ onBack }: ChatSettingsProps) {
    const [preferences, setPreferences] = useState<ChatPreferences>(defaultPreferences);
    const [hasChanges, setHasChanges] = useState(false);
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
    }, []);

    const updatePreference = <K extends keyof ChatPreferences>(
        key: K,
        value: ChatPreferences[K]
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
            message: 'Настройки чатов сохранены'
        });
    };

    const renderToggle = (
        label: string,
        description: string,
        key: keyof ChatPreferences,
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

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Enter to Send */}
            {renderToggle(
                'Enter для отправки',
                'Отправлять сообщение по нажатию Enter (Shift+Enter для новой строки)',
                'enterToSend',
                preferences.enterToSend
            )}

            {/* Show Timestamps */}
            {renderToggle(
                'Показывать время сообщений',
                'Отображать время отправки каждого сообщения',
                'showTimestamps',
                preferences.showTimestamps
            )}

            {/* Show Avatars */}
            {renderToggle(
                'Показывать аватары',
                'Отображать фото профиля рядом с сообщениями',
                'showAvatars',
                preferences.showAvatars
            )}

            {/* Show Usernames */}
            {renderToggle(
                'Показывать имена пользователей',
                'Отображать имя отправителя над сообщением',
                'showUsernames',
                preferences.showUsernames
            )}

            {/* Group Messages */}
            <div style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px' }}>
                <label htmlFor="group-messages-select" style={{ fontSize: '15px', color: '#fff', fontWeight: '500', marginBottom: '4px', display: 'block' }}>
                    Группировка сообщений
                </label>
                <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '12px' }}>
                    Как объединять последовательные сообщения
                </div>
                <select
                    id="group-messages-select"
                    name="group-messages"
                    value={preferences.groupMessagesBy}
                    onChange={(e) => updatePreference('groupMessagesBy', e.target.value as any)}
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
                    <option value="sender">По отправителю</option>
                    <option value="time">По времени (5 минут)</option>
                    <option value="none">Не группировать</option>
                </select>
            </div>

            {/* Emoji Size */}
            <div style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px' }}>
                <div style={{ fontSize: '15px', color: '#fff', fontWeight: '500', marginBottom: '4px' }}>
                    Размер эмодзи
                </div>
                <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '12px' }}>
                    Размер отображения эмодзи в сообщениях
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {(['small', 'medium', 'large'] as const).map((size) => (
                        <button
                            key={size}
                            onClick={() => updatePreference('emojiSize', size)}
                            style={{
                                flex: 1,
                                padding: '10px',
                                background: preferences.emojiSize === size ? 'rgba(0, 242, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                                border: `1px solid ${preferences.emojiSize === size ? 'rgba(0, 242, 255, 0.5)' : 'rgba(255, 255, 255, 0.1)'}`,
                                borderRadius: '8px',
                                color: preferences.emojiSize === size ? '#00f2ff' : '#fff',
                                fontSize: size === 'small' ? '16px' : size === 'medium' ? '20px' : '24px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                            }}
                        >
                            😊
                        </button>
                    ))}
                </div>
            </div>

            {/* Link Preview */}
            {renderToggle(
                'Предпросмотр ссылок',
                'Показывать превью для ссылок в сообщениях',
                'linkPreview',
                preferences.linkPreview
            )}

            {/* Auto Download Media */}
            {renderToggle(
                'Автозагрузка медиа',
                'Автоматически загружать изображения и файлы',
                'autoDownloadMedia',
                preferences.autoDownloadMedia
            )}

            {/* Auto Play GIFs */}
            {renderToggle(
                'Автовоспроизведение GIF',
                'Автоматически воспроизводить GIF-анимации',
                'autoPlayGifs',
                preferences.autoPlayGifs
            )}

            {/* Auto Play Videos */}
            {renderToggle(
                'Автовоспроизведение видео',
                'Автоматически воспроизводить видео при прокрутке',
                'autoPlayVideos',
                preferences.autoPlayVideos
            )}

            {/* Sticker Packs */}
            <div
                style={{
                    padding: '16px',
                    background: 'rgba(0, 242, 255, 0.05)',
                    border: '1px solid rgba(0, 242, 255, 0.2)',
                    borderRadius: '12px',
                    cursor: 'pointer',
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontSize: '15px', color: '#00f2ff', fontWeight: '500' }}>
                            🎨 Наборы стикеров
                        </div>
                        <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)' }}>
                            Управление установленными стикерами
                        </div>
                    </div>
                    <div style={{ fontSize: '20px' }}>→</div>
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

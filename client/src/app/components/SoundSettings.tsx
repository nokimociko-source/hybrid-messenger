import { logger } from '../utils/logger';
import React, { useState, useEffect } from 'react';
import { Icon, Icons } from 'folds';
import { playSound } from '../utils/platformNotifications';

interface SoundSettingsProps {
    onClose: () => void;
}

type SoundType = 'message' | 'call' | 'none';

interface SoundPreferences {
    messageSound: SoundType;
    callSound: SoundType;
    volume: number;
}

const STORAGE_KEY = 'sound_preferences';

const defaultPreferences: SoundPreferences = {
    messageSound: 'message',
    callSound: 'call',
    volume: 0.7,
};

export function SoundSettings({ onClose }: SoundSettingsProps) {
    const [preferences, setPreferences] = useState<SoundPreferences>(defaultPreferences);
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        // Load preferences from localStorage
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                setPreferences({ ...defaultPreferences, ...parsed });
            } catch (err) {
                logger.error('Failed to parse sound preferences:', err);
            }
        }
    }, []);

    const handleSave = () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
        setHasChanges(false);
        onClose();
    };

    const handleReset = () => {
        setPreferences(defaultPreferences);
        setHasChanges(true);
    };

    const updatePreference = <K extends keyof SoundPreferences>(
        key: K,
        value: SoundPreferences[K]
    ) => {
        setPreferences(prev => ({ ...prev, [key]: value }));
        setHasChanges(true);
    };

    const testSound = (type: 'message' | 'call') => {
        const soundUrl = type === 'message' ? '/sound/notification.ogg' : '/sound/invite.ogg';
        const audio = playSound(soundUrl, false);
        if (audio) {
            audio.volume = preferences.volume;
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
                        <span style={{ fontSize: '24px' }}>🔊</span>
                        Настройки звуков
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

                {/* Message Sound */}
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
                            marginBottom: '12px',
                        }}
                    >
                        <div>
                            <label htmlFor="sound-message-select" style={{ fontSize: '15px', color: '#fff', fontWeight: '500', display: 'block' }}>
                                Звук сообщений
                            </label>
                            <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)' }}>
                                Воспроизводится при получении нового сообщения
                            </div>
                        </div>
                        <button
                            onClick={() => testSound('message')}
                            disabled={preferences.messageSound === 'none'}
                            style={{
                                padding: '8px 16px',
                                background: 'rgba(0, 242, 255, 0.1)',
                                border: '1px solid rgba(0, 242, 255, 0.3)',
                                borderRadius: '8px',
                                color: '#00f2ff',
                                fontSize: '13px',
                                cursor: preferences.messageSound === 'none' ? 'not-allowed' : 'pointer',
                                opacity: preferences.messageSound === 'none' ? 0.5 : 1,
                            }}
                        >
                            Тест
                        </button>
                    </div>
                    <select
                        id="sound-message-select"
                        name="sound-message"
                        value={preferences.messageSound}
                        onChange={(e) => updatePreference('messageSound', e.target.value as SoundType)}
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
                        <option value="message">Стандартный звук</option>
                        <option value="none">Без звука</option>
                    </select>
                </div>

                {/* Call Sound */}
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
                            marginBottom: '12px',
                        }}
                    >
                        <div>
                            <label htmlFor="sound-call-select" style={{ fontSize: '15px', color: '#fff', fontWeight: '500', display: 'block' }}>
                                Звук звонков
                            </label>
                            <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)' }}>
                                Воспроизводится при входящем звонке
                            </div>
                        </div>
                        <button
                            onClick={() => testSound('call')}
                            disabled={preferences.callSound === 'none'}
                            style={{
                                padding: '8px 16px',
                                background: 'rgba(0, 242, 255, 0.1)',
                                border: '1px solid rgba(0, 242, 255, 0.3)',
                                borderRadius: '8px',
                                color: '#00f2ff',
                                fontSize: '13px',
                                cursor: preferences.callSound === 'none' ? 'not-allowed' : 'pointer',
                                opacity: preferences.callSound === 'none' ? 0.5 : 1,
                            }}
                        >
                            Тест
                        </button>
                    </div>
                    <select
                        id="sound-call-select"
                        name="sound-call"
                        value={preferences.callSound}
                        onChange={(e) => updatePreference('callSound', e.target.value as SoundType)}
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
                        <option value="call">Стандартный звук</option>
                        <option value="none">Без звука</option>
                    </select>
                </div>

                {/* Volume Control */}
                <div
                    style={{
                        padding: '16px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        borderRadius: '12px',
                    }}
                >
                    <div style={{ marginBottom: '12px' }}>
                        <label htmlFor="sound-volume-input" style={{ fontSize: '15px', color: '#fff', fontWeight: '500', display: 'block' }}>
                            Громкость
                        </label>
                        <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)' }}>
                            {Math.round(preferences.volume * 100)}%
                        </div>
                    </div>
                    <input
                        id="sound-volume-input"
                        name="sound-volume"
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={preferences.volume}
                        onChange={(e) => updatePreference('volume', parseFloat(e.target.value))}
                        style={{
                            width: '100%',
                            cursor: 'pointer',
                        }}
                    />
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
                        onClick={handleReset}
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
                        Сбросить
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
            </div>
        </div>
    );
}

// Helper function to get sound preferences
export function getSoundPreferences(): SoundPreferences {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        try {
            return { ...defaultPreferences, ...JSON.parse(stored) };
        } catch {
            return defaultPreferences;
        }
    }
    return defaultPreferences;
}

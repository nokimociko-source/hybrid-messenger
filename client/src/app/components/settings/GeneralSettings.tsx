import { logger } from '../../utils/logger';
import React, { useState, useEffect } from 'react';
import { Box, Text, Button, Switch, Menu, MenuItem, Icon, Icons } from 'folds';
import { CatloverModal } from '../CatloverModal';
import { LanguageSelector } from '../LanguageSelector';
import { useI18n } from '../../hooks/useI18n';

interface GeneralSettingsProps {
    onBack: () => void;
}

type Theme = 'dark' | 'light' | 'auto';
type Language = 'ru' | 'en';

interface GeneralPreferences {
    theme: Theme;
    language: Language;
    fontSize: number;
    animations: boolean;
    compactMode: boolean;
}

const STORAGE_KEY = 'general_preferences';

const defaultPreferences: GeneralPreferences = {
    theme: 'dark',
    language: 'ru',
    fontSize: 14,
    animations: true,
    compactMode: false,
};

export function GeneralSettings({ onBack }: GeneralSettingsProps) {
    const [preferences, setPreferences] = useState<GeneralPreferences>(defaultPreferences);
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
    const { t } = useI18n();

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

    const updatePreference = <K extends keyof GeneralPreferences>(
        key: K,
        value: GeneralPreferences[K]
    ) => {
        setPreferences(prev => ({ ...prev, [key]: value }));
        setHasChanges(true);
    };

    const handleSave = () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
        setHasChanges(false);

        // Apply theme
        document.documentElement.setAttribute('data-theme', preferences.theme);

        // Apply font size
        document.documentElement.style.fontSize = `${preferences.fontSize}px`;

        setModalConfig({
            isOpen: true,
            type: 'alert',
            title: t('ui.notification') || 'Уведомление',
            message: t('ui.settings_saved') || 'Настройки сохранены'
        });
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Theme */}
            <div style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px' }}>
                <div style={{ fontSize: '15px', color: '#fff', fontWeight: '500', marginBottom: '12px' }}>
                    {t('ui.theme')}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {(['dark', 'light', 'auto'] as Theme[]).map((theme) => (
                        <button
                            key={theme}
                            onClick={() => updatePreference('theme', theme)}
                            style={{
                                flex: 1,
                                padding: '10px',
                                background: preferences.theme === theme ? 'rgba(0, 242, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                                border: `1px solid ${preferences.theme === theme ? 'rgba(0, 242, 255, 0.5)' : 'rgba(255, 255, 255, 0.1)'}`,
                                borderRadius: '8px',
                                color: preferences.theme === theme ? '#00f2ff' : '#fff',
                                fontSize: '13px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                            }}
                        >
                            {theme === 'dark' ? t('ui.dark_theme') : theme === 'light' ? t('ui.light_theme') : t('ui.auto_theme')}
                        </button>
                    ))}
                </div>
            </div>

            {/* Language */}
            <Box direction="Column" gap="200" style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px' }}>
                <LanguageSelector variant="button" size="medium" />
            </Box>

            {/* Font Size */}
            <div style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <label htmlFor="general-font-size-input" style={{ fontSize: '15px', color: '#fff', fontWeight: '500' }}>
                        {t('ui.font_size')}
                    </label>
                    <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)' }}>
                        {preferences.fontSize}px
                    </div>
                </div>
                <input
                    id="general-font-size-input"
                    name="general-font-size"
                    type="range"
                    min="12"
                    max="18"
                    step="1"
                    value={preferences.fontSize}
                    onChange={(e) => updatePreference('fontSize', parseInt(e.target.value))}
                    style={{ width: '100%', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'rgba(255, 255, 255, 0.4)', marginTop: '4px' }}>
                    <span>{t('ui.small')}</span>
                    <span>{t('ui.large')}</span>
                </div>
            </div>

            {/* Animations */}
            <div
                onClick={() => updatePreference('animations', !preferences.animations)}
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
                        {t('ui.animations')}
                    </div>
                    <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)' }}>
                        {t('ui.smooth_transitions')}
                    </div>
                </div>
                <div
                    style={{
                        width: '48px',
                        height: '28px',
                        borderRadius: '14px',
                        background: preferences.animations ? 'rgba(0, 242, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                        border: `1px solid ${preferences.animations ? 'rgba(0, 242, 255, 0.5)' : 'rgba(255, 255, 255, 0.2)'}`,
                        position: 'relative',
                        transition: 'all 0.2s',
                    }}
                >
                    <div
                        style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            background: preferences.animations ? '#00f2ff' : '#fff',
                            position: 'absolute',
                            top: '3px',
                            left: preferences.animations ? '24px' : '3px',
                            transition: 'all 0.2s',
                        }}
                    />
                </div>
            </div>

            {/* Compact Mode */}
            <div
                onClick={() => updatePreference('compactMode', !preferences.compactMode)}
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
                        {t('ui.compact_mode')}
                    </div>
                    <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)' }}>
                        {t('ui.reduced_padding')}
                    </div>
                </div>
                <div
                    style={{
                        width: '48px',
                        height: '28px',
                        borderRadius: '14px',
                        background: preferences.compactMode ? 'rgba(0, 242, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                        border: `1px solid ${preferences.compactMode ? 'rgba(0, 242, 255, 0.5)' : 'rgba(255, 255, 255, 0.2)'}`,
                        position: 'relative',
                        transition: 'all 0.2s',
                    }}
                >
                    <div
                        style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            background: preferences.compactMode ? '#00f2ff' : '#fff',
                            position: 'absolute',
                            top: '3px',
                            left: preferences.compactMode ? '24px' : '3px',
                            transition: 'all 0.2s',
                        }}
                    />
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
                    {t('ui.save_changes')}
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

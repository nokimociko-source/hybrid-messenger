import { logger } from '../../utils/logger';
import React, { useState, useEffect } from 'react';
import { CatloverModal } from '../CatloverModal';

interface AdvancedSettingsProps {
    onBack: () => void;
    onOpenAdmin?: () => void;
}

interface AdvancedPreferences {
    developerMode: boolean;
    debugLogs: boolean;
    experimentalFeatures: boolean;
    hardwareAcceleration: boolean;
    betaUpdates: boolean;
    sendCrashReports: boolean;
    sendUsageStats: boolean;
}

const STORAGE_KEY = 'advanced_preferences';

const defaultPreferences: AdvancedPreferences = {
    developerMode: false,
    debugLogs: false,
    experimentalFeatures: false,
    hardwareAcceleration: true,
    betaUpdates: false,
    sendCrashReports: true,
    sendUsageStats: false,
};

export function AdvancedSettings({ onBack, onOpenAdmin }: AdvancedSettingsProps) {
    const [preferences, setPreferences] = useState<AdvancedPreferences>(defaultPreferences);
    const [hasChanges, setHasChanges] = useState(false);
    const [showDevTools, setShowDevTools] = useState(false);
    const [versionClicks, setVersionClicks] = useState(0);
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

    const updatePreference = <K extends keyof AdvancedPreferences>(
        key: K,
        value: AdvancedPreferences[K]
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
            message: 'Расширенные настройки сохранены'
        });
    };

    const handleVersionClick = () => {
        const newCount = versionClicks + 1;
        setVersionClicks(newCount);

        if (newCount === 5) {
            setVersionClicks(0); // reset
            if (onOpenAdmin) onOpenAdmin();
        }
    };

    const renderToggle = (
        label: string,
        description: string,
        key: keyof AdvancedPreferences,
        value: boolean,
        warning?: boolean
    ) => (
        <div
            onClick={() => updatePreference(key, !value as any)}
            style={{
                padding: '16px',
                background: warning ? 'rgba(255, 149, 0, 0.05)' : 'rgba(255, 255, 255, 0.03)',
                border: `1px solid ${warning ? 'rgba(255, 149, 0, 0.2)' : 'rgba(255, 255, 255, 0.1)'}`,
                borderRadius: '12px',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
            }}
        >
            <div>
                <div style={{ fontSize: '15px', color: warning ? '#ff9500' : '#fff', fontWeight: '500' }}>
                    {warning && '⚠️ '}{label}
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
        <div className="custom-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Warning Banner */}
            <div style={{ padding: '16px', background: 'rgba(255, 149, 0, 0.1)', border: '1px solid rgba(255, 149, 0, 0.3)', borderRadius: '12px' }}>
                <div style={{ fontSize: '14px', color: '#ff9500', display: 'flex', alignItems: 'start', gap: '12px' }}>
                    <span style={{ fontSize: '20px' }}>⚠️</span>
                    <div>
                        <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                            Для опытных пользователей
                        </div>
                        <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.7)' }}>
                            Изменение этих настроек может повлиять на стабильность приложения
                        </div>
                    </div>
                </div>
            </div>

            {/* Developer Mode */}
            {renderToggle(
                'Режим разработчика',
                'Включить дополнительные инструменты для разработки',
                'developerMode',
                preferences.developerMode,
                true
            )}

            {/* Debug Logs */}
            {renderToggle(
                'Отладочные логи',
                'Выводить подробные логи в консоль браузера',
                'debugLogs',
                preferences.debugLogs
            )}

            {/* Experimental Features */}
            {renderToggle(
                'Экспериментальные функции',
                'Включить новые функции в стадии тестирования',
                'experimentalFeatures',
                preferences.experimentalFeatures,
                true
            )}

            {/* Hardware Acceleration */}
            {renderToggle(
                'Аппаратное ускорение',
                'Использовать GPU для улучшения производительности',
                'hardwareAcceleration',
                preferences.hardwareAcceleration
            )}

            {/* Beta Updates */}
            {renderToggle(
                'Бета-обновления',
                'Получать ранние версии обновлений',
                'betaUpdates',
                preferences.betaUpdates
            )}

            {/* Crash Reports */}
            {renderToggle(
                'Отчеты об ошибках',
                'Автоматически отправлять отчеты о сбоях',
                'sendCrashReports',
                preferences.sendCrashReports
            )}

            {/* Usage Stats */}
            {renderToggle(
                'Статистика использования',
                'Отправлять анонимную статистику для улучшения приложения',
                'sendUsageStats',
                preferences.sendUsageStats
            )}

            {/* Developer Tools */}
            {preferences.developerMode && (
                <div style={{ padding: '16px', background: 'rgba(0, 242, 255, 0.05)', border: '1px solid rgba(0, 242, 255, 0.2)', borderRadius: '12px' }}>
                    <div
                        onClick={() => setShowDevTools(!showDevTools)}
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            cursor: 'pointer',
                            marginBottom: showDevTools ? '16px' : '0',
                        }}
                    >
                        <div>
                            <div style={{ fontSize: '15px', color: '#00f2ff', fontWeight: '500' }}>
                                🛠️ Инструменты разработчика
                            </div>
                            <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)' }}>
                                Дополнительные инструменты для отладки
                            </div>
                        </div>
                        <div style={{ fontSize: '20px', color: '#00f2ff', transform: showDevTools ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>
                            →
                        </div>
                    </div>

                    {showDevTools && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <button
                                onClick={() => {
                                    logger.info('LocalStorage:', localStorage);
                                    logger.info('SessionStorage:', sessionStorage);
                                    setModalConfig({
                                        isOpen: true,
                                        type: 'alert',
                                        title: 'Инструменты разработчика',
                                        message: 'Данные выведены в консоль'
                                    });
                                }}
                                style={{
                                    padding: '10px 16px',
                                    background: 'rgba(0, 242, 255, 0.1)',
                                    border: '1px solid rgba(0, 242, 255, 0.3)',
                                    borderRadius: '8px',
                                    color: '#00f2ff',
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                }}
                            >
                                📊 Вывести данные хранилища
                            </button>

                            <button
                                onClick={() => {
                                    const info = {
                                        userAgent: navigator.userAgent,
                                        platform: navigator.platform,
                                        language: navigator.language,
                                        online: navigator.onLine,
                                        cookieEnabled: navigator.cookieEnabled,
                                    };
                                    logger.info('System Info:', info);
                                    setModalConfig({
                                        isOpen: true,
                                        type: 'alert',
                                        title: 'Инструменты разработчика',
                                        message: 'Информация о системе выведена в консоль'
                                    });
                                }}
                                style={{
                                    padding: '10px 16px',
                                    background: 'rgba(0, 242, 255, 0.1)',
                                    border: '1px solid rgba(0, 242, 255, 0.3)',
                                    borderRadius: '8px',
                                    color: '#00f2ff',
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                }}
                            >
                                💻 Информация о системе
                            </button>

                            <button
                                onClick={() => {
                                    performance.mark('test-mark');
                                    logger.info('Performance:', performance.getEntriesByType('mark'));
                                    setModalConfig({
                                        isOpen: true,
                                        type: 'alert',
                                        title: 'Инструменты разработчика',
                                        message: 'Метрики производительности в консоли'
                                    });
                                }}
                                style={{
                                    padding: '10px 16px',
                                    background: 'rgba(0, 242, 255, 0.1)',
                                    border: '1px solid rgba(0, 242, 255, 0.3)',
                                    borderRadius: '8px',
                                    color: '#00f2ff',
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                }}
                            >
                                ⚡ Метрики производительности
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* App Info */}
            <div
                onClick={handleVersionClick}
                style={{
                    padding: '16px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '12px',
                    cursor: 'default',
                    userSelect: 'none'
                }}
            >
                <div style={{ fontSize: '15px', color: '#fff', fontWeight: '500', marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>ℹ️ Информация о приложении</span>
                    {versionClicks > 0 && <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '12px' }}>{5 - versionClicks}</span>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Версия:</span>
                        <span style={{ color: '#fff' }}>1.0.0</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Сборка:</span>
                        <span style={{ color: '#00f2ff', fontWeight: 'bold' }}>2024.03.02</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Платформа:</span>
                        <span style={{ color: '#fff' }}>{navigator.platform}</span>
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

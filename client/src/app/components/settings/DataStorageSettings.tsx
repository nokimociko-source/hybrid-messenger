import { logger } from '../../utils/logger';
import React, { useState, useEffect } from 'react';
import { CatloverModal } from '../CatloverModal';

interface DataStorageSettingsProps {
    onBack: () => void;
}

interface StorageInfo {
    messages: number;
    media: number;
    cache: number;
    total: number;
}

export function DataStorageSettings({ onBack }: DataStorageSettingsProps) {
    const [storage, setStorage] = useState<StorageInfo>({
        messages: 0,
        media: 0,
        cache: 0,
        total: 0,
    });
    const [clearing, setClearing] = useState(false);
    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean;
        type: 'alert' | 'confirm';
        title: string;
        message: string;
        isDanger?: boolean;
        onConfirm?: () => void;
    }>({
        isOpen: false,
        type: 'alert',
        title: '',
        message: ''
    });

    useEffect(() => {
        calculateStorage();
    }, []);

    const calculateStorage = () => {
        // Примерный расчет использования памяти
        let total = 0;

        // Подсчет localStorage
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                total += localStorage[key].length + key.length;
            }
        }

        // Примерное распределение
        const messages = Math.floor(total * 0.6);
        const media = Math.floor(total * 0.3);
        const cache = total - messages - media;

        setStorage({
            messages,
            media,
            cache,
            total,
        });
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    };

    const clearCache = () => {
        setModalConfig({
            isOpen: true,
            type: 'confirm',
            title: 'Подтвердите действие',
            message: 'Очистить кэш? Это может замедлить загрузку при следующем запуске.',
            onConfirm: performClearCache
        });
    };

    const performClearCache = async () => {
        setClearing(true);
        try {
            // Очистка кэша (сохраняем важные данные)
            const keysToKeep = ['auth_token', 'user_preferences', 'general_preferences', 'notification_preferences'];
            const keysToRemove: string[] = [];

            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key) && !keysToKeep.includes(key)) {
                    keysToRemove.push(key);
                }
            }

            keysToRemove.forEach(key => localStorage.removeItem(key));

            // Пересчитываем
            calculateStorage();
            setModalConfig({
                isOpen: true,
                type: 'alert',
                title: 'Уведомление',
                message: 'Кэш успешно очищен'
            });
        } catch (err) {
            logger.error('Error clearing cache:', err);
            setModalConfig({
                isOpen: true,
                type: 'alert',
                title: 'Ошибка',
                message: 'Не удалось очистить кэш',
                isDanger: true
            });
        } finally {
            setClearing(false);
        }
    };

    const clearAllData = () => {
        setModalConfig({
            isOpen: true,
            type: 'confirm',
            title: 'Удалить все данные?',
            message: 'Это действие необратимо! Вы уверены? Все сообщения и настройки будут удалены!',
            isDanger: true,
            onConfirm: performClearAllData
        });
    };

    const performClearAllData = async () => {
        setClearing(true);
        try {
            localStorage.clear();
            sessionStorage.clear();

            // Очистка IndexedDB если используется
            if ('indexedDB' in window) {
                const databases = await indexedDB.databases();
                for (const db of databases) {
                    if (db.name) {
                        indexedDB.deleteDatabase(db.name);
                    }
                }
            }

            setModalConfig({
                isOpen: true,
                type: 'alert',
                title: 'Успешно',
                message: 'Все данные удалены. Страница будет перезагружена.',
                onConfirm: () => window.location.reload()
            });
        } catch (err) {
            logger.error('Error clearing data:', err);
            setModalConfig({
                isOpen: true,
                type: 'alert',
                title: 'Ошибка',
                message: 'Не удалось удалить все данные',
                isDanger: true
            });
            setClearing(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Storage Overview */}
            <div style={{ padding: '20px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px' }}>
                <div style={{ fontSize: '16px', color: '#fff', fontWeight: '500', marginBottom: '16px' }}>
                    💾 Использование памяти
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)' }}>
                            Всего использовано
                        </span>
                        <span style={{ fontSize: '14px', color: '#00f2ff', fontWeight: '500' }}>
                            {formatBytes(storage.total)}
                        </span>
                    </div>

                    {/* Progress Bar */}
                    <div
                        style={{
                            width: '100%',
                            height: '8px',
                            background: 'rgba(255, 255, 255, 0.1)',
                            borderRadius: '4px',
                            overflow: 'hidden',
                        }}
                    >
                        <div
                            style={{
                                width: '60%',
                                height: '100%',
                                background: 'linear-gradient(90deg, #00f2ff 0%, #00a8ff 100%)',
                                borderRadius: '4px',
                            }}
                        />
                    </div>
                </div>

                {/* Breakdown */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '12px', height: '12px', background: '#00f2ff', borderRadius: '2px' }} />
                            <span style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)' }}>
                                Сообщения
                            </span>
                        </div>
                        <span style={{ fontSize: '14px', color: '#fff' }}>
                            {formatBytes(storage.messages)}
                        </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '12px', height: '12px', background: '#00a8ff', borderRadius: '2px' }} />
                            <span style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)' }}>
                                Медиафайлы
                            </span>
                        </div>
                        <span style={{ fontSize: '14px', color: '#fff' }}>
                            {formatBytes(storage.media)}
                        </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '12px', height: '12px', background: '#0088cc', borderRadius: '2px' }} />
                            <span style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)' }}>
                                Кэш
                            </span>
                        </div>
                        <span style={{ fontSize: '14px', color: '#fff' }}>
                            {formatBytes(storage.cache)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Auto-delete Settings */}
            <div style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px' }}>
                <label htmlFor="auto-delete-select" style={{ fontSize: '15px', color: '#fff', fontWeight: '500', marginBottom: '4px', display: 'block' }}>
                    Автоудаление старых сообщений
                </label>
                <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '12px' }}>
                    Автоматически удалять сообщения старше указанного срока
                </div>
                <select
                    id="auto-delete-select"
                    name="auto-delete"
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
                    <option value="never">Никогда</option>
                    <option value="1month">Старше 1 месяца</option>
                    <option value="3months">Старше 3 месяцев</option>
                    <option value="6months">Старше 6 месяцев</option>
                    <option value="1year">Старше 1 года</option>
                </select>
            </div>

            {/* Clear Cache */}
            <button
                onClick={clearCache}
                disabled={clearing}
                style={{
                    padding: '14px 20px',
                    background: 'rgba(255, 149, 0, 0.1)',
                    border: '1px solid rgba(255, 149, 0, 0.3)',
                    borderRadius: '12px',
                    color: '#ff9500',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: clearing ? 'not-allowed' : 'pointer',
                    opacity: clearing ? 0.5 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                }}
            >
                <span style={{ fontSize: '18px' }}>🧹</span>
                {clearing ? 'Очистка...' : 'Очистить кэш'}
            </button>

            {/* Export Data */}
            <button
                style={{
                    padding: '14px 20px',
                    background: 'rgba(0, 242, 255, 0.1)',
                    border: '1px solid rgba(0, 242, 255, 0.3)',
                    borderRadius: '12px',
                    color: '#00f2ff',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                }}
            >
                <span style={{ fontSize: '18px' }}>📦</span>
                Экспортировать данные
            </button>

            {/* Danger Zone */}
            <div
                style={{
                    padding: '16px',
                    background: 'rgba(255, 77, 77, 0.05)',
                    border: '1px solid rgba(255, 77, 77, 0.3)',
                    borderRadius: '12px',
                }}
            >
                <div style={{ fontSize: '15px', color: '#ff4d4d', fontWeight: '500', marginBottom: '8px' }}>
                    ⚠️ Опасная зона
                </div>
                <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '12px' }}>
                    Эти действия необратимы. Будьте осторожны!
                </div>
                <button
                    onClick={clearAllData}
                    disabled={clearing}
                    style={{
                        width: '100%',
                        padding: '12px 20px',
                        background: 'rgba(255, 77, 77, 0.1)',
                        border: '1px solid rgba(255, 77, 77, 0.5)',
                        borderRadius: '8px',
                        color: '#ff4d4d',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: clearing ? 'not-allowed' : 'pointer',
                        opacity: clearing ? 0.5 : 1,
                    }}
                >
                    {clearing ? 'Удаление...' : '🗑️ Удалить все данные'}
                </button>
            </div>

            <CatloverModal
                isOpen={modalConfig.isOpen}
                type={modalConfig.type}
                title={modalConfig.title}
                message={modalConfig.message}
                isDanger={modalConfig.isDanger}
                onClose={() => {
                    setModalConfig(prev => ({ ...prev, isOpen: false }));
                    if (modalConfig.type === 'alert' && modalConfig.onConfirm) {
                        modalConfig.onConfirm();
                    }
                }}
                onConfirm={() => {
                    setModalConfig(prev => ({ ...prev, isOpen: false }));
                    if (modalConfig.onConfirm) modalConfig.onConfirm();
                }}
            />
        </div>
    );
}

import React, { useState } from 'react';
import { SettingsModal } from './SettingsModal';

/**
 * Пример использования SettingsModal
 * 
 * Это полноценная система настроек в стиле Telegram с:
 * - Профилем (имя, фото, статус)
 * - Основными настройками (тема, язык, шрифт)
 * - Уведомлениями (звуки, desktop notifications)
 * - Конфиденциальностью (статус онлайн, блокировка)
 * - Настройками чатов (отправка, группировка, медиа)
 * - Управлением данными (память, очистка кэша)
 * - Расширенными настройками (режим разработчика)
 */

export function SettingsModalExample() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div style={{ padding: '20px' }}>
            <h1>Пример настроек в стиле Telegram</h1>
            
            <button
                onClick={() => setIsOpen(true)}
                style={{
                    padding: '12px 24px',
                    background: 'linear-gradient(45deg, #a200ff, #00f2ff)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '16px',
                    fontWeight: '500',
                    cursor: 'pointer',
                }}
            >
                ⚙️ Открыть настройки
            </button>

            {isOpen && (
                <SettingsModal 
                    onClose={() => setIsOpen(false)}
                    // Можно открыть сразу нужный раздел:
                    // initialSection="profile"
                    // initialSection="notifications"
                    // initialSection="privacy"
                />
            )}

            <div style={{ marginTop: '40px', color: '#888' }}>
                <h3>Доступные разделы:</h3>
                <ul>
                    <li>👤 Профиль - настройка имени, фото, статуса</li>
                    <li>⚙️ Основные - тема, язык, размер шрифта, анимации</li>
                    <li>🔔 Уведомления - звуки, desktop notifications, предпросмотр</li>
                    <li>🔒 Конфиденциальность - статус онлайн, блокировка, видимость</li>
                    <li>💬 Чаты - отправка, группировка, эмодзи, медиа</li>
                    <li>💾 Данные и память - использование памяти, очистка кэша</li>
                    <li>🔧 Расширенные - режим разработчика, эксперименты</li>
                </ul>
            </div>
        </div>
    );
}

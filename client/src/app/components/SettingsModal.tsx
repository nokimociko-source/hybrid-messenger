import React, { useState } from 'react';
import { Icon, Icons } from 'folds';
import { GeneralSettings } from './settings/GeneralSettings';
import { NotificationSettings } from './settings/NotificationSettings';
import { PrivacySettings } from './settings/PrivacySettings';
import { ChatSettings } from './settings/ChatSettings';
import { DataStorageSettings } from './settings/DataStorageSettings';
import { AdvancedSettings } from './settings/AdvancedSettings';
import { ProfileSettings } from './settings/ProfileSettings';
import { AdminSettings } from './settings/AdminSettings';
import { AboutSettings } from './settings/AboutSettings';

export type SettingsSection =
    | 'main'
    | 'profile'
    | 'general'
    | 'notifications'
    | 'privacy'
    | 'chat'
    | 'data'
    | 'advanced'
    | 'admin'
    | 'about';

interface SettingsModalProps {
    onClose: () => void;
    initialSection?: SettingsSection;
}

interface MenuItem {
    id: SettingsSection;
    icon: any;
    label: string;
    description: string;
}

const menuItems: MenuItem[] = [
    {
        id: 'general',
        icon: Icons.Setting,
        label: 'Основные',
        description: 'Язык, тема, масштаб',
    },
    {
        id: 'notifications',
        icon: Icons.Bell,
        label: 'Уведомления',
        description: 'Звуки, оповещения',
    },
    {
        id: 'privacy',
        icon: Icons.Lock,
        label: 'Конфиденциальность',
        description: 'Блокировка, безопасность',
    },
    {
        id: 'chat',
        icon: Icons.Message,
        label: 'Чаты',
        description: 'Фон, стикеры, эмодзи',
    },
    {
        id: 'data',
        icon: Icons.Download,
        label: 'Данные и память',
        description: 'Использование памяти',
    },
    {
        id: 'advanced',
        icon: Icons.Terminal,
        label: 'Расширенные',
        description: 'Эксперименты, отладка',
    },
    {
        id: 'about',
        icon: Icons.Info,
        label: 'О приложении',
        description: 'Версия, права, инфо',
    },
];

export function SettingsModal({ onClose, initialSection = 'main' }: SettingsModalProps) {
    const [currentSection, setCurrentSection] = useState<SettingsSection>(initialSection);

    const renderContent = () => {
        switch (currentSection) {
            case 'profile':
                return <ProfileSettings onBack={() => setCurrentSection('main')} />;
            case 'general':
                return <GeneralSettings onBack={() => setCurrentSection('main')} />;
            case 'notifications':
                return <NotificationSettings onBack={() => setCurrentSection('main')} />;
            case 'privacy':
                return <PrivacySettings onBack={() => setCurrentSection('main')} />;
            case 'chat':
                return <ChatSettings onBack={() => setCurrentSection('main')} />;
            case 'data':
                return <DataStorageSettings onBack={() => setCurrentSection('main')} />;
            case 'advanced':
                return <AdvancedSettings onBack={() => setCurrentSection('main')} onOpenAdmin={() => setCurrentSection('admin')} />;
            case 'admin':
                return <AdminSettings onBack={() => setCurrentSection('advanced')} />;
            case 'about':
                return <AboutSettings onBack={() => setCurrentSection('main')} />;
            default:
                return renderMainMenu();
        }
    };

    const renderMainMenu = () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {menuItems.map((item) => (
                <div
                    key={item.id}
                    onClick={() => setCurrentSection(item.id)}
                    style={{
                        padding: '16px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(0, 242, 255, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                    }}
                >
                    <div
                        style={{
                            fontSize: '32px',
                            width: '48px',
                            height: '48px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'rgba(0, 242, 255, 0.1)',
                            borderRadius: '12px',
                        }}
                    >
                        <Icon size="200" src={item.icon} style={{ color: '#00f2ff' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <div
                            style={{
                                fontSize: '16px',
                                fontWeight: '500',
                                color: '#fff',
                                marginBottom: '4px',
                            }}
                        >
                            {item.label}
                        </div>
                        <div
                            style={{
                                fontSize: '13px',
                                color: 'rgba(255, 255, 255, 0.5)',
                            }}
                        >
                            {item.description}
                        </div>
                    </div>
                    <Icon size="200" src={Icons.ChevronRight} style={{ color: 'rgba(255, 255, 255, 0.3)' }} />
                </div>
            ))}
        </div>
    );

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.85)',
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
                    width: '90%',
                    maxWidth: '600px',
                    maxHeight: '85vh',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div
                    style={{
                        padding: '20px 24px',
                        borderBottom: '1px solid rgba(0, 242, 255, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        background: 'rgba(0, 242, 255, 0.05)',
                    }}
                >
                    {currentSection !== 'main' && (
                        <div
                            onClick={() => {
                                if (currentSection === 'admin') {
                                    setCurrentSection('advanced');
                                } else {
                                    setCurrentSection('main');
                                }
                            }}
                            style={{
                                cursor: 'pointer',
                                color: '#00f2ff',
                                display: 'flex',
                                alignItems: 'center',
                                padding: '4px',
                            }}
                        >
                            <Icon size="200" src={Icons.ChevronLeft} />
                        </div>
                    )}
                    <h2
                        style={{
                            fontSize: '22px',
                            fontWeight: '600',
                            color: '#fff',
                            margin: 0,
                            flex: 1,
                        }}
                    >
                        {currentSection === 'main'
                            ? 'Настройки'
                            : currentSection === 'admin'
                                ? 'Админ-панель'
                                : menuItems.find(m => m.id === currentSection)?.label}
                    </h2>
                    <div
                        onClick={onClose}
                        style={{
                            cursor: 'pointer',
                            color: 'rgba(255, 255, 255, 0.6)',
                            fontSize: '28px',
                            lineHeight: '1',
                            padding: '4px 8px',
                            transition: 'color 0.2s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)')}
                    >
                        ×
                    </div>
                </div>

                {/* Content */}
                <div
                    className="custom-scrollbar"
                    style={{
                        flex: 1,
                        overflowY: 'auto',
                        padding: '20px 24px',
                    }}
                >
                    {renderContent()}
                </div>
            </div>
        </div>
    );
}

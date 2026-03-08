import React, { useState } from 'react';
import { Icon, Icons } from 'folds';
import { ProfileSettingsPanel } from './ProfileSettingsPanel';
import { LanguageSelectorCompact } from './LanguageSelector';
import { useI18n } from '../hooks/useI18n';

interface SideNavBarProps {
    onNavigate?: (section: string) => void;
}

export function SideNavBar({ onNavigate }: SideNavBarProps) {
    const [activeSection, setActiveSection] = useState('home');
    const [showProfileSettings, setShowProfileSettings] = useState(false);

    const handleNavigation = (section: string) => {
        setActiveSection(section);
        if (section === 'settings') {
            setShowProfileSettings(true);
        } else {
            onNavigate?.(section);
        }
    };

    const navItems = [
        { id: 'home', icon: Icons.Home, label: 'Главная' },
        { id: 'profile', icon: Icons.User, label: 'Профиль' },
        { id: 'search', icon: Icons.Search, label: 'Поиск' },
    ];

    return (
        <>
            <div style={{
                width: '72px',
                height: '100vh',
                background: '#0a0a0a',
                borderRight: '1px solid rgba(0, 242, 255, 0.1)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '16px 0',
                position: 'relative',
                zIndex: 100,
            }}>
                {/* Logo / Brand */}
                <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #a200ff 0%, #00f2ff 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '24px',
                    cursor: 'pointer',
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: '#fff',
                    boxShadow: '0 4px 16px rgba(0, 242, 255, 0.3)',
                }}>
                    C
                </div>

                {/* Navigation Items */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    flex: 1,
                }}>
                    {navItems.map((item) => (
                        <div
                            key={item.id}
                            onClick={() => handleNavigation(item.id)}
                            style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                background: activeSection === item.id 
                                    ? 'rgba(0, 242, 255, 0.15)' 
                                    : 'transparent',
                                border: activeSection === item.id
                                    ? '1px solid rgba(0, 242, 255, 0.3)'
                                    : '1px solid transparent',
                                position: 'relative',
                            }}
                            onMouseEnter={(e) => {
                                if (activeSection !== item.id) {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (activeSection !== item.id) {
                                    e.currentTarget.style.background = 'transparent';
                                }
                            }}
                            title={item.label}
                        >
                            <Icon 
                                size="200" 
                                src={item.icon} 
                                style={{ 
                                    color: activeSection === item.id ? '#00f2ff' : 'rgba(255, 255, 255, 0.6)' 
                                }} 
                            />
                            
                            {/* Active indicator */}
                            {activeSection === item.id && (
                                <div style={{
                                    position: 'absolute',
                                    left: '-4px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    width: '3px',
                                    height: '24px',
                                    background: '#00f2ff',
                                    borderRadius: '0 2px 2px 0',
                                }} />
                            )}
                        </div>
                    ))}
                </div>

                {/* Settings Button at Bottom */}
                <div
                    onClick={() => handleNavigation('settings')}
                    style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        background: activeSection === 'settings' 
                            ? 'rgba(0, 242, 255, 0.15)' 
                            : 'transparent',
                        border: activeSection === 'settings'
                            ? '1px solid rgba(0, 242, 255, 0.3)'
                            : '1px solid transparent',
                        position: 'relative',
                    }}
                    onMouseEnter={(e) => {
                        if (activeSection !== 'settings') {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (activeSection !== 'settings') {
                            e.currentTarget.style.background = 'transparent';
                        }
                    }}
                    title="Настройки"
                >
                    <Icon 
                        size="200" 
                        src={Icons.Setting} 
                        style={{ 
                            color: activeSection === 'settings' ? '#00f2ff' : 'rgba(255, 255, 255, 0.6)' 
                        }} 
                    />
                    
                    {/* Active indicator */}
                    {activeSection === 'settings' && (
                        <div style={{
                            position: 'absolute',
                            left: '-4px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: '3px',
                            height: '24px',
                            background: '#00f2ff',
                            borderRadius: '0 2px 2px 0',
                        }} />
                    )}
                </div>
            </div>

            {/* Profile Settings Panel */}
            {showProfileSettings && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: '72px',
                    zIndex: 1000,
                }}>
                    <ProfileSettingsPanel 
                        onClose={() => {
                            setShowProfileSettings(false);
                            setActiveSection('home');
                        }} 
                    />
                </div>
            )}
        </>
    );
}

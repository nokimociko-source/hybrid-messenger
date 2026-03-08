import React, { useState } from 'react';
import { Icon, Icons, Box } from 'folds';

interface AboutSettingsProps {
    onBack: () => void;
}

export function AboutSettings({ onBack }: AboutSettingsProps) {
    const [modalContent, setModalContent] = useState<{ title: string; content: React.ReactNode } | null>(null);

    const renderModal = () => {
        if (!modalContent) return null;
        return (
            <div
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.8)',
                    zIndex: 2000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px',
                    animation: 'fadeIn 0.2s ease-out'
                }}
                onClick={() => setModalContent(null)}
            >
                <div
                    style={{
                        background: '#1a1a1a',
                        border: '1px solid rgba(0, 242, 255, 0.3)',
                        borderRadius: '16px',
                        padding: '24px',
                        maxWidth: '500px',
                        width: '100%',
                        maxHeight: '70vh',
                        overflowY: 'auto'
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ margin: 0, color: '#00f2ff' }}>{modalContent.title}</h3>
                        <div onClick={() => setModalContent(null)} style={{ cursor: 'pointer', fontSize: '24px' }}>×</div>
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.8)', lineHeight: '1.6', fontSize: '14px' }}>
                        {modalContent.content}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {renderModal()}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '20px 0' }}>
                <div style={{
                    width: '80px',
                    height: '80px',
                    background: 'rgba(0, 242, 255, 0.1)',
                    borderRadius: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid rgba(0, 242, 255, 0.3)'
                }}>
                    <Icon size="400" src={Icons.Home} style={{ color: '#00f2ff' }} />
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: '600', color: '#fff' }}>Hybrid Messenger</div>
                    <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.5)' }}>Версия 2024.03.02</div>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                    {
                        id: 'legal',
                        label: 'Юридическая информация',
                        icon: Icons.Lock,
                        content: (
                            <div>
                                <p>© 2024 Hybrid Messenger. Все права защищены.</p>
                                <p>Данное программное обеспечение предоставляется «как есть», без каких-либо гарантий. Использование приложения подразумевает согласие с правилами сообщества.</p>
                                <p>Запрещено использование приложения в незаконных целях, распространение вредоносного ПО или нарушение авторских прав.</p>
                            </div>
                        )
                    },
                    {
                        id: 'privacy',
                        label: 'Конфиденциальность',
                        icon: Icons.Lock,
                        content: (
                            <div>
                                <p>Ваша конфиденциальность — наш приоритет.</p>
                                <p>Мы используем сквозное шифрование (E2E) для ваших личных сообщений. Мы не храним ваши ключи шифрования на наших серверах.</p>
                                <p>Мы собираем только минимально необходимые данные для работы сервиса: ваш псевдоним и зашифрованные метаданные сессии.</p>
                            </div>
                        )
                    },
                    {
                        id: 'terms',
                        label: 'Условия использования',
                        icon: Icons.Setting,
                        content: (
                            <div>
                                <p>Нажимая «Принять» или используя наше приложение, вы соглашаетесь со следующими условиями:</p>
                                <ul>
                                    <li>Вы несете полную ответственность за контент, который отправляете.</li>
                                    <li>Мы имеем право ограничить доступ пользователям, нарушающим правила (спам, агрессия).</li>
                                    <li>Администрация не несет ответственности за контент сторонних каналов.</li>
                                </ul>
                            </div>
                        )
                    }
                ].map((item) => (
                    <div
                        key={item.id}
                        onClick={() => setModalContent({ title: item.label, content: item.content })}
                        style={{
                            padding: '16px',
                            background: 'rgba(255, 255, 255, 0.03)',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)')}
                    >
                        <Icon size="200" src={item.icon} style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
                        <span style={{ fontSize: '15px', color: '#fff', flex: 1 }}>{item.label}</span>
                        <Icon size="200" src={Icons.ChevronRight} style={{ color: 'rgba(255, 255, 255, 0.3)' }} />
                    </div>
                ))}
            </div>

            <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '12px', color: 'rgba(255, 255, 255, 0.3)' }}>
                Сделано с любовью командой Catlover
            </div>
        </div>
    );
}

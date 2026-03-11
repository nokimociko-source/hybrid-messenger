import React from 'react';
import { Icon, Icons } from 'folds';

interface ManagementToolsProps {
    setShowInviteLinks: (val: boolean) => void;
    setShowTopicManager: (val: boolean) => void;
    setShowPollCreator: (val: boolean) => void;
    setShowAdminManager: (val: boolean) => void;
    setShowBannedUsers: (val: boolean) => void;
    setShowAuditLog: (val: boolean) => void;
}

export function ManagementTools({
    setShowInviteLinks, setShowTopicManager, setShowPollCreator,
    setShowAdminManager, setShowBannedUsers, setShowAuditLog
}: ManagementToolsProps) {
    const tools = [
        { label: 'Ссылки', icon: Icons.Link, onClick: () => setShowInviteLinks(true) },
        { label: 'Топики', icon: Icons.Hash, onClick: () => setShowTopicManager(true) },
        { label: 'Опросы', icon: Icons.Hash, onClick: () => setShowPollCreator(true) },
        { label: 'Админы', icon: Icons.Shield, onClick: () => setShowAdminManager(true) },
        { label: 'Бан-лист', icon: Icons.Shield, onClick: () => setShowBannedUsers(true) },
        { label: 'Журнал', icon: Icons.Hash, onClick: () => setShowAuditLog(true) },
    ];

    return (
        <div>
            <label style={{ display: 'block', fontSize: '13px', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '12px' }}>
                Инструменты управления
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {tools.map((tool) => (
                    <button
                        key={tool.label}
                        onClick={tool.onClick}
                        style={toolButtonStyle}
                    >
                        <Icon size="200" src={tool.icon} style={{ color: '#00f2ff' }} />
                        <span>{tool.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}

const toolButtonStyle = {
    padding: '14px',
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '14px',
    color: '#fff',
    fontSize: '13px',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    cursor: 'pointer',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    backdropFilter: 'blur(5px)'
} as any;

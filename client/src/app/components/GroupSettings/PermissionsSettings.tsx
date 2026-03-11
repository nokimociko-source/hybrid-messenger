import React from 'react';

interface PermissionsSettingsProps {
    permissions: any;
    setPermissions: (newPerms: any) => void;
}

export function PermissionsSettings({ permissions, setPermissions }: PermissionsSettingsProps) {
    const list = [
        { id: 'can_send_messages', label: 'Отправка сообщений' },
        { id: 'can_send_media', label: 'Отправка медиа' },
        { id: 'can_send_links', label: 'Предпросмотр ссылок' },
        { id: 'can_send_polls', label: 'Опросы' },
        { id: 'can_add_members', label: 'Добавление участников' },
    ];

    return (
        <div>
            <label style={{ display: 'block', fontSize: '13px', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '12px' }}>
                Разрешения участников
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(255, 255, 255, 0.02)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                {list.map((perm) => (
                    <div key={perm.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
                        <span style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '14px' }}>{perm.label}</span>
                        <div
                            onClick={() => setPermissions({ ...permissions, [perm.id]: !permissions[perm.id] })}
                            style={{
                                width: '36px', height: '18px',
                                background: permissions[perm.id] ? '#00f2ff' : '#333',
                                borderRadius: '9px', position: 'relative', cursor: 'pointer', transition: 'all 0.2s'
                            }}
                        >
                            <div style={{
                                width: '14px', height: '14px', background: '#fff', borderRadius: '50%',
                                position: 'absolute', top: '2px', left: permissions[perm.id] ? '20px' : '2px', transition: 'all 0.2s'
                            }} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

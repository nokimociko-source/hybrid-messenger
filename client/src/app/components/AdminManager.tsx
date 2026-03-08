import { logger } from '../utils/logger';
import React, { useState, useEffect } from 'react';
import { Icon, Icons, Spinner } from 'folds';
import { supabase } from '../../supabaseClient';
import { Room } from '../hooks/useSupabaseChat';

interface AdminManagerProps {
    roomId: string;
    roomType?: string;
    onClose: () => void;
}

interface AdminMember {
    id: string;
    user_id: string;
    role: string;
    user: {
        username: string;
        avatar_url: string | null;
    };
}

export function AdminManager({ roomId, roomType, onClose }: AdminManagerProps) {
    const [admins, setAdmins] = useState<AdminMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const loadAdmins = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('room_members')
            .select(`
                id,
                user_id,
                role
            `)
            .eq('room_id', roomId)
            .in('role', ['creator', 'admin']);

        if (error) {
            logger.error('Error loading admins:', error);
            setAdmins([]);
            setLoading(false);
            return;
        }

        if (data && data.length > 0) {
            // Загружаем данные пользователей отдельно
            const userIds = data.map(d => d.user_id);
            const { data: users } = await supabase
                .from('users')
                .select('id, username, avatar_url')
                .in('id', userIds);

            const usersMap = new Map(users?.map(u => [u.id, u]) || []);
            const enrichedData = data.map(d => ({
                ...d,
                user: usersMap.get(d.user_id)
            }));
            setAdmins(enrichedData as any);
        } else {
            setAdmins([]);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadAdmins();
    }, [roomId]);

    const handleDemote = async (memberId: string) => {
        setActionLoading(memberId);
        const { error } = await supabase
            .from('room_members')
            .update({
                role: 'member',
                permissions: {
                    can_send_messages: roomType !== 'channel',
                    can_send_media: roomType !== 'channel',
                    can_add_members: roomType !== 'channel',
                    can_pin_messages: false,
                    can_delete_messages: false,
                    can_ban_members: false,
                    can_change_info: false,
                    can_invite_users: roomType !== 'channel',
                    can_send_polls: roomType !== 'channel',
                    can_send_links: roomType !== 'channel'
                }
            })
            .eq('id', memberId);

        if (!error) {
            await loadAdmins();
        }
        setActionLoading(null);
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(15px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            animation: 'fadeIn 0.2s ease-out'
        }} onClick={onClose}>
            <div style={{
                background: 'linear-gradient(135deg, rgba(20, 20, 20, 0.95) 0%, rgba(30, 30, 30, 0.95) 100%)',
                border: '1px solid rgba(0, 242, 255, 0.2)',
                borderRadius: '24px',
                padding: '32px',
                width: '450px',
                maxWidth: '90%',
                maxHeight: '80vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                animation: 'modalSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '12px',
                            background: 'rgba(0, 242, 255, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#00f2ff'
                        }}>
                            <Icon size="200" src={Icons.Lock} />
                        </div>
                        <h3 style={{ margin: 0, color: '#fff', fontSize: '20px' }}>Администраторы</h3>
                    </div>
                    <div onClick={onClose} style={{ cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: '24px' }}>×</div>
                </div>

                <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '4px' }}>
                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><Spinner size="400" variant="Secondary" /></div>
                    ) : admins.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.4)' }}>Нет администраторов</div>
                    ) : admins.map(admin => (
                        <div key={admin.id} style={{
                            padding: '12px 16px',
                            background: 'rgba(255, 255, 255, 0.03)',
                            borderRadius: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            border: '1px solid rgba(255,255,255,0.05)'
                        }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                background: 'rgba(0, 242, 255, 0.1)',
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                backgroundImage: admin.user.avatar_url ? `url(${admin.user.avatar_url})` : 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#00f2ff',
                                fontSize: '16px',
                                fontWeight: '600',
                                border: '2px solid rgba(0, 242, 255, 0.2)'
                            }}>
                                {!admin.user.avatar_url && admin.user.username[0].toUpperCase()}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ color: '#fff', fontSize: '14px', fontWeight: '500' }}>{admin.user.username}</div>
                                <div style={{
                                    color: admin.role === 'creator' ? '#00f2ff' : 'rgba(255,255,255,0.5)',
                                    fontSize: '11px',
                                    textTransform: 'uppercase',
                                    fontWeight: 'bold',
                                    letterSpacing: '0.5px',
                                    marginTop: '2px'
                                }}>
                                    {admin.role === 'creator' ? 'Владелец' : 'Администратор'}
                                </div>
                            </div>
                            {admin.role === 'admin' && (
                                <button
                                    onClick={() => handleDemote(admin.id)}
                                    disabled={!!actionLoading}
                                    style={{
                                        padding: '8px 12px',
                                        background: 'rgba(255, 77, 77, 0.1)',
                                        border: '1px solid rgba(255, 77, 77, 0.2)',
                                        borderRadius: '8px',
                                        color: '#ff4d4d',
                                        fontSize: '12px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 77, 77, 0.2)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 77, 77, 0.1)'}
                                >
                                    {actionLoading === admin.id ? <Spinner size="100" /> : 'Снять'}
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

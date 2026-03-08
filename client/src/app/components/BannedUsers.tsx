import { logger } from '../utils/logger';
import React, { useState, useEffect } from 'react';
import { Icon, Icons, Spinner } from 'folds';
import { supabase } from '../../supabaseClient';

interface BannedUsersProps {
    roomId: string;
    onClose: () => void;
}

interface BannedUser {
    id: string;
    user_id: string;
    banned_at: string;
    ban_reason: string | null;
    user: {
        username: string;
        avatar_url: string | null;
    };
    banner?: {
        username: string;
    };
}

export function BannedUsers({ roomId, onClose }: BannedUsersProps) {
    const [bannedUsers, setBannedUsers] = useState<BannedUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const loadBannedUsers = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('room_members')
            .select(`
                id,
                user_id,
                ban_reason,
                banned_at
            `)
            .eq('room_id', roomId)
            .eq('is_banned', true);

        if (error) {
            logger.error('Error loading banned users:', error);
            setBannedUsers([]);
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
            setBannedUsers(enrichedData as any);
        } else {
            setBannedUsers([]);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadBannedUsers();
    }, [roomId]);

    const handleUnban = async (memberId: string) => {
        setActionLoading(memberId);
        const { error } = await supabase
            .from('room_members')
            .update({
                is_banned: false,
                banned_at: null,
                banned_by: null,
                ban_reason: null
            })
            .eq('id', memberId);

        if (!error) {
            await loadBannedUsers();
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
                border: '1px solid rgba(255, 77, 77, 0.2)',
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
                            background: 'rgba(255, 77, 77, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ff4d4d'
                        }}>
                            <Icon size="200" src={Icons.Cross} />
                        </div>
                        <h3 style={{ margin: 0, color: '#fff', fontSize: '20px' }}>Заблокированные</h3>
                    </div>
                    <div onClick={onClose} style={{ cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: '24px' }}>×</div>
                </div>

                <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '4px' }}>
                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><Spinner size="400" variant="Secondary" /></div>
                    ) : bannedUsers.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.4)' }}>
                            Черный список пуст (Требуется обновление БД для полной поддержки)
                        </div>
                    ) : bannedUsers.map(member => (
                        <div key={member.id} style={{
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
                                background: 'rgba(255, 77, 77, 0.1)',
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                backgroundImage: member.user.avatar_url ? `url(${member.user.avatar_url})` : 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#ff4d4d',
                                fontSize: '16px',
                                fontWeight: '600',
                                border: '2px solid rgba(255, 77, 77, 0.2)'
                            }}>
                                {!member.user.avatar_url && member.user.username[0].toUpperCase()}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ color: '#fff', fontSize: '14px', fontWeight: '500' }}>{member.user.username}</div>
                                <div style={{
                                    color: 'rgba(255,255,255,0.5)',
                                    fontSize: '11px',
                                    marginTop: '2px'
                                }}>
                                    {member.ban_reason || 'Причина не указана'}
                                </div>
                                {member.banner && (
                                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>
                                        Забанен: {member.banner.username}
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => handleUnban(member.id)}
                                disabled={!!actionLoading}
                                style={{
                                    padding: '8px 12px',
                                    background: 'rgba(0, 242, 255, 0.1)',
                                    border: '1px solid rgba(0, 242, 255, 0.2)',
                                    borderRadius: '8px',
                                    color: '#00f2ff',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0, 242, 255, 0.2)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(0, 242, 255, 0.1)'}
                            >
                                {actionLoading === member.id ? <Spinner size="100" /> : 'Разбанить'}
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

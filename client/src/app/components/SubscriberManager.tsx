import { logger } from '../utils/logger';
import React, { useState, useEffect } from 'react';
import { Icon, Icons, Spinner } from 'folds';
import { supabase } from '../../supabaseClient';

interface SubscriberManagerProps {
    roomId: string;
    onClose: () => void;
}

interface Subscriber {
    id: string;
    user_id: string;
    joined_at: string;
    user: {
        username: string;
        avatar_url: string | null;
    };
}

export function SubscriberManager({ roomId, onClose }: SubscriberManagerProps) {
    const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const loadSubscribers = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('room_members')
            .select(`
                id,
                user_id,
                joined_at
            `)
            .eq('room_id', roomId)
            .order('joined_at', { ascending: false });

        if (!error && data) {
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
            setSubscribers(enrichedData as any);
            setLoading(false);
            return;
        }

        if (error) {
            logger.error('Error loading subscribers:', error);
            setSubscribers([]);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadSubscribers();
    }, [roomId]);

    const handleRemove = async (memberId: string) => {
        if (!confirm('Удалить этого подписчика из канала?')) return;

        setActionLoading(memberId);
        const { error } = await supabase
            .from('room_members')
            .delete()
            .eq('id', memberId);

        if (!error) {
            setSubscribers(prev => prev.filter(s => s.id !== memberId));
        }
        setActionLoading(null);
    };

    const filteredSubscribers = subscribers.filter(s =>
        s.user.username.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
                width: '480px',
                maxWidth: '90%',
                maxHeight: '80vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                animation: 'modalSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
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
                            <Icon size="200" src={Icons.User} />
                        </div>
                        <h3 style={{ margin: 0, color: '#fff', fontSize: '20px' }}>Подписчики</h3>
                    </div>
                    <div onClick={onClose} style={{ cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: '24px' }}>×</div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label htmlFor="subscriber-search-input" style={{ display: 'none' }}>Поиск подписчиков</label>
                    <input
                        id="subscriber-search-input"
                        name="subscriber-search"
                        type="text"
                        placeholder="Поиск подписчиков..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '12px 16px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '12px',
                            color: '#fff',
                            fontSize: '14px',
                            outline: 'none',
                            transition: 'border 0.2s'
                        }}
                        onFocus={e => e.currentTarget.style.borderColor = 'rgba(0, 242, 255, 0.3)'}
                        onBlur={e => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
                    />
                </div>

                <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><Spinner size="400" variant="Secondary" /></div>
                    ) : filteredSubscribers.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.4)' }}>
                            {searchQuery ? 'Ничего не найдено' : 'Нет подписчиков'}
                        </div>
                    ) : filteredSubscribers.map(sub => (
                        <div key={sub.id} style={{
                            padding: '12px',
                            background: 'rgba(255, 255, 255, 0.02)',
                            borderRadius: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            border: '1px solid rgba(255,255,255,0.05)'
                        }}>
                            <div style={{
                                width: '42px',
                                height: '42px',
                                borderRadius: '50%',
                                background: 'rgba(0, 242, 255, 0.1)',
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                backgroundImage: sub.user.avatar_url ? `url(${sub.user.avatar_url})` : 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#00f2ff',
                                fontSize: '16px',
                                border: '2px solid rgba(0, 242, 255, 0.1)'
                            }}>
                                {!sub.user.avatar_url && sub.user.username[0].toUpperCase()}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ color: '#fff', fontSize: '14px', fontWeight: '500' }}>{sub.user.username}</div>
                                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', marginTop: '2px' }}>
                                    Подписан: {new Date(sub.joined_at).toLocaleDateString()}
                                </div>
                            </div>
                            <button
                                onClick={() => handleRemove(sub.id)}
                                disabled={!!actionLoading}
                                style={{
                                    padding: '8px',
                                    background: 'rgba(255, 77, 77, 0.1)',
                                    borderRadius: '8px',
                                    color: '#ff4d4d',
                                    cursor: 'pointer',
                                    border: 'none',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 77, 77, 0.2)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 77, 77, 0.1)'}
                            >
                                {actionLoading === sub.id ? <Spinner size="100" /> : <Icon size="200" src={Icons.Cross} />}
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

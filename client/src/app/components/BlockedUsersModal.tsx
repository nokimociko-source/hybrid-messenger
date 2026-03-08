import { logger } from '../utils/logger';
import React, { useState, useEffect } from 'react';
import { Icon, Icons, Spinner } from 'folds';
import { CatloverModal } from './CatloverModal';
import { supabase } from '../../supabaseClient';

interface BlockedUsersModalProps {
    onClose: () => void;
}

interface BlockedUser {
    id: string;
    blocked_user_id: string;
    blocked_at: string;
    user: {
        id: string;
        username: string;
        avatar_url: string | null;
    };
}

export function BlockedUsersModal({ onClose }: BlockedUsersModalProps) {
    const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddUser, setShowAddUser] = useState(false);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);
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
        loadBlockedUsers();
    }, []);

    const loadBlockedUsers = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('blocked_users')
                .select(`
                    id,
                    blocked_user_id,
                    blocked_at,
                    user:users!blocked_users_blocked_user_id_fkey (
                        id,
                        username,
                        avatar_url
                    )
                `)
                .eq('user_id', user.id)
                .order('blocked_at', { ascending: false });

            if (error) throw error;

            // Transform data to match BlockedUser type (user is returned as array by Supabase)
            const transformedData = (data || []).map(item => ({
                ...item,
                user: Array.isArray(item.user) ? item.user[0] : item.user
            }));

            setBlockedUsers(transformedData as BlockedUser[]);
        } catch (err) {
            logger.error('Error loading blocked users:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleUnblock = async (blockId: string, username: string) => {
        setModalConfig({
            isOpen: true,
            type: 'confirm',
            title: 'Подтверждение',
            message: `Разблокировать ${username}?`,
            onConfirm: async () => {
                try {
                    const { error } = await supabase
                        .from('blocked_users')
                        .delete()
                        .eq('id', blockId);

                    if (error) throw error;

                    setBlockedUsers(prev => prev.filter(b => b.id !== blockId));
                } catch (err) {
                    logger.error('Error unblocking user:', err);
                    setModalConfig({
                        isOpen: true,
                        type: 'alert',
                        title: 'Ошибка',
                        message: 'Не удалось разблокировать пользователя',
                        isDanger: true
                    });
                }
            }
        });
    };

    const handleSearch = async (query: string) => {
        setSearchQuery(query);

        if (!query.trim()) {
            setSearchResults([]);
            return;
        }

        setSearching(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('users')
                .select('id, username, avatar_url')
                .ilike('username', `%${query}%`)
                .neq('id', user.id)
                .limit(10);

            if (error) throw error;

            // Filter out already blocked users
            const blockedIds = blockedUsers.map(b => b.blocked_user_id);
            const filtered = (data || []).filter(u => !blockedIds.includes(u.id));

            setSearchResults(filtered);
        } catch (err) {
            logger.error('Error searching users:', err);
        } finally {
            setSearching(false);
        }
    };

    const handleBlockUser = async (userId: string, username: string) => {
        setModalConfig({
            isOpen: true,
            type: 'confirm',
            title: 'Подтверждение',
            message: `Заблокировать ${username}?`,
            isDanger: true,
            onConfirm: async () => {
                try {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) return;

                    const { error } = await supabase
                        .from('blocked_users')
                        .insert({
                            user_id: user.id,
                            blocked_user_id: userId
                        });

                    if (error) throw error;

                    // Reload blocked users
                    await loadBlockedUsers();
                    setShowAddUser(false);
                    setSearchQuery('');
                    setSearchResults([]);
                } catch (err) {
                    logger.error('Error blocking user:', err);
                    setModalConfig({
                        isOpen: true,
                        type: 'alert',
                        title: 'Ошибка',
                        message: 'Не удалось заблокировать пользователя',
                        isDanger: true
                    });
                }
            }
        });
    };

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
                    border: '1px solid rgba(255, 77, 77, 0.3)',
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
                        borderBottom: '1px solid rgba(255, 77, 77, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        background: 'rgba(255, 77, 77, 0.05)',
                    }}
                >
                    <h2
                        style={{
                            fontSize: '22px',
                            fontWeight: '600',
                            color: '#fff',
                            margin: 0,
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                        }}
                    >
                        <span style={{ fontSize: '24px' }}>🚫</span>
                        Черный список
                    </h2>
                    <button
                        onClick={() => setShowAddUser(!showAddUser)}
                        style={{
                            padding: '8px 16px',
                            background: 'rgba(255, 77, 77, 0.2)',
                            border: '1px solid rgba(255, 77, 77, 0.5)',
                            borderRadius: '8px',
                            color: '#ff4d4d',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                        }}
                    >
                        <Icon size="200" src={showAddUser ? Icons.Cross : Icons.Plus} />
                        {showAddUser ? 'Отмена' : 'Добавить'}
                    </button>
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

                {/* Add User Section */}
                {showAddUser && (
                    <div
                        style={{
                            padding: '16px 24px',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                            background: 'rgba(255, 77, 77, 0.03)',
                        }}
                    >
                        <label htmlFor="block-search-input" style={{ display: 'none' }}>Поиск пользователя</label>
                        <input
                            id="block-search-input"
                            name="block-search"
                            type="text"
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                            placeholder="Поиск пользователя..."
                            autoFocus
                            style={{
                                width: '100%',
                                padding: '12px',
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 77, 77, 0.3)',
                                borderRadius: '8px',
                                color: '#fff',
                                fontSize: '14px',
                                outline: 'none',
                            }}
                        />

                        {/* Search Results */}
                        {searching && (
                            <div style={{ textAlign: 'center', padding: '20px' }}>
                                <Spinner variant="Secondary" />
                            </div>
                        )}

                        {!searching && searchResults.length > 0 && (
                            <div
                                style={{
                                    marginTop: '12px',
                                    maxHeight: '200px',
                                    overflowY: 'auto',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '8px',
                                }}
                            >
                                {searchResults.map((user) => (
                                    <div
                                        key={user.id}
                                        style={{
                                            padding: '12px',
                                            background: 'rgba(255, 255, 255, 0.03)',
                                            borderRadius: '8px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            cursor: 'pointer',
                                            transition: 'background 0.2s',
                                        }}
                                        onClick={() => handleBlockUser(user.id, user.username)}
                                        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 77, 77, 0.1)')}
                                        onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)')}
                                    >
                                        <div
                                            style={{
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: '50%',
                                                backgroundImage: user.avatar_url ? `url(${user.avatar_url})` : 'none',
                                                backgroundSize: 'cover',
                                                backgroundPosition: 'center',
                                                backgroundColor: 'rgba(255, 77, 77, 0.2)',
                                                color: '#ff4d4d',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '18px',
                                                fontWeight: '600',
                                            }}
                                        >
                                            {!user.avatar_url && user.username[0]?.toUpperCase()}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '15px', color: '#fff', fontWeight: '500' }}>
                                                {user.username}
                                            </div>
                                        </div>
                                        <span style={{ fontSize: '20px', color: '#ff4d4d' }}>🚫</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {!searching && searchQuery && searchResults.length === 0 && (
                            <div
                                style={{
                                    textAlign: 'center',
                                    padding: '20px',
                                    color: 'rgba(255, 255, 255, 0.5)',
                                    fontSize: '14px',
                                }}
                            >
                                Пользователи не найдены
                            </div>
                        )}
                    </div>
                )}

                {/* Content */}
                <div
                    style={{
                        flex: 1,
                        overflowY: 'auto',
                        padding: '20px 24px',
                    }}
                >
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '40px' }}>
                            <Spinner variant="Secondary" />
                        </div>
                    ) : blockedUsers.length === 0 ? (
                        <div
                            style={{
                                textAlign: 'center',
                                padding: '60px 20px',
                                color: 'rgba(255, 255, 255, 0.5)',
                            }}
                        >
                            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚫</div>
                            <div style={{ fontSize: '18px', fontWeight: '500', marginBottom: '8px' }}>
                                Черный список пуст
                            </div>
                            <div style={{ fontSize: '14px' }}>
                                Заблокированные пользователи не смогут писать вам сообщения
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {blockedUsers.map((blocked) => (
                                <div
                                    key={blocked.id}
                                    style={{
                                        padding: '16px',
                                        background: 'rgba(255, 77, 77, 0.05)',
                                        border: '1px solid rgba(255, 77, 77, 0.2)',
                                        borderRadius: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '16px',
                                    }}
                                >
                                    <div
                                        style={{
                                            width: '48px',
                                            height: '48px',
                                            borderRadius: '50%',
                                            backgroundImage: blocked.user.avatar_url ? `url(${blocked.user.avatar_url})` : 'none',
                                            backgroundSize: 'cover',
                                            backgroundPosition: 'center',
                                            backgroundColor: 'rgba(255, 77, 77, 0.2)',
                                            color: '#ff4d4d',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '20px',
                                            fontWeight: '600',
                                            border: '2px solid rgba(255, 77, 77, 0.3)',
                                        }}
                                    >
                                        {!blocked.user.avatar_url && blocked.user.username[0]?.toUpperCase()}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '16px', color: '#fff', fontWeight: '500', marginBottom: '4px' }}>
                                            {blocked.user.username}
                                        </div>
                                        <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)' }}>
                                            Заблокирован {new Date(blocked.blocked_at).toLocaleDateString('ru-RU')}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleUnblock(blocked.id, blocked.user.username)}
                                        style={{
                                            padding: '8px 16px',
                                            background: 'rgba(0, 242, 255, 0.1)',
                                            border: '1px solid rgba(0, 242, 255, 0.3)',
                                            borderRadius: '8px',
                                            color: '#00f2ff',
                                            fontSize: '13px',
                                            fontWeight: '500',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = 'rgba(0, 242, 255, 0.2)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'rgba(0, 242, 255, 0.1)';
                                        }}
                                    >
                                        Разблокировать
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <CatloverModal
                isOpen={modalConfig.isOpen}
                type={modalConfig.type}
                title={modalConfig.title}
                message={modalConfig.message}
                isDanger={modalConfig.isDanger}
                onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
                onConfirm={() => {
                    if (modalConfig.onConfirm) modalConfig.onConfirm();
                    setModalConfig(prev => ({ ...prev, isOpen: false }));
                }}
            />
        </div>
    );
}

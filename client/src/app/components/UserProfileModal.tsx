import { logger } from '../utils/logger';
import React, { useState, useEffect } from 'react';
import { Icon, Icons, Spinner } from 'folds';
import { CatloverModal } from './CatloverModal';
import { supabase } from '../../supabaseClient';
import { useMuteSettings } from '../hooks/useMuteSettings';
import { useUserPresence } from '../hooks/useUserPresence';

// Helper for icons
const getIcon = (name: string) => (Icons as any)[name] || Icons.Bell;

interface UserProfile {
    id: string;
    username: string;
    avatar_url?: string;
    about?: string;
    status?: string;
    created_at?: string;
}

interface DirectRoom {
    id: string;
    is_encrypted: boolean;
}

interface UserProfileModalProps {
    userId: string;
    onClose: () => void;
    onStartChat?: (userId: string) => void;
}

export function UserProfileModal({ userId, onClose, onStartChat }: UserProfileModalProps) {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [directRoomId, setDirectRoomId] = useState<string | null>(null);
    const [isEncrypted, setIsEncrypted] = useState(false);
    const { isMuted, muteChat, unmuteChat } = useMuteSettings();
    const [showMuteMenu, setShowMuteMenu] = useState(false);
    const [isBlocked, setIsBlocked] = useState(false);
    const [checkingBlock, setCheckingBlock] = useState(true);
    const { isOnline } = useUserPresence();
    
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
        let mounted = true;

        const loadInitialData = async () => {
            setLoading(true);
            setCheckingBlock(true);
            
            try {
                // 1. Load Profile
                const { data: users, error: profileError } = await supabase
                    .from('users')
                    .select('id, username, avatar_url, about, status, created_at')
                    .eq('id', userId)
                    .limit(1);

                if (profileError) throw profileError;
                
                if (mounted && users && users.length > 0) {
                    setProfile(users[0]);
                }
                
                // 2. Check Block Status (Parallel)
                const { data: { user } } = await supabase.auth.getUser();
                if (user && mounted) {
                    const { data: blocks } = await supabase
                        .from('blocked_users')
                        .select('id')
                        .eq('user_id', user.id)
                        .eq('blocked_user_id', userId)
                        .limit(1);
                    
                    setIsBlocked(!!(blocks && blocks.length > 0));
                    setCheckingBlock(false);
                }

                // 3. Check Direct Room (Parallel logic inside)
                if (user && mounted) {
                    const { data: rooms, error: roomError } = await supabase
                        .from('rooms')
                        .select('id, is_encrypted')
                        .eq('is_direct', true)
                        // Logic: Room involves me AND room involves them
                        .or(`and(created_by.eq.${user.id},target_user_id.eq.${userId}),and(created_by.eq.${userId},target_user_id.eq.${user.id})`)
                        .limit(1);

                    if (!roomError && rooms && rooms.length > 0) {
                        setDirectRoomId(rooms[0].id);
                        setIsEncrypted(rooms[0].is_encrypted || false);
                    }
                }

            } catch (err) {
                logger.error('Error loading profile data:', err);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        loadInitialData();

        return () => {
            mounted = false;
        };
    }, [userId]);

    const handleStartChat = async () => {
        if (directRoomId) {
            onStartChat?.(directRoomId);
            onClose();
            return;
        }

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: rooms, error } = await supabase
                .from('rooms')
                .insert({
                    is_direct: true,
                    created_by: user.id,
                    target_user_id: userId,
                })
                .select('id')
                .limit(1);

            if (error) throw error;

            if (rooms && rooms.length > 0) {
                onStartChat?.(rooms[0].id);
                onClose();
            }
        } catch (err) {
            logger.error('Error creating direct room:', err);
        }
    };

    const toggleEncryption = async () => {
        if (!directRoomId) return;
        const newValue = !isEncrypted;
        
        try {
            const { error } = await supabase
                .from('rooms')
                .update({ is_encrypted: newValue })
                .eq('id', directRoomId);

            if (error) throw error;
            setIsEncrypted(newValue);
        } catch (err) {
            logger.error('Error toggling encryption:', err);
        }
    };

    const handleBlockUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        if (isBlocked) {
            setModalConfig({
                isOpen: true,
                type: 'confirm',
                title: 'Подтверждение',
                message: `Разблокировать ${profile?.username}?`,
                onConfirm: async () => {
                    try {
                        const { error } = await supabase
                            .from('blocked_users')
                            .delete()
                            .eq('user_id', user.id)
                            .eq('blocked_user_id', userId);

                        if (error) throw error;
                        setIsBlocked(false);
                    } catch (err) {
                        logger.error('Error unblocking user:', err);
                        setModalConfig(prev => ({ ...prev, isOpen: false }));
                        // Show error alert
                    }
                }
            });
        } else {
            setModalConfig({
                isOpen: true,
                type: 'confirm',
                title: 'Подтверждение',
                message: `Заблокировать ${profile?.username}? Вы не сможете получать сообщения от этого пользователя.`,
                isDanger: true,
                onConfirm: async () => {
                    try {
                        const { error } = await supabase
                            .from('blocked_users')
                            .insert({
                                user_id: user.id,
                                blocked_user_id: userId
                            });

                        if (error) throw error;
                        setIsBlocked(true);
                        setTimeout(() => onClose(), 500);
                    } catch (err) {
                        logger.error('Error blocking user:', err);
                    }
                }
            });
        }
    };

    const isRoomMuted = directRoomId ? isMuted(directRoomId) : false;
    const online = isOnline(userId);

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.8)',
                backdropFilter: 'blur(10px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                animation: 'fadeIn 0.2s ease-out',
            }}
            onClick={onClose} // Close on backdrop click
        >
            <div
                style={{
                    background: 'linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%)',
                    border: '1px solid rgba(0, 242, 255, 0.3)',
                    borderRadius: '16px',
                    padding: '24px',
                    minWidth: '400px',
                    maxWidth: '90%',
                    maxHeight: '80vh',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '20px',
                }}
                onClick={(e) => e.stopPropagation()} // Prevent backdrop close
            >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#fff', margin: 0 }}>
                        Профиль пользователя
                    </h3>
                    <div
                        onClick={onClose}
                        style={{
                            cursor: 'pointer',
                            color: 'rgba(255, 255, 255, 0.6)',
                            fontSize: '24px',
                            lineHeight: '1',
                            padding: '4px 8px',
                        }}
                    >
                        ×
                    </div>
                </div>

                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px' }}>
                        <Spinner variant="Secondary" />
                    </div>
                ) : profile ? (
                    <>
                        {/* Avatar and Name */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                            <div style={{ position: 'relative' }}>
                                <div
                                    style={{
                                        width: '120px',
                                        height: '120px',
                                        borderRadius: '50%',
                                        backgroundImage: profile.avatar_url ? `url(${profile.avatar_url})` : 'none',
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                        backgroundColor: 'rgba(0, 242, 255, 0.1)',
                                        color: '#00f2ff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '48px',
                                        fontWeight: '600',
                                        border: '3px solid rgba(0, 242, 255, 0.2)',
                                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                                    }}
                                >
                                    {!profile.avatar_url && profile.username[0]?.toUpperCase()}
                                </div>
                                {/* Online Indicator Dot */}
                                <div style={{
                                    position: 'absolute',
                                    bottom: '8px',
                                    right: '8px',
                                    width: '16px',
                                    height: '16px',
                                    borderRadius: '50%',
                                    border: '3px solid #0f0f0f',
                                    backgroundColor: online ? '#00ff00' : 'rgba(255,255,255,0.3)',
                                }} />
                            </div>

                            <div style={{ textAlign: 'center' }}>
                                <h2 style={{ fontSize: '22px', fontWeight: '600', color: '#fff', margin: '0 0 4px 0' }}>
                                    {profile.username}
                                </h2>
                                <div style={{ fontSize: '14px', color: online ? '#00ff00' : 'rgba(255, 255, 255, 0.6)' }}>
                                    {online ? 'в сети' : 'не в сети'}
                                </div>
                            </div>
                        </div>

                        {/* About */}
                        {profile.about && (
                            <div style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px' }}>
                                <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    О пользователе
                                </div>
                                <div style={{ fontSize: '15px', color: '#fff', lineHeight: '1.5' }}>
                                    {profile.about}
                                </div>
                            </div>
                        )}

                        {/* Registration Date */}
                        {profile.created_at && (
                            <div style={{ textAlign: 'center', fontSize: '12px', color: 'rgba(255,255,255,0.4)'}}>
                                Регистрация: {new Date(profile.created_at).toLocaleDateString('ru-RU')}
                            </div>
                        )}

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                            <button onClick={handleStartChat} style={buttonStyle.primary}>
                                <Icon size="200" src={Icons.Message} />
                                {directRoomId ? 'Открыть чат' : 'Написать'}
                            </button>

                            {directRoomId && (
                                <div style={{ position: 'relative' }}>
                                    <button onClick={() => setShowMuteMenu(!showMuteMenu)} style={isRoomMuted ? buttonStyle.muted : buttonStyle.secondary}>
                                        <span style={{ fontSize: '16px' }}>{isRoomMuted ? '🔕' : '🔔'}</span>
                                        {isRoomMuted ? 'Звук выкл' : 'Звук'}
                                    </button>

                                    {showMuteMenu && (
                                        <>
                                            <div onClick={() => setShowMuteMenu(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }} />
                                            <div style={menuStyle}>
                                                {isRoomMuted ? (
                                                    <div onClick={async () => { await unmuteChat(directRoomId); setShowMuteMenu(false); }} style={menuItemStyle}>
                                                        Включить звук
                                                    </div>
                                                ) : (
                                                    [
                                                        { label: 'На 1 час', value: '1h' as const },
                                                        { label: 'На 8 часов', value: '8h' as const },
                                                        { label: 'На 1 день', value: '1d' as const },
                                                        { label: 'Навсегда', value: 'indefinite' as const },
                                                    ].map((option) => (
                                                        <div key={option.value} onClick={async () => { await muteChat(directRoomId, option.value); setShowMuteMenu(false); }} style={menuItemStyle}>
                                                            {option.label}
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {!checkingBlock && (
                                <button onClick={handleBlockUser} style={isBlocked ? buttonStyle.unblock : buttonStyle.danger}>
                                    <span style={{ fontSize: '16px' }}>{isBlocked ? '✓' : '🚫'}</span>
                                    {isBlocked ? 'Разблокировать' : 'Заблокировать'}
                                </button>
                            )}

                            {directRoomId && (
                                <button onClick={toggleEncryption} style={isEncrypted ? buttonStyle.encrypted : buttonStyle.secondary}>
                                    <Icon size="200" src={Icons.Lock} style={{ color: isEncrypted ? '#00f2ff' : 'rgba(255,255,255,0.4)' }} />
                                    {isEncrypted ? 'E2EE' : 'Шифр'}
                                </button>
                            )}
                        </div>
                    </>
                ) : (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255, 255, 255, 0.5)' }}>
                        Не удалось загрузить профиль
                    </div>
                )}
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

// Styles extracted for readability
const buttonStyle = {
    primary: {
        padding: '12px 24px',
        background: 'rgba(0, 242, 255, 0.2)',
        border: '1px solid rgba(0, 242, 255, 0.5)',
        borderRadius: '12px',
        color: '#00f2ff',
        fontSize: '14px',
        fontWeight: '500',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        transition: 'all 0.2s',
    },
    secondary: {
        padding: '12px 24px',
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '12px',
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: '14px',
        fontWeight: '500',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        transition: 'all 0.2s',
    },
    danger: {
        padding: '12px 24px',
        background: 'rgba(255, 77, 77, 0.1)',
        border: '1px solid rgba(255, 77, 77, 0.3)',
        borderRadius: '12px',
        color: '#ff4d4d',
        fontSize: '14px',
        fontWeight: '500',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        transition: 'all 0.2s',
    },
    muted: {
        padding: '12px 24px',
        background: 'rgba(255, 149, 0, 0.1)',
        border: '1px solid rgba(255, 149, 0, 0.3)',
        borderRadius: '12px',
        color: '#ff9500',
        fontSize: '14px',
        fontWeight: '500',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        transition: 'all 0.2s',
    },
    encrypted: {
        padding: '12px 24px',
        background: 'rgba(0, 242, 255, 0.15)',
        border: '1px solid rgba(0, 242, 255, 0.5)',
        borderRadius: '12px',
        color: '#00f2ff',
        fontSize: '14px',
        fontWeight: '500',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        transition: 'all 0.2s',
    },
    unblock: {
        padding: '12px 24px',
        background: 'rgba(0, 242, 255, 0.1)',
        border: '1px solid rgba(0, 242, 255, 0.3)',
        borderRadius: '12px',
        color: '#00f2ff',
        fontSize: '14px',
        fontWeight: '500',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        transition: 'all 0.2s',
    }
};

const menuStyle = {
    position: 'absolute' as const,
    top: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    marginTop: '8px',
    background: '#1a1d21',
    borderRadius: '12px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    minWidth: '180px',
    overflow: 'hidden',
    zIndex: 1000,
};

const menuItemStyle = {
    padding: '12px 16px',
    cursor: 'pointer',
    color: '#fff',
    fontSize: '14px',
    transition: 'background 0.2s',
};

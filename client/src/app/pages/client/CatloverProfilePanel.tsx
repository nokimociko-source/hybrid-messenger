import React, { useState, useMemo, useEffect } from 'react';
import { Icon, Icons, Spinner, Scroll } from 'folds';
import { SecuritySettings } from '../../components/settings/SecuritySettings';
import { encryptText, decryptText } from '../../utils/encryption';
import * as css from './CatloverProfilePanel.css';
import { Room, Message } from '../../hooks/useSupabaseChat';
import { supabase } from '../../../supabaseClient';
import { HOME_PATH } from '../paths';
import { SoundSettings } from '../../components/SoundSettings';
import { E2ESettings } from '../../components/E2ESettings';
import { GroupSettingsModal } from '../../components/GroupSettingsModal';
import { ChannelSettingsModal } from '../../components/ChannelSettingsModal';
import { CallHistory } from '../../components/CallHistory';
import { usePolls } from '../../hooks/usePolls';
import { useMuteSettings } from '../../hooks/useMuteSettings';
import { logger } from '../../utils/logger';
import { CatloverConfirmModal } from '../../components/CatloverConfirmModal';
import { CatloverAvatar } from '../../components/CatloverAvatar';
import { useUserPresence } from '../../hooks/useUserPresence';


type CatloverProfilePanelProps = {
    room: Room;
    messages: Message[];
    onClose: () => void;
    currentUserId?: string;
    onDeleteMessage?: (id: string) => Promise<void>;
};

type RoomMember = {
    id: string;
    user_id: string;
    role: 'creator' | 'admin' | 'member';
    permissions: {
        can_send_messages: boolean;
        can_send_media: boolean;
        can_add_members: boolean;
        can_pin_messages: boolean;
        can_delete_messages: boolean;
        can_ban_members: boolean;
        can_change_info: boolean;
        can_invite_users: boolean;
        can_send_polls: boolean;
        can_send_links: boolean;
    };
    joined_at: string;
    user?: {
        username: string;
        avatar_url?: string;
        status?: string;
    };
};

type UserSearchResult = {
    id: string;
    username: string;
    avatar_url?: string;
    about?: string;
};

const getIcon = (name: string) => {
    return (Icons as any)[name] || (Icons as any).Home || (Icons as any).Hash || (Icons as any).Message;
};

export function CatloverProfilePanel({ room, messages, onClose, currentUserId, onDeleteMessage }: CatloverProfilePanelProps) {
    const [activeTab, setActiveTab] = useState<'media' | 'links' | 'audio' | 'files' | 'members'>('media');
    const [members, setMembers] = useState<RoomMember[]>([]);
    const [showAddMember, setShowAddMember] = useState(false);
    const [showMemberMenu, setShowMemberMenu] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Состояния для модальных окон новых функций
    const [showSoundSettings, setShowSoundSettings] = useState(false);
    const [showE2ESettings, setShowE2ESettings] = useState(false);
    const [showMuteMenu, setShowMuteMenu] = useState(false);
    const [showGroupSettings, setShowGroupSettings] = useState(false);
    const [showChannelSettings, setShowChannelSettings] = useState(false);
    const [showCallHistory, setShowCallHistory] = useState(false);

    // Меню настроек (три точки)
    const [showSettingsMenu, setShowSettingsMenu] = useState(false);
    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean;
        type: 'alert' | 'confirm' | 'prompt';
        title: string;
        message: string;
        confirmLabel?: string;
        cancelLabel?: string;
        onConfirm?: (value?: string) => void;
        isDanger?: boolean;
        placeholder?: string;
    }>({
        isOpen: false,
        type: 'alert',
        title: '',
        message: ''
    });
    const [leaving, setLeaving] = useState(false);
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
    const { isOnline } = useUserPresence();
    const [backgroundUrl, setBackgroundUrl] = useState(room.background_url || '');
    const [uploadingBg, setUploadingBg] = useState(false);

    // Хук для опросов
    const { createPoll } = usePolls(room.id);

    // Хук для мута
    const { muteChat, unmuteChat, isMuted } = useMuteSettings();
    const isRoomMuted = isMuted(room.id);

    // Load members for groups
    useEffect(() => {
        if (!room.is_direct && room.id) {
            loadMembers();
        }
    }, [room.id, room.is_direct]);

    const loadMembers = async () => {
        const { data, error } = await supabase
            .from('room_members')
            .select(`
                id,
                user_id,
                role,
                permissions,
                joined_at
            `)
            .eq('room_id', room.id)
            .order('role', { ascending: true })
            .order('joined_at', { ascending: true });

        if (error) {
            logger.error('Error loading members:', error);
            return;
        }

        if (data && data.length > 0) {
            // Загружаем данные пользователей отдельно
            const userIds = data.map(d => d.user_id);
            const { data: users } = await supabase
                .from('users')
                .select('id, username, avatar_url, status')
                .in('id', userIds);

            const usersMap = new Map(users?.map(u => [u.id, u]) || []);
            const transformedMembers = data.map((item: any) => ({
                id: item.id,
                user_id: item.user_id,
                role: item.role,
                permissions: item.permissions,
                joined_at: item.joined_at,
                user: usersMap.get(item.user_id)
            }));

            setMembers(transformedMembers);
        } else {
            setMembers([]);
        }
    };

    const handleLeaveRoom = async () => {
        if (!room.id || !currentUserId) return;
        setLeaving(true);
        try {
            const { error } = await supabase
                .from('room_members')
                .delete()
                .eq('room_id', room.id)
                .eq('user_id', currentUserId);

            if (error) throw error;
            window.location.hash = HOME_PATH;
            onClose();
        } catch (err) {
            logger.error('Error leaving room:', err);
            setModalConfig({
                isOpen: true,
                type: 'alert',
                title: 'Ошибка',
                message: 'Не удалось покинуть группу. Попробуйте позже.',
                isDanger: true
            });
        } finally {
            setLeaving(false);
            setModalConfig(prev => ({ ...prev, isOpen: false }));
        }
    };


    const handlePromoteToAdmin = async (memberId: string, userId: string) => {
        const { error } = await supabase
            .from('room_members')
            .update({
                role: 'admin',
                permissions: {
                    can_send_messages: true,
                    can_send_media: true,
                    can_add_members: true,
                    can_pin_messages: true,
                    can_delete_messages: true,
                    can_ban_members: true,
                    can_change_info: true,
                    can_invite_users: true,
                    can_send_polls: true,
                    can_send_links: true
                }
            })
            .eq('id', memberId);

        if (!error) {
            loadMembers();
            setShowMemberMenu(null);
        }
    };

    const handleDemoteAdmin = async (memberId: string) => {
        const { error } = await supabase
            .from('room_members')
            .update({
                role: 'member',
                permissions: {
                    can_send_messages: true,
                    can_send_media: true,
                    can_add_members: false,
                    can_pin_messages: false,
                    can_delete_messages: false,
                    can_ban_members: false,
                    can_change_info: false,
                    can_invite_users: false,
                    can_send_polls: true,
                    can_send_links: true
                }
            })
            .eq('id', memberId);

        if (!error) {
            loadMembers();
            setShowMemberMenu(null);
        }
    };

    const handleRemoveMember = async (memberId: string, username: string) => {
        setModalConfig({
            isOpen: true,
            type: 'confirm',
            title: 'Удаление участника',
            message: `Вы действительно хотите удалить ${username} из группы?`,
            confirmLabel: 'Удалить',
            cancelLabel: 'Отмена',
            isDanger: true,
            onConfirm: async () => {
                const { error } = await supabase
                    .from('room_members')
                    .delete()
                    .eq('id', memberId);

                if (!error) {
                    loadMembers();
                    setShowMemberMenu(null);
                }
                setModalConfig(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const searchUsers = async (query: string) => {
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        const { data, error } = await supabase
            .rpc('search_users', { search_query: query });

        if (!error && data) {
            // Filter out users who are already members
            const memberIds = members.map(m => m.user_id);
            const filtered = data.filter((u: UserSearchResult) => !memberIds.includes(u.id));
            setSearchResults(filtered);
        }
        setIsSearching(false);
    };

    const handleAddMember = async (userId: string) => {
        const { error } = await supabase
            .from('room_members')
            .insert({
                room_id: room.id,
                user_id: userId,
                role: 'member',
                invited_by: currentUserId,
                permissions: {
                    can_send_messages: true,
                    can_send_media: true,
                    can_add_members: false,
                    can_pin_messages: false,
                    can_delete_messages: false,
                    can_ban_members: false,
                    can_change_info: false,
                    can_invite_users: false,
                    can_send_polls: true,
                    can_send_links: true
                }
            });

        if (!error) {
            loadMembers();
            setShowAddMember(false);
            setSearchQuery('');
            setSearchResults([]);
        }
    };

    const handleBackgroundSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingBg(true);
        try {
            const fileExt = file.name.split('.').pop();
            const filePath = `backgrounds/${room.id}_${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('media')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage
                .from('media')
                .getPublicUrl(filePath);

            const newUrl = data.publicUrl;
            setBackgroundUrl(newUrl);

            // Update room in database
            const { error: updateError } = await supabase
                .from('rooms')
                .update({ background_url: newUrl })
                .eq('id', room.id);

            if (updateError) throw updateError;
        } catch (error) {
            logger.error('Error uploading background:', error);
            setModalConfig({
                isOpen: true,
                type: 'alert',
                title: 'Ошибка',
                message: 'Не удалось загрузить фон'
            });
        } finally {
            setUploadingBg(false);
        }
    };

    const handleRemoveBackground = async () => {
        try {
            setBackgroundUrl('');
            const { error } = await supabase
                .from('rooms')
                .update({ background_url: null })
                .eq('id', room.id);
            if (error) throw error;
        } catch (error) {
            logger.error('Error removing background:', error);
        }
    };

    const isDirect = room.is_direct;
    const isSavedMessages = isDirect && room.created_by === room.target_user_id;
    const isGroup = !isDirect && !isSavedMessages;
    const isCreator = currentUserId === room.created_by;
    const currentMember = members.find(m => m.user_id === currentUserId);
    const isAdmin = currentMember?.role === 'admin' || currentMember?.role === 'creator';
    const canManageMembers = isAdmin || currentMember?.permissions.can_add_members;

    const displayName = isSavedMessages ? 'Избранное' : (isDirect ? (room.other_user?.username || 'Unknown User') : (room.name || 'Group Chat'));
    const avatarUrl = isDirect ? room.other_user?.avatar_url : room.avatar_url;
    const initial = displayName[0]?.toUpperCase() || '?';

    const isVoiceUrl = (url: string) => /voice_\d+/i.test(url) || /\baudio\b/i.test(url);
    const isVideoUrl = (url: string) => /\.(mp4|webm|mov)$/i.test(url) || /video_circle/i.test(url);

    const sharedMedia = useMemo(() => {
        return messages.filter(m => m.media_url && !isVoiceUrl(m.media_url!) && (m.media_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) || !isVideoUrl(m.media_url)));
    }, [messages]);

    const sharedVideos = useMemo(() => {
        return messages.filter(m => m.media_url && isVideoUrl(m.media_url));
    }, [messages]);

    const sharedAudio = useMemo(() => {
        return messages.filter(m => m.media_url && isVoiceUrl(m.media_url!));
    }, [messages]);

    const sharedFiles = useMemo(() => {
        return messages.filter(m => m.file_name);
    }, [messages]);

    const sharedLinks = useMemo(() => {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return messages.filter(m => m.content && m.content.match(urlRegex));
    }, [messages]);

    const totalMedia = sharedMedia.length + sharedVideos.length;
    const memberCount = isDirect ? 2 : (room.member_count || members.length || 1);

    const getRoleName = (role: string) => {
        switch (role) {
            case 'creator': return 'Создатель';
            case 'admin': return 'Администратор';
            default: return 'Участник';
        }
    };

    const getRoleColor = (role: string) => {
        switch (role) {
            case 'creator': return '#00f2ff';
            case 'admin': return '#ff9500';
            default: return 'rgba(255, 255, 255, 0.5)';
        }
    };

    return (
        <div className={css.ProfilePanelContainer}>
            {/* Header with close button and settings menu */}
            <div className={css.ProfileHeader} style={{ justifyContent: 'space-between' }}>
                <div className={css.CloseButton} onClick={onClose}>
                    <Icon size="200" src={Icons.Cross} />
                </div>

                {/* Settings Menu Button (три точки) */}
                {(isGroup || isDirect) && (
                    <div style={{ position: 'relative' }}>
                        <div
                            onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                            style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                background: showSettingsMenu ? 'rgba(0, 242, 255, 0.15)' : 'transparent',
                                transition: 'background 0.2s',
                                fontSize: '20px',
                                color: '#fff',
                                fontWeight: 'bold',
                                letterSpacing: '1px'
                            }}
                            onMouseEnter={(e) => {
                                if (!showSettingsMenu) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                            }}
                            onMouseLeave={(e) => {
                                if (!showSettingsMenu) e.currentTarget.style.background = 'transparent';
                            }}
                        >
                            ⋮
                        </div>

                        {/* Dropdown Menu */}
                        {showSettingsMenu && (
                            <>
                                <div
                                    onClick={() => setShowSettingsMenu(false)}
                                    style={{
                                        position: 'fixed',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        zIndex: 999
                                    }}
                                />
                                <div style={{
                                    position: 'absolute',
                                    top: '44px',
                                    right: '0',
                                    background: '#1a1d21',
                                    borderRadius: '12px',
                                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    minWidth: '220px',
                                    overflow: 'hidden',
                                    zIndex: 1000
                                }}>
                                    {isAdmin && (
                                        <div
                                            onClick={() => {
                                                if (room.type === 'channel') {
                                                    setShowChannelSettings(true);
                                                } else {
                                                    setShowGroupSettings(true);
                                                }
                                                setShowSettingsMenu(false);
                                            }}
                                            style={{
                                                padding: '14px 16px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px',
                                                color: '#00f2ff',
                                                fontSize: '15px',
                                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                whiteSpace: 'nowrap',
                                                borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.background = 'rgba(0, 242, 255, 0.1)';
                                                e.currentTarget.style.paddingLeft = '20px';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.background = 'transparent';
                                                e.currentTarget.style.paddingLeft = '16px';
                                            }}
                                        >
                                            <Icon size="200" src={Icons.Setting} style={{ color: '#00f2ff' }} />
                                            <span style={{ fontWeight: '600' }}>{room.type === 'channel' ? 'Управление каналом' : 'Управление группой'}</span>
                                        </div>
                                    )}

                                    <div
                                        onClick={() => {
                                            setShowSoundSettings(true);
                                            setShowSettingsMenu(false);
                                        }}
                                        style={{
                                            padding: '14px 16px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            color: 'rgba(255, 255, 255, 0.9)',
                                            fontSize: '14px',
                                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                            whiteSpace: 'nowrap'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                            e.currentTarget.style.paddingLeft = '20px';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'transparent';
                                            e.currentTarget.style.paddingLeft = '16px';
                                        }}
                                    >
                                        <Icon size="200" src={Icons.VolumeHigh} style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
                                        <span>Настройки звука</span>
                                    </div>

                                    <div
                                        onClick={() => {
                                            setShowE2ESettings(true);
                                            setShowSettingsMenu(false);
                                        }}
                                        style={{
                                            padding: '14px 16px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            color: 'rgba(255, 255, 255, 0.9)',
                                            fontSize: '14px',
                                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                            whiteSpace: 'nowrap'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                            e.currentTarget.style.paddingLeft = '20px';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'transparent';
                                            e.currentTarget.style.paddingLeft = '16px';
                                        }}
                                    >
                                        <Icon size="200" src={Icons.Lock} style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
                                        <span>Шифрование E2E</span>
                                    </div>

                                    <div
                                        onClick={() => {
                                            setShowCallHistory(true);
                                            setShowSettingsMenu(false);
                                        }}
                                        style={{
                                            padding: '14px 16px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            color: 'rgba(255, 255, 255, 0.9)',
                                            fontSize: '14px',
                                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                            whiteSpace: 'nowrap'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                            e.currentTarget.style.paddingLeft = '20px';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'transparent';
                                            e.currentTarget.style.paddingLeft = '16px';
                                        }}
                                    >
                                        <Icon size="200" src={Icons.Phone} style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
                                        <span>История звонков</span>
                                    </div>


                                    {!room.is_direct && (
                                        <div
                                            onClick={() => {
                                                setShowLeaveConfirm(true);
                                                setShowSettingsMenu(false);
                                            }}
                                            style={{
                                                padding: '14px 16px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px',
                                                color: '#ff4d4d',
                                                fontSize: '14px',
                                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                whiteSpace: 'nowrap',
                                                borderTop: '1px solid rgba(255, 77, 77, 0.1)'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.background = 'rgba(255, 77, 77, 0.1)';
                                                e.currentTarget.style.paddingLeft = '20px';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.background = 'transparent';
                                                e.currentTarget.style.paddingLeft = '16px';
                                            }}
                                        >
                                            <Icon size="200" src={Icons.Cross} style={{ color: '#ff4d4d' }} />
                                            <span style={{ fontWeight: '600' }}>{room.type === 'channel' ? 'Покинуть канал' : 'Покинуть группу'}</span>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>


            <Scroll>
                <div style={{ padding: '24px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                    <CatloverAvatar
                        url={avatarUrl}
                        displayName={displayName}
                        size={100}
                        style={{
                            backgroundColor: 'rgba(0, 242, 255, 0.1)',
                            border: '3px solid rgba(0, 242, 255, 0.2)',
                            boxShadow: '0 0 30px rgba(0, 242, 255, 0.1)'
                        }}
                    />
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '20px', fontWeight: '600', color: '#fff', marginBottom: '4px' }}>
                            {displayName}
                        </div>
                        <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.5)' }}>
                            {isDirect ? (room.target_user_id && isOnline(room.target_user_id) ? 'в сети' : 'не в сети') : `${memberCount} участников`}
                        </div>
                        {room.topic && (
                            <div style={{
                                marginTop: '12px',
                                padding: '10px 16px',
                                background: 'rgba(255, 255, 255, 0.03)',
                                border: '1px solid rgba(255, 255, 255, 0.05)',
                                borderRadius: '12px',
                                fontSize: '13px',
                                color: 'rgba(255, 255, 255, 0.7)',
                                lineHeight: '1.4',
                                textAlign: 'center',
                                maxWidth: '280px',
                                wordBreak: 'break-word'
                            }}>
                                {room.topic}
                            </div>
                        )}
                    </div>

                    {/* Chat Settings (Background) for DMs and Groups */}
                    <div style={{
                        width: '100%',
                        padding: '0 16px',
                        marginBottom: '16px'
                    }}>
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                            borderRadius: '16px',
                            padding: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)', fontWeight: '500' }}>Фон чата</div>
                                <label style={{
                                    fontSize: '12px',
                                    color: '#00f2ff',
                                    cursor: uploadingBg ? 'not-allowed' : 'pointer',
                                    padding: '4px 8px',
                                    background: 'rgba(0, 242, 255, 0.1)',
                                    borderRadius: '6px'
                                }}>
                                    {uploadingBg ? 'Загрузка...' : (backgroundUrl ? 'Изменить' : 'Выбрать')}
                                    <input type="file" accept="image/*" onChange={handleBackgroundSelect} disabled={uploadingBg} style={{ display: 'none' }} />
                                </label>
                            </div>

                            {backgroundUrl && (
                                <div style={{ position: 'relative', width: '100%', height: '80px', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(0, 242, 255, 0.2)' }}>
                                    <img src={backgroundUrl} alt="Background" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    <button
                                        onClick={handleRemoveBackground}
                                        style={{
                                            position: 'absolute',
                                            top: '4px',
                                            right: '4px',
                                            width: '24px',
                                            height: '24px',
                                            borderRadius: '50%',
                                            background: 'rgba(255, 77, 77, 0.8)',
                                            border: 'none',
                                            color: '#fff',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '14px'
                                        }}
                                    >
                                        ×
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div style={{ padding: '0 16px', marginBottom: '24px' }}>
                    <div
                        className="custom-scrollbar"
                        style={{
                            display: 'flex',
                            background: 'rgba(255, 255, 255, 0.05)',
                            borderRadius: '12px',
                            padding: '4px',
                            gap: '4px',
                            overflowX: 'auto',
                            msOverflowStyle: 'none',
                            scrollbarWidth: 'none'
                        }}
                    >
                        {(['media', 'files', 'links', 'audio', 'members'] as const).map(tab => {
                            if (tab === 'members' && !isGroup) return null;
                            const isActive = activeTab === tab;
                            const label = {
                                media: 'Медиа',
                                files: 'Файлы',
                                links: 'Ссылки',
                                audio: 'Аудио',
                                members: 'Люди'
                            }[tab];
                            return (
                                <div
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    style={{
                                        flex: '0 0 auto',
                                        padding: '8px 16px',
                                        textAlign: 'center',
                                        fontSize: '13px',
                                        fontWeight: isActive ? '600' : '400',
                                        color: isActive ? '#00f2ff' : 'rgba(255, 255, 255, 0.5)',
                                        background: isActive ? 'rgba(0, 242, 255, 0.1)' : 'transparent',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    {label}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div style={{ padding: '0 16px 24px' }}>
                    {activeTab === 'media' && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
                            {sharedMedia.length > 0 ? sharedMedia.map(m => (
                                <div
                                    key={m.id}
                                    style={{
                                        aspectRatio: '1',
                                        backgroundImage: `url(${m.media_url})`,
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                        position: 'relative',
                                        overflow: 'hidden',
                                        border: '1px solid rgba(255, 255, 255, 0.1)'
                                    }}
                                    onClick={() => m.media_url && window.open(m.media_url, '_blank')}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'scale(1.02)';
                                        e.currentTarget.style.borderColor = 'rgba(0, 242, 255, 0.3)';
                                        const btn = e.currentTarget.querySelector('.delete-media-btn') as HTMLElement;
                                        if (btn) btn.style.opacity = '1';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'scale(1)';
                                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                                        const btn = e.currentTarget.querySelector('.delete-media-btn') as HTMLElement;
                                        if (btn) btn.style.opacity = '0';
                                    }}
                                >
                                    {/* Delete Button on Hover */}
                                    {onDeleteMessage && (m.user_id === currentUserId || isAdmin) && (
                                        <div
                                            className="delete-media-btn"
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                setModalConfig({
                                                    isOpen: true,
                                                    type: 'confirm',
                                                    title: 'Удаление медиа',
                                                    message: 'Вы действительно хотите удалить это медиа? Сообщение будет удалено полностью.',
                                                    confirmLabel: 'Удалить',
                                                    cancelLabel: 'Отмена',
                                                    isDanger: true,
                                                    onConfirm: async () => {
                                                        if (onDeleteMessage) await onDeleteMessage(m.id);
                                                        setModalConfig(prev => ({ ...prev, isOpen: false }));
                                                    }
                                                });
                                            }}
                                            style={{
                                                position: 'absolute',
                                                top: '4px',
                                                right: '4px',
                                                width: '24px',
                                                height: '24px',
                                                borderRadius: '6px',
                                                background: 'rgba(255, 77, 77, 0.9)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: '#fff',
                                                opacity: 0,
                                                transition: 'all 0.2s',
                                                zIndex: 10,
                                                boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.background = '#ff4d4d';
                                                e.currentTarget.style.transform = 'scale(1.1)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.background = 'rgba(255, 77, 77, 0.9)';
                                                e.currentTarget.style.transform = 'scale(1)';
                                            }}
                                        >
                                            <Icon size="100" src={Icons.Cross} />
                                        </div>
                                    )}
                                </div>
                            )) : (
                                <div style={{
                                    gridColumn: 'span 3',
                                    textAlign: 'center',
                                    padding: '60px 20px',
                                    color: 'rgba(255, 255, 255, 0.4)',
                                    fontSize: '14px'
                                }}>
                                    Медиа пока нет
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'files' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {sharedFiles.length > 0 ? sharedFiles.map(m => (
                                <div key={m.id} style={{
                                    padding: '12px',
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    borderRadius: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    cursor: 'pointer',
                                    transition: 'background 0.2s'
                                }}
                                    onClick={() => m.media_url && window.open(m.media_url, '_blank')}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'}
                                >
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '8px',
                                        background: 'rgba(0, 242, 255, 0.1)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#00f2ff'
                                    }}>
                                        <Icon size="200" src={Icons.File} />
                                    </div>
                                    <div style={{ flexGrow: 1, minWidth: 0 }}>
                                        <div style={{
                                            fontSize: '14px',
                                            color: '#fff',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                        }}>
                                            {m.file_name}
                                        </div>
                                        <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)' }}>
                                            {m.file_size ? `${(m.file_size / 1024).toFixed(1)} KB` : 'Файл'}
                                        </div>
                                    </div>

                                    {/* Delete Button */}
                                    {onDeleteMessage && (m.user_id === currentUserId || isAdmin) && (
                                        <div
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                setModalConfig({
                                                    isOpen: true,
                                                    type: 'confirm',
                                                    title: 'Удаление файла',
                                                    message: `Удалить файл "${m.file_name}"?`,
                                                    confirmLabel: 'Удалить',
                                                    cancelLabel: 'Отмена',
                                                    isDanger: true,
                                                    onConfirm: async () => {
                                                        if (onDeleteMessage) await onDeleteMessage(m.id);
                                                        setModalConfig(prev => ({ ...prev, isOpen: false }));
                                                    }
                                                });
                                            }}
                                            style={{
                                                width: '32px',
                                                height: '32px',
                                                borderRadius: '8px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: 'rgba(255, 77, 77, 0.6)',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.background = 'rgba(255, 77, 77, 0.1)';
                                                e.currentTarget.style.color = '#ff4d4d';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.background = 'transparent';
                                                e.currentTarget.style.color = 'rgba(255, 77, 77, 0.6)';
                                            }}
                                        >
                                            <Icon size="100" src={Icons.Cross} />
                                        </div>
                                    )}
                                </div>
                            )) : (
                                <div style={{
                                    textAlign: 'center',
                                    padding: '60px 20px',
                                    color: 'rgba(255, 255, 255, 0.4)',
                                    fontSize: '14px'
                                }}>
                                    Файлов пока нет
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'links' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {sharedLinks.length > 0 ? sharedLinks.map(m => {
                                const urlMatch = m.content.match(/(https?:\/\/[^\s]+)/);
                                const url = urlMatch ? urlMatch[0] : m.content;
                                return (
                                    <div key={m.id} style={{
                                        padding: '12px',
                                        background: 'rgba(255, 255, 255, 0.03)',
                                        borderRadius: '12px',
                                        cursor: 'pointer',
                                        transition: 'background 0.2s'
                                    }}
                                        onClick={() => window.open(url, '_blank')}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{
                                                    fontSize: '14px',
                                                    color: '#00f2ff',
                                                    wordBreak: 'break-all',
                                                    marginBottom: '4px'
                                                }}>
                                                    {url}
                                                </div>
                                                <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)' }}>
                                                    {new Date(m.created_at).toLocaleDateString('ru-RU', {
                                                        day: 'numeric',
                                                        month: 'short',
                                                        year: 'numeric'
                                                    })}
                                                </div>
                                            </div>

                                            {/* Delete Button */}
                                            {onDeleteMessage && (m.user_id === currentUserId || isAdmin) && (
                                                <div
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        setModalConfig({
                                                            isOpen: true,
                                                            type: 'confirm',
                                                            title: 'Удаление ссылки',
                                                            message: 'Удалить эту ссылку?',
                                                            confirmLabel: 'Удалить',
                                                            cancelLabel: 'Отмена',
                                                            isDanger: true,
                                                            onConfirm: async () => {
                                                                if (onDeleteMessage) await onDeleteMessage(m.id);
                                                                setModalConfig(prev => ({ ...prev, isOpen: false }));
                                                            }
                                                        });
                                                    }}
                                                    style={{
                                                        width: '28px',
                                                        height: '28px',
                                                        borderRadius: '6px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        color: 'rgba(255, 77, 77, 0.5)',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s',
                                                        marginTop: '-4px',
                                                        marginRight: '-4px'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.background = 'rgba(255, 77, 77, 0.1)';
                                                        e.currentTarget.style.color = '#ff4d4d';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.background = 'transparent';
                                                        e.currentTarget.style.color = 'rgba(255, 77, 77, 0.5)';
                                                    }}
                                                >
                                                    <Icon size="100" src={Icons.Cross} />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            }) : (
                                <div style={{
                                    textAlign: 'center',
                                    padding: '60px 20px',
                                    color: 'rgba(255, 255, 255, 0.4)',
                                    fontSize: '14px'
                                }}>
                                    Ссылок пока нет
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'audio' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {sharedAudio.length > 0 ? sharedAudio.map(m => (
                                <div key={m.id} style={{
                                    padding: '12px',
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    borderRadius: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px'
                                }}>
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '50%',
                                        background: 'rgba(0, 242, 255, 0.1)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#00f2ff'
                                    }}>
                                        <Icon size="200" src={Icons.Mic} />
                                    </div>
                                    <div style={{ flexGrow: 1 }}>
                                        <div style={{ fontSize: '14px', color: '#fff' }}>
                                            Голосовое сообщение
                                        </div>
                                        <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)' }}>
                                            {new Date(m.created_at).toLocaleString('ru-RU', {
                                                day: 'numeric',
                                                month: 'short',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </div>
                                    </div>

                                    {/* Delete Button */}
                                    {onDeleteMessage && (m.user_id === currentUserId || isAdmin) && (
                                        <div
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                setModalConfig({
                                                    isOpen: true,
                                                    type: 'confirm',
                                                    title: 'Удаление сообщения',
                                                    message: 'Удалить голосовое сообщение?',
                                                    confirmLabel: 'Удалить',
                                                    cancelLabel: 'Отмена',
                                                    isDanger: true,
                                                    onConfirm: async () => {
                                                        if (onDeleteMessage) await onDeleteMessage(m.id);
                                                        setModalConfig(prev => ({ ...prev, isOpen: false }));
                                                    }
                                                });
                                            }}
                                            style={{
                                                width: '32px',
                                                height: '32px',
                                                borderRadius: '16px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: 'rgba(255, 77, 77, 0.6)',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.background = 'rgba(255, 77, 77, 0.1)';
                                                e.currentTarget.style.color = '#ff4d4d';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.background = 'transparent';
                                                e.currentTarget.style.color = 'rgba(255, 77, 77, 0.6)';
                                            }}
                                        >
                                            <Icon size="100" src={Icons.Cross} />
                                        </div>
                                    )}
                                </div>
                            )) : (
                                <div style={{
                                    textAlign: 'center',
                                    padding: '60px 20px',
                                    color: 'rgba(255, 255, 255, 0.4)',
                                    fontSize: '14px'
                                }}>
                                    Голосовых сообщений пока нет
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'members' && isGroup && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {/* Add member button */}
                            {canManageMembers && (
                                <button style={{
                                    padding: '12px',
                                    background: 'rgba(0, 242, 255, 0.1)',
                                    border: '1px solid rgba(0, 242, 255, 0.3)',
                                    borderRadius: '12px',
                                    color: '#00f2ff',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    transition: 'all 0.2s',
                                    marginBottom: '8px'
                                }}
                                    onClick={() => setShowAddMember(true)}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 242, 255, 0.2)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0, 242, 255, 0.1)'}
                                >
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '50%',
                                        background: 'rgba(0, 242, 255, 0.2)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '20px'
                                    }}>
                                        +
                                    </div>
                                    <div style={{ flexGrow: 1, textAlign: 'left' }}>
                                        Добавить участника
                                    </div>
                                </button>
                            )}

                            {/* Members list */}
                            {members.length > 0 && members.map(member => (
                                <div key={member.id} style={{
                                    padding: '12px',
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    borderRadius: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    position: 'relative',
                                    transition: 'background 0.2s'
                                }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'}
                                >
                                    {/* Avatar */}
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '50%',
                                        backgroundImage: member.user?.avatar_url ? `url(${member.user.avatar_url})` : 'none',
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                        backgroundColor: 'rgba(0, 242, 255, 0.1)',
                                        color: '#00f2ff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '16px',
                                        fontWeight: '600',
                                        border: '2px solid rgba(0, 242, 255, 0.2)',
                                        position: 'relative'
                                    }}>
                                        {!member.user?.avatar_url && (member.user?.username?.[0]?.toUpperCase() || '?')}
                                        {member.user?.status === 'online' && (
                                            <div style={{
                                                position: 'absolute',
                                                bottom: '-2px',
                                                right: '-2px',
                                                width: '12px',
                                                height: '12px',
                                                borderRadius: '50%',
                                                backgroundColor: '#00ff00',
                                                border: '2px solid #0a0a0a'
                                            }} />
                                        )}
                                    </div>

                                    {/* User info */}
                                    <div style={{ flexGrow: 1, minWidth: 0 }}>
                                        <div style={{
                                            fontSize: '14px',
                                            color: '#fff',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}>
                                            {member.user?.username || 'Unknown'}
                                            {member.user_id === currentUserId && (
                                                <span style={{
                                                    fontSize: '12px',
                                                    color: 'rgba(255, 255, 255, 0.5)'
                                                }}>
                                                    (вы)
                                                </span>
                                            )}
                                        </div>
                                        <div style={{
                                            fontSize: '12px',
                                            color: getRoleColor(member.role),
                                            fontWeight: '500'
                                        }}>
                                            {getRoleName(member.role)}
                                        </div>
                                    </div>

                                    {/* Menu button for admins */}
                                    {isAdmin && member.user_id !== currentUserId && member.role !== 'creator' && (
                                        <div
                                            style={{
                                                padding: '8px',
                                                cursor: 'pointer',
                                                color: 'rgba(255, 255, 255, 0.5)',
                                                transition: 'color 0.2s'
                                            }}
                                            onClick={() => setShowMemberMenu(showMemberMenu === member.id ? null : member.id)}
                                            onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
                                            onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)'}
                                        >
                                            ⋮
                                        </div>
                                    )}

                                    {/* Member menu */}
                                    {showMemberMenu === member.id && (
                                        <div style={{
                                            position: 'absolute',
                                            right: '12px',
                                            top: '100%',
                                            marginTop: '4px',
                                            background: 'linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%)',
                                            border: '1px solid rgba(0, 242, 255, 0.3)',
                                            borderRadius: '12px',
                                            padding: '8px',
                                            minWidth: '180px',
                                            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
                                            zIndex: 100
                                        }}>
                                            {member.role === 'member' && isCreator && (
                                                <div style={{
                                                    padding: '10px 12px',
                                                    cursor: 'pointer',
                                                    borderRadius: '8px',
                                                    fontSize: '14px',
                                                    color: '#00f2ff',
                                                    transition: 'background 0.2s'
                                                }}
                                                    onClick={() => handlePromoteToAdmin(member.id, member.user_id)}
                                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 242, 255, 0.1)'}
                                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                >
                                                    Назначить админом
                                                </div>
                                            )}
                                            {member.role === 'admin' && isCreator && (
                                                <div style={{
                                                    padding: '10px 12px',
                                                    cursor: 'pointer',
                                                    borderRadius: '8px',
                                                    fontSize: '14px',
                                                    color: '#fff',
                                                    transition: 'background 0.2s'
                                                }}
                                                    onClick={() => handleDemoteAdmin(member.id)}
                                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                >
                                                    Снять права админа
                                                </div>
                                            )}
                                            <div style={{
                                                padding: '10px 12px',
                                                cursor: 'pointer',
                                                borderRadius: '8px',
                                                fontSize: '14px',
                                                color: '#ff9500',
                                                transition: 'background 0.2s',
                                                borderTop: '1px solid rgba(255, 255, 255, 0.05)'
                                            }}
                                                onClick={async () => {
                                                    setModalConfig({
                                                        isOpen: true,
                                                        type: 'confirm',
                                                        title: 'Бан участника',
                                                        message: `Забанить ${member.user?.username || 'участника'}?`,
                                                        confirmLabel: 'Забанить',
                                                        cancelLabel: 'Отмена',
                                                        isDanger: true,
                                                        onConfirm: async () => {
                                                            const { error } = await supabase
                                                                .from('room_members')
                                                                .update({
                                                                    is_banned: true,
                                                                    banned_at: new Date().toISOString(),
                                                                    banned_by: currentUserId,
                                                                    ban_reason: 'Забанен администратором'
                                                                })
                                                                .eq('id', member.id);
                                                            if (!error) {
                                                                loadMembers();
                                                                setShowMemberMenu(null);
                                                            }
                                                            setModalConfig(prev => ({ ...prev, isOpen: false }));
                                                        }
                                                    });
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 149, 0, 0.1)'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                            >
                                                Забанить
                                            </div>
                                            <div style={{
                                                padding: '10px 12px',
                                                cursor: 'pointer',
                                                borderRadius: '8px',
                                                fontSize: '14px',
                                                color: '#ff4d4d',
                                                transition: 'background 0.2s'
                                            }}
                                                onClick={() => handleRemoveMember(member.id, member.user?.username || 'участника')}
                                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 77, 77, 0.1)'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                            >
                                                Удалить из группы
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </Scroll>


            {
                showAddMember && (
                    <div style={{
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
                        animation: 'fadeIn 0.2s ease-out'
                    }}
                        onClick={() => setShowAddMember(false)}
                    >
                        <div style={{
                            background: 'linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%)',
                            border: '1px solid rgba(0, 242, 255, 0.3)',
                            borderRadius: '16px',
                            padding: '24px',
                            minWidth: '400px',
                            maxWidth: '90%',
                            maxHeight: '80vh',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '16px',
                            animation: 'modalSlideIn 0.3s ease-out'
                        }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <h3 style={{
                                    fontSize: '20px',
                                    fontWeight: '600',
                                    color: '#fff',
                                    margin: 0
                                }}>
                                    Добавить участника
                                </h3>
                                <div
                                    onClick={() => setShowAddMember(false)}
                                    style={{
                                        cursor: 'pointer',
                                        color: 'rgba(255, 255, 255, 0.6)',
                                        fontSize: '24px',
                                        lineHeight: '1',
                                        padding: '4px 8px'
                                    }}
                                >
                                    ×
                                </div>
                            </div>

                            {/* Search input */}
                            <label htmlFor="member-search-input" style={{ display: 'none' }}>Поиск по имени пользователя</label>
                            <input
                                id="member-search-input"
                                name="member-search"
                                type="text"
                                placeholder="Поиск по имени пользователя..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    searchUsers(e.target.value);
                                }}
                                style={{
                                    padding: '12px 16px',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(0, 242, 255, 0.3)',
                                    borderRadius: '12px',
                                    color: '#fff',
                                    fontSize: '14px',
                                    outline: 'none'
                                }}
                                autoFocus
                            />

                            {/* Search results */}
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                maxHeight: '400px',
                                overflowY: 'auto'
                            }}>
                                {isSearching && (
                                    <div style={{
                                        textAlign: 'center',
                                        padding: '20px',
                                        color: 'rgba(255, 255, 255, 0.5)'
                                    }}>
                                        Поиск...
                                    </div>
                                )}

                                {!isSearching && searchQuery && searchResults.length === 0 && (
                                    <div style={{
                                        textAlign: 'center',
                                        padding: '20px',
                                        color: 'rgba(255, 255, 255, 0.5)'
                                    }}>
                                        Пользователи не найдены
                                    </div>
                                )}

                                {searchResults.map(user => (
                                    <div key={user.id} style={{
                                        padding: '12px',
                                        background: 'rgba(255, 255, 255, 0.03)',
                                        borderRadius: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        cursor: 'pointer',
                                        transition: 'background 0.2s'
                                    }}
                                        onClick={() => handleAddMember(user.id)}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 242, 255, 0.1)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'}
                                    >
                                        <CatloverAvatar
                                            url={user.avatar_url}
                                            displayName={user.username}
                                            size={40}
                                            style={{
                                                backgroundColor: 'rgba(0, 242, 255, 0.1)',
                                                border: '2px solid rgba(0, 242, 255, 0.2)'
                                            }}
                                        />
                                        <div style={{ flexGrow: 1 }}>
                                            <div style={{
                                                fontSize: '14px',
                                                color: '#fff',
                                                fontWeight: '500'
                                            }}>
                                                {user.username}
                                            </div>
                                            {user.about && (
                                                <div style={{
                                                    fontSize: '12px',
                                                    color: 'rgba(255, 255, 255, 0.5)',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {user.about}
                                                </div>
                                            )}
                                        </div>
                                        <div style={{
                                            padding: '6px 12px',
                                            background: 'rgba(0, 242, 255, 0.2)',
                                            borderRadius: '8px',
                                            fontSize: '12px',
                                            color: '#00f2ff',
                                            fontWeight: '500'
                                        }}>
                                            Добавить
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Sub-modals moved to CatloverRoomView for proper stacking context */}

            {
                showSoundSettings && (
                    <SoundSettings
                        onClose={() => setShowSoundSettings(false)}
                    />
                )
            }

            {
                showE2ESettings && (
                    <E2ESettings
                        onClose={() => setShowE2ESettings(false)}
                    />
                )
            }

            {
                showGroupSettings && (
                    <GroupSettingsModal
                        room={room}
                        onClose={() => setShowGroupSettings(false)}
                        onUpdate={() => {
                            // Room will be updated automatically via realtime subscription
                            setShowGroupSettings(false);
                        }}
                    />
                )
            }

            {
                showChannelSettings && (
                    <ChannelSettingsModal
                        room={room}
                        onClose={() => setShowChannelSettings(false)}
                        onUpdate={() => {
                            setShowChannelSettings(false);
                        }}
                    />
                )
            }

            {
                showCallHistory && (
                    <CallHistory
                        roomId={room.id}
                        onClose={() => setShowCallHistory(false)}
                    />
                )
            }

            {/* Global Modal */}
            <CatloverConfirmModal
                isOpen={modalConfig.isOpen}
                type={modalConfig.type}
                title={modalConfig.title}
                message={modalConfig.message}
                confirmLabel={modalConfig.confirmLabel}
                cancelLabel={modalConfig.cancelLabel}
                onConfirm={modalConfig.onConfirm}
                onCancel={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
                isDanger={modalConfig.isDanger}
                placeholder={modalConfig.placeholder}
            />
        </div >
    );
}

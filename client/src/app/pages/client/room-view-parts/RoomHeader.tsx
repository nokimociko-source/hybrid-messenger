import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon, Icons } from 'folds';
import * as css from '../CatloverRoomView.css';
import { useUserPresence } from '../../../hooks/useUserPresence';

// Reusing HOME_PATH string literal or we can import from paths
const HOME_PATH = '/'; // Will import properly if needed

interface Room {
    id: string;
    name?: string;
    type?: 'direct' | 'group' | 'channel';
    is_direct?: boolean;
    target_user_id?: string;
    avatar_url?: string;
    member_count?: number;
    other_user?: {
        username: string;
        avatar_url?: string;
    };
}

interface RoomHeaderProps {
    room: Room | null;
    displayName: string;
    avatarUrl: string | null | undefined;
    initial: React.ReactNode;
    isSavedMessages: boolean;
    isDirect_room: boolean;
    typingUsers: any[];
    isMobile: boolean;
    showProfile: boolean;
    setShowProfile: (show: boolean) => void;
    setShowSearch: (show: boolean) => void;
    startCall: (type: 'audio' | 'video') => void;
}

export function RoomHeader({
    room,
    displayName,
    avatarUrl,
    initial,
    isSavedMessages,
    isDirect_room,
    typingUsers,
    isMobile,
    showProfile,
    setShowProfile,
    setShowSearch,
    startCall
}: RoomHeaderProps) {
    const navigate = useNavigate();
    const { isOnline } = useUserPresence();

    return (
        <div className={`${css.ChatHeader} glass-header`}>
            {/* Back button for mobile */}
            <button
                className={css.BackButton}
                onClick={() => navigate(HOME_PATH)}
                title="Назад"
            >
                <Icon size="100" src={Icons.ArrowLeft} />
            </button>

            {/* Channel Header for channels */}
            {room?.type === 'channel' ? (
                <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', minWidth: 0, gap: '12px' }}>
                    <div className={css.HeaderAvatar} style={{
                        backgroundImage: avatarUrl ? `url(${avatarUrl})` : 'none',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundColor: '#1a1a1a',
                        color: '#00f2ff',
                        flexShrink: 0,
                        border: '2px solid rgba(0, 242, 255, 0.3)',
                        overflow: 'hidden'
                    }}>
                        {!avatarUrl && <Icon size="200" src={Icons.VolumeHigh} />}
                    </div>
                    <div className={css.HeaderInfo} style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <div className={`${css.HeaderTitle} neon-text`} style={{
                            fontSize: '18px',
                            lineHeight: '1.2',
                            fontWeight: '900',
                            color: '#00f2ff',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                        }}>{displayName}</div>
                        <div className={css.HeaderStatus} style={{
                            marginTop: '2px',
                            fontSize: '12px',
                            color: '#00f2ff',
                            opacity: 0.8
                        }}>
                            {room.member_count || 0} подписчиков
                        </div>
                    </div>
                </div>
            ) : (
                <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', minWidth: 0, gap: '12px' }}>
                    <div className={css.HeaderAvatar} style={{
                        backgroundImage: avatarUrl ? `url(${avatarUrl})` : 'none',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundColor: avatarUrl ? 'transparent' : (isSavedMessages ? '#00f2ff' : '#1a1a1a'),
                        color: isSavedMessages ? '#000' : '#00f2ff',
                        fontSize: isSavedMessages ? '20px' : undefined,
                        flexShrink: 0,
                        border: isSavedMessages ? 'none' : '2px solid rgba(0, 242, 255, 0.3)',
                        overflow: 'hidden'
                    }}>
                        {!avatarUrl && initial}
                    </div>
                    <div className={css.HeaderInfo} style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <div className={`${css.HeaderTitle} neon-text`} style={{
                            fontSize: '18px',
                            lineHeight: '1.2',
                            fontWeight: '900',
                            color: '#00f2ff',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                        }}>{displayName}</div>
                        <div className={css.HeaderStatus} style={{
                            marginTop: '2px',
                            fontSize: '12px',
                            color: '#00f2ff',
                            opacity: 0.8
                        }}>
                            {typingUsers.length > 0 ? (
                                <span style={{ color: '#00f2ff' }}>печатает...</span>
                            ) : (
                                isSavedMessages ? 'Ваше личное облако' : (isDirect_room ? (room?.target_user_id && isOnline(room.target_user_id) ? 'в сети' : 'не в сети') : 'сообщество')
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className={css.ChatHeaderActions}>
                {!isSavedMessages && room?.type !== 'channel' && (
                    <>
                        <button className={css.HeaderActionButton} onClick={() => setShowSearch(true)} title="Поиск">
                            <Icon size={isMobile ? "100" : "200"} src={Icons.Search} />
                        </button>
                        <button className={css.HeaderActionButton} onClick={() => startCall('audio')} title="Аудиовызов">
                            <Icon size={isMobile ? "100" : "200"} src={Icons.Phone} />
                        </button>
                        <button className={css.HeaderActionButton} onClick={() => startCall('video')} title="Видеовызов">
                            <Icon size={isMobile ? "100" : "200"} src={Icons.VideoCamera} />
                        </button>
                    </>
                )}
                {room?.type === 'channel' && (
                    <>
                        <button className={css.HeaderActionButton} onClick={() => startCall('audio')} title="Начать стрим (аудио)">
                            <Icon size={isMobile ? "100" : "200"} src={Icons.Phone} />
                        </button>
                        <button className={css.HeaderActionButton} onClick={() => startCall('video')} title="Начать стрим (видео)">
                            <Icon size={isMobile ? "100" : "200"} src={Icons.VideoCamera} />
                        </button>
                        <button className={css.HeaderActionButton} onClick={() => setShowSearch(true)} title="Поиск">
                            <Icon size={isMobile ? "100" : "200"} src={Icons.Search} />
                        </button>
                    </>
                )}
                <button
                    className={`${css.HeaderActionButton} ${showProfile ? css.HeaderActionButtonActive : ''}`}
                    title="Профиль"
                    onClick={() => setShowProfile(!showProfile)}
                >
                    <Icon size={isMobile ? "100" : "200"} src={Icons.Info} />
                </button>
            </div>
        </div>
    );
}

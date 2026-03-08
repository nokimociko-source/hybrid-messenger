import React, { useState, useRef } from 'react';
import { Spinner, Icon, Icons } from 'folds';
import { supabase } from '../../supabaseClient';
import { Room } from '../hooks/useSupabaseChat';
import { CatloverModal } from './CatloverModal';
import { ImageCropper } from './ImageCropper';
import { CatloverAvatar } from './CatloverAvatar';
import { InviteLinkManager } from './InviteLinkManager';
import { AuditLogViewer } from './AuditLogViewer';
import { PollCreator } from './PollCreator';
import { TopicManager } from './TopicManager';
import { AdminManager } from './AdminManager';
import { BannedUsers } from './BannedUsers';
import { usePolls } from '../hooks/usePolls';
import { logger } from '../utils/logger';

interface GroupSettingsModalProps {
    room: Room;
    onClose: () => void;
    onUpdate: () => void;
}

export function GroupSettingsModal({ room, onClose, onUpdate }: GroupSettingsModalProps) {
    const [name, setName] = useState(room.name || '');
    const [topic, setTopic] = useState(room.topic || '');
    const [slowmodeInterval, setSlowmodeInterval] = useState<number>((room as any).slowmode_interval || 0);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(room.avatar_url || null);
    const [isPublic, setIsPublic] = useState(room.is_public || false);
    const [permissions, setPermissions] = useState<any>((room as any).permissions || {
        can_send_messages: true,
        can_send_media: true,
        can_send_polls: true,
        can_send_links: true,
        can_add_members: true
    });
    const [saving, setSaving] = useState(false);
    const [showCropper, setShowCropper] = useState(false);
    const [tempImageUrl, setTempImageUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Sub-modals for management tools
    const [showInviteLinks, setShowInviteLinks] = useState(false);
    const [showAuditLog, setShowAuditLog] = useState(false);
    const [showPollCreator, setShowPollCreator] = useState(false);
    const [showTopicManager, setShowTopicManager] = useState(false);
    const [showAdminManager, setShowAdminManager] = useState(false);
    const [showBannedUsers, setShowBannedUsers] = useState(false);
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
    const [deleting, setDeleting] = useState(false);
    const [backgroundUrl, setBackgroundUrl] = useState(room.background_url || '');
    const [uploadingBg, setUploadingBg] = useState(false);
    const [isEncrypted, setIsEncrypted] = useState(room.is_encrypted || false);

    // Hook for polls
    const { createPoll } = usePolls(room.id);

    const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const isAnimated = file.type === 'image/gif' || file.type.startsWith('video/');
            if (isAnimated) {
                setAvatarFile(file);
                setAvatarPreview(URL.createObjectURL(file));
            } else {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setTempImageUrl(reader.result as string);
                    setShowCropper(true);
                };
                reader.readAsDataURL(file);
            }
        }
    };

    const handleCropComplete = (croppedBlob: Blob) => {
        logger.info('Cropped blob:', croppedBlob, 'size:', croppedBlob.size);

        // Создаем File из Blob
        const croppedFile = new File([croppedBlob], 'avatar.jpg', { type: 'image/jpeg' });
        setAvatarFile(croppedFile);

        // Создаем preview URL
        const previewUrl = URL.createObjectURL(croppedBlob);
        logger.info('Preview URL:', previewUrl);
        setAvatarPreview(previewUrl);

        setShowCropper(false);
        setTempImageUrl(null);
    };

    const handleRemoveAvatar = () => {
        setAvatarFile(null);
        setAvatarPreview(null);
    };

    const handleSave = async () => {
        if (!name.trim()) {
            setModalConfig({
                isOpen: true,
                type: 'alert',
                title: 'Внимание',
                message: 'Название группы не может быть пустым',
                isDanger: true
            });
            return;
        }

        setSaving(true);
        try {
            let avatarUrl: string | undefined = room.avatar_url || undefined;

            logger.info('Starting save. Current avatar_url:', room.avatar_url);
            logger.info('Avatar file to upload:', avatarFile);
            logger.info('Avatar preview:', avatarPreview);

            // Upload new avatar if selected
            if (avatarFile) {
                logger.info('Uploading new avatar...');
                const fileExt = avatarFile.name.split('.').pop();
                const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;
                const filePath = `avatars/${fileName}`;

                logger.info('Upload path:', filePath);

                const { error: uploadError } = await supabase.storage
                    .from('media')
                    .upload(filePath, avatarFile);

                if (uploadError) {
                    logger.error('Upload error:', uploadError);
                    throw uploadError;
                }

                const { data } = supabase.storage.from('media').getPublicUrl(filePath);
                avatarUrl = data.publicUrl;
                logger.info('Avatar uploaded successfully. Public URL:', avatarUrl);
            } else if (avatarPreview === null && room.avatar_url) {
                // Avatar was removed
                logger.info('Avatar removed');
                avatarUrl = undefined;
            }

            // Update room
            logger.info('Updating room with:', { name: name.trim(), topic: topic.trim() || null, avatar_url: avatarUrl });

            const updateData: any = {
                name: name.trim(),
                topic: topic.trim() || null,
                slowmode_interval: slowmodeInterval,
                is_public: isPublic,
                permissions: permissions,
                background_url: backgroundUrl,
                is_encrypted: isEncrypted,
            };

            if (avatarUrl !== undefined) {
                updateData.avatar_url = avatarUrl;
            }

            logger.info('Final update data:', updateData);

            const { data: updatedRoom, error } = await supabase
                .from('rooms')
                .update(updateData)
                .eq('id', room.id)
                .select()
                .single();

            if (error) {
                logger.error('Database update error:', error);
                throw error;
            }

            logger.info('Room updated successfully!');
            logger.info('Updated room data from DB:', updatedRoom);

            // Wait a bit for realtime to propagate the changes
            await new Promise(resolve => setTimeout(resolve, 500));

            onUpdate();
            onClose();
        } catch (err) {
            logger.error('Error updating group:', err);
            setModalConfig({
                isOpen: true,
                type: 'alert',
                title: 'Ошибка',
                message: 'Не удалось обновить настройки группы',
                isDanger: true
            });
        } finally {
            setSaving(false);
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

            setBackgroundUrl(data.publicUrl);
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

    const handleRemoveBackground = () => {
        setBackgroundUrl('');
    };

    const handleDelete = async () => {
        setModalConfig({
            isOpen: true,
            type: 'confirm',
            title: `Удалить ${room.type === 'channel' ? 'канал' : 'группу'}?`,
            message: `Вы уверены, что хотите удалить ${room.type === 'channel' ? 'канал' : 'группу'} "${name}"? Это действие необратимо.`,
            confirmLabel: 'Удалить',
            cancelLabel: 'Отмена',
            isDanger: true,
            onConfirm: async () => {
                setDeleting(true);
                try {
                    const { error } = await supabase
                        .from('rooms')
                        .delete()
                        .eq('id', room.id);

                    if (error) {
                        logger.error('Error deleting room:', error);
                        throw error;
                    }

                    setModalConfig({
                        isOpen: true,
                        type: 'alert',
                        title: 'Успех',
                        message: `${room.type === 'channel' ? 'Канал' : 'Группа'} успешно удалена`
                    });

                    // Delay to let user see the alert before closing
                    setTimeout(() => {
                        onUpdate();
                        onClose();
                    }, 1500);
                } catch (err) {
                    logger.error('Error deleting room:', err);
                    setModalConfig({
                        isOpen: true,
                        type: 'alert',
                        title: 'Ошибка',
                        message: `Не удалось удалить ${room.type === 'channel' ? 'канал' : 'группу'}`,
                        isDanger: true
                    });
                } finally {
                    setDeleting(false);
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
                background: 'rgba(0, 0, 0, 0.8)',
                backdropFilter: 'blur(10px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
            }}
        >
            <div
                style={{
                    background: 'linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%)',
                    border: '1px solid rgba(0, 242, 255, 0.3)',
                    borderRadius: '16px',
                    padding: '24px',
                    minWidth: '500px',
                    maxWidth: '90%',
                    maxHeight: '90vh',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '20px',
                    overflow: 'hidden',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexShrink: 0,
                    }}
                >
                    <h3
                        style={{
                            fontSize: '20px',
                            fontWeight: '600',
                            color: '#fff',
                            margin: 0,
                        }}
                    >
                        Настройки {room.type === 'channel' ? 'канала' : 'группы'}
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

                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', paddingRight: '8px' }} className="custom-scrollbar">
                    {/* Avatar */}
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '12px',
                        }}
                    >
                        <CatloverAvatar
                            url={avatarPreview}
                            displayName={name}
                            size={100}
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                                border: '3px solid rgba(0, 242, 255, 0.2)',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                            }}
                        />
                        <input
                            type="file"
                            id="group-avatar-input"
                            name="group-avatar"
                            accept="image/*"
                            ref={fileInputRef}
                            style={{ display: 'none' }}
                            onChange={handleAvatarSelect}
                            aria-label="Изменить фото группы"
                        />
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                style={{
                                    padding: '6px 12px',
                                    background: 'rgba(0, 242, 255, 0.1)',
                                    border: '1px solid rgba(0, 242, 255, 0.3)',
                                    borderRadius: '8px',
                                    color: '#00f2ff',
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                }}
                            >
                                Изменить
                            </button>
                            {avatarPreview && (
                                <button
                                    onClick={handleRemoveAvatar}
                                    style={{
                                        padding: '6px 12px',
                                        background: 'rgba(255, 77, 77, 0.1)',
                                        border: '1px solid rgba(255, 77, 77, 0.3)',
                                        borderRadius: '8px',
                                        color: '#ff4d4d',
                                        fontSize: '13px',
                                        cursor: 'pointer',
                                    }}
                                >
                                    Удалить
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Name */}
                    <div>
                        <label
                            htmlFor="group-name-input"
                            style={{
                                display: 'block',
                                fontSize: '13px',
                                color: 'rgba(255, 255, 255, 0.7)',
                                marginBottom: '8px',
                            }}
                        >
                            Название {room.type === 'channel' ? 'канала' : 'группы'}
                        </label>
                        <input
                            id="group-name-input"
                            name="group-name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={room.type === 'channel' ? 'Введите название канала' : 'Введите название группы'}
                            maxLength={100}
                            style={{
                                width: '100%',
                                padding: '12px',
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(0, 242, 255, 0.3)',
                                borderRadius: '8px',
                                color: '#fff',
                                fontSize: '14px',
                                outline: 'none',
                            }}
                        />
                    </div>

                    {/* Topic */}
                    <div>
                        <label
                            htmlFor="group-topic-input"
                            style={{
                                display: 'block',
                                fontSize: '13px',
                                color: 'rgba(255, 255, 255, 0.7)',
                                marginBottom: '8px',
                            }}
                        >
                            Описание
                        </label>
                        <textarea
                            id="group-topic-input"
                            name="group-topic"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder={room.type === 'channel' ? 'Добавьте описание канала' : 'Добавьте описание группы'}
                            maxLength={500}
                            rows={3}
                            style={{
                                width: '100%',
                                padding: '12px',
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(0, 242, 255, 0.3)',
                                borderRadius: '8px',
                                color: '#fff',
                                fontSize: '14px',
                                outline: 'none',
                                resize: 'vertical',
                                fontFamily: 'inherit',
                            }}
                        />
                    </div>

                    {/* Slowmode */}
                    <div>
                        <label
                            htmlFor="group-slowmode-select"
                            style={{
                                display: 'block',
                                fontSize: '13px',
                                color: 'rgba(255, 255, 255, 0.7)',
                                marginBottom: '8px',
                            }}
                        >
                            Медленный режим (Slowmode)
                        </label>
                        <div style={{ fontSize: '12px', color: '#888', marginBottom: '12px' }}>
                            Ограничивает частоту отправки сообщений. Админы не подчиняются slowmode.
                        </div>
                        <select
                            id="group-slowmode-select"
                            name="group-slowmode"
                            value={slowmodeInterval}
                            onChange={(e) => setSlowmodeInterval(Number(e.target.value))}
                            style={{
                                width: '100%',
                                padding: '12px',
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(0, 242, 255, 0.3)',
                                borderRadius: '8px',
                                color: '#fff',
                                fontSize: '14px',
                                outline: 'none',
                                cursor: 'pointer',
                            }}
                        >
                            <option value={0} style={{ background: '#1a1a1a' }}>Отключен</option>
                            <option value={10} style={{ background: '#1a1a1a' }}>10 секунд</option>
                            <option value={30} style={{ background: '#1a1a1a' }}>30 секунд</option>
                            <option value={60} style={{ background: '#1a1a1a' }}>1 минута</option>
                            <option value={300} style={{ background: '#1a1a1a' }}>5 минут</option>
                            <option value={900} style={{ background: '#1a1a1a' }}>15 минут</option>
                            <option value={3600} style={{ background: '#1a1a1a' }}>1 час</option>
                        </select>
                    </div>

                    {/* Background Selection */}
                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>Фон чата</label>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            {backgroundUrl ? (
                                <div style={{ position: 'relative' }}>
                                    <img src={backgroundUrl} alt="Background" style={{ width: '120px', height: '60px', borderRadius: '8px', objectFit: 'cover', border: '1px solid rgba(0, 242, 255, 0.3)' }} />
                                    <button
                                        onClick={handleRemoveBackground}
                                        style={{ position: 'absolute', top: '-8px', right: '-8px', width: '24px', height: '24px', borderRadius: '50%', background: '#ff4d4d', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >
                                        ×
                                    </button>
                                </div>
                            ) : (
                                <div style={{ width: '120px', height: '60px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px dashed rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>
                                    Нет фона
                                </div>
                            )}
                            <label style={{
                                padding: '8px 16px',
                                background: 'rgba(0, 242, 255, 0.1)',
                                border: '1px solid rgba(0, 242, 255, 0.2)',
                                borderRadius: '8px',
                                color: '#00f2ff',
                                fontSize: '13px',
                                cursor: uploadingBg ? 'not-allowed' : 'pointer',
                                opacity: uploadingBg ? 0.6 : 1
                            }}>
                                {uploadingBg ? 'Загрузка...' : 'Выбрать фото'}
                                <input type="file" accept="image/*" onChange={handleBackgroundSelect} disabled={uploadingBg} style={{ display: 'none' }} />
                            </label>
                        </div>
                    </div>

                    {/* Privacy Toggle */}
                    <div>
                        <label
                            style={{
                                display: 'block',
                                fontSize: '13px',
                                color: 'rgba(255, 255, 255, 0.7)',
                                marginBottom: '8px',
                            }}
                        >
                            Тип {room.type === 'channel' ? 'канала' : 'группы'}
                        </label>
                        <div
                            onClick={() => setIsPublic(!isPublic)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '12px',
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(0, 242, 255, 0.3)',
                                borderRadius: '8px',
                                cursor: 'pointer'
                            }}
                        >
                            <span style={{ color: '#fff', fontSize: '14px' }}>
                                {isPublic ? 'Публичный' : 'Приватный'}
                            </span>
                            <div style={{
                                width: '40px',
                                height: '20px',
                                background: isPublic ? '#00f2ff' : '#333',
                                borderRadius: '10px',
                                position: 'relative',
                                transition: 'background 0.2s'
                            }}>
                                <div style={{
                                    width: '16px',
                                    height: '16px',
                                    background: '#fff',
                                    borderRadius: '50%',
                                    position: 'absolute',
                                    top: '2px',
                                    left: isPublic ? '22px' : '2px',
                                    transition: 'left 0.2s'
                                }} />
                            </div>
                        </div>
                        <div style={{ fontSize: '12px', color: '#888', marginTop: '8px' }}>
                            {isPublic
                                ? 'Все пользователи могут найти и прочитать сообщения.'
                                : 'Только приглашенные пользователи могут вступить.'}
                        </div>
                    </div>

                    {/* E2EE Toggle */}
                    <div>
                        <label
                            style={{
                                display: 'block',
                                fontSize: '13px',
                                color: 'rgba(255, 255, 255, 0.7)',
                                marginBottom: '8px',
                            }}
                        >
                            Безопасность
                        </label>
                        <div
                            onClick={() => setIsEncrypted(!isEncrypted)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '12px',
                                background: 'rgba(0, 242, 255, 0.05)',
                                border: '1px solid rgba(0, 242, 255, 0.3)',
                                borderRadius: '8px',
                                cursor: 'pointer'
                            }}
                        >
                            <span style={{ color: '#fff', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Icon size="200" src={Icons.Lock} style={{ color: isEncrypted ? '#00f2ff' : 'rgba(255,255,255,0.4)' }} />
                                Сквозное шифрование (E2EE)
                            </span>
                            <div style={{
                                width: '40px',
                                height: '20px',
                                background: isEncrypted ? '#00f2ff' : '#333',
                                borderRadius: '10px',
                                position: 'relative',
                                transition: 'background 0.2s'
                            }}>
                                <div style={{
                                    width: '16px',
                                    height: '16px',
                                    background: '#fff',
                                    borderRadius: '50%',
                                    position: 'absolute',
                                    top: '2px',
                                    left: isEncrypted ? '22px' : '2px',
                                    transition: 'left 0.2s'
                                }} />
                            </div>
                        </div>
                        <div style={{ fontSize: '12px', color: '#888', marginTop: '8px' }}>
                            Шифрование сообщений на стороне клиента (Secure Chat).
                        </div>
                    </div>

                    {/* Permissions - Telegram Style */}
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '12px' }}>
                            Разрешения участников
                        </label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(255, 255, 255, 0.02)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                            {[
                                { id: 'can_send_messages', label: 'Отправка сообщений' },
                                { id: 'can_send_media', label: 'Отправка медиа' },
                                { id: 'can_send_links', label: 'Предпросмотр ссылок' },
                                { id: 'can_send_polls', label: 'Опросы' },
                                { id: 'can_add_members', label: 'Добавление участников' },
                            ].map((perm) => (
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

                    {/* Management Tools */}
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '12px' }}>
                            Инструменты управления
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <button
                                onClick={() => setShowInviteLinks(true)}
                                style={{
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
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(0, 242, 255, 0.1)';
                                    e.currentTarget.style.borderColor = 'rgba(0, 242, 255, 0.3)';
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                }}
                            >
                                <Icon size="200" src={Icons.Link} style={{ color: '#00f2ff' }} />
                                <span>Ссылки</span>
                            </button>
                            <button
                                onClick={() => setShowTopicManager(true)}
                                style={{
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
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(0, 242, 255, 0.1)';
                                    e.currentTarget.style.borderColor = 'rgba(0, 242, 255, 0.3)';
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                }}
                            >
                                <Icon size="200" src={Icons.Hash} style={{ color: '#00f2ff' }} />
                                <span>Топики</span>
                            </button>
                            <button
                                onClick={() => setShowPollCreator(true)}
                                style={{
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
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(0, 242, 255, 0.1)';
                                    e.currentTarget.style.borderColor = 'rgba(0, 242, 255, 0.3)';
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                }}
                            >
                                <Icon size="200" src={Icons.Message} style={{ color: '#00f2ff' }} />
                                <span>Опросы</span>
                            </button>
                            <button
                                onClick={() => setShowAuditLog(true)}
                                style={{
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
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(0, 242, 255, 0.1)';
                                    e.currentTarget.style.borderColor = 'rgba(0, 242, 255, 0.3)';
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                }}
                            >
                                <Icon size="200" src={Icons.File} style={{ color: '#00f2ff' }} />
                                <span>Логи</span>
                            </button>
                            <button
                                onClick={() => setShowAdminManager(true)}
                                style={{
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
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(0, 242, 255, 0.1)';
                                    e.currentTarget.style.borderColor = 'rgba(0, 242, 255, 0.3)';
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                }}
                            >
                                <Icon size="200" src={Icons.Lock} style={{ color: '#00f2ff' }} />
                                <span>Админы</span>
                            </button>
                            <button
                                onClick={() => setShowBannedUsers(true)}
                                style={{
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
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(255, 77, 77, 0.1)';
                                    e.currentTarget.style.borderColor = 'rgba(255, 77, 77, 0.3)';
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                }}
                            >
                                <Icon size="200" src={Icons.Cross} style={{ color: '#ff4d4d' }} />
                                <span>Бан-лист</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div
                    style={{
                        display: 'flex',
                        gap: '12px',
                        justifyContent: 'space-between',
                        paddingTop: '16px',
                        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                        flexShrink: 0,
                    }}
                >
                    <button
                        onClick={handleDelete}
                        disabled={deleting || saving}
                        style={{
                            padding: '10px 20px',
                            background: 'rgba(255, 77, 77, 0.1)',
                            border: '1px solid rgba(255, 77, 77, 0.3)',
                            borderRadius: '8px',
                            color: '#ff4d4d',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: deleting || saving ? 'not-allowed' : 'pointer',
                            opacity: deleting || saving ? 0.5 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                        }}
                    >
                        {deleting && <Spinner size="200" variant="Secondary" />}
                        Удалить {room.type === 'channel' ? 'канал' : 'группу'}
                    </button>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            onClick={onClose}
                            disabled={saving || deleting}
                            style={{
                                padding: '10px 20px',
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                borderRadius: '8px',
                                color: '#fff',
                                fontSize: '14px',
                                cursor: saving || deleting ? 'not-allowed' : 'pointer',
                                opacity: saving || deleting ? 0.5 : 1,
                            }}
                        >
                            Отмена
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving || deleting || !name.trim()}
                            style={{
                                padding: '10px 20px',
                                background:
                                    saving || deleting || !name.trim()
                                        ? 'rgba(255, 255, 255, 0.05)'
                                        : 'rgba(0, 242, 255, 0.2)',
                                border: `1px solid ${saving || deleting || !name.trim()
                                    ? 'rgba(255, 255, 255, 0.2)'
                                    : 'rgba(0, 242, 255, 0.5)'
                                    }`,
                                borderRadius: '8px',
                                color: saving || deleting || !name.trim() ? 'rgba(255, 255, 255, 0.5)' : '#00f2ff',
                                fontSize: '14px',
                                fontWeight: '500',
                                cursor: saving || deleting || !name.trim() ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                            }}
                        >
                            {saving && <Spinner size="200" variant="Secondary" />}
                            Сохранить
                        </button>
                    </div>
                </div>
            </div>

            {/* Image Cropper */}
            {showCropper && tempImageUrl && (
                <ImageCropper
                    imageUrl={tempImageUrl}
                    onCrop={handleCropComplete}
                    onCancel={() => {
                        setShowCropper(false);
                        setTempImageUrl(null);
                    }}
                />
            )}

            {/* Management Sub-Modals */}
            {showInviteLinks && (
                <InviteLinkManager
                    roomId={room.id}
                    onClose={() => setShowInviteLinks(false)}
                />
            )}

            {showAuditLog && (
                <AuditLogViewer
                    roomId={room.id}
                    onClose={() => setShowAuditLog(false)}
                />
            )}

            {showPollCreator && (
                <PollCreator
                    onClose={() => setShowPollCreator(false)}
                    onCreate={async (data) => {
                        await createPoll(data);
                    }}
                />
            )}

            {showTopicManager && (
                <TopicManager
                    roomId={room.id}
                    onClose={() => setShowTopicManager(false)}
                    onSelectTopic={(topicId) => {
                        logger.debug('Selected topic:', topicId);
                    }}
                />
            )}

            {showAdminManager && (
                <AdminManager
                    roomId={room.id}
                    roomType={room.type}
                    onClose={() => setShowAdminManager(false)}
                />
            )}

            {showBannedUsers && (
                <BannedUsers
                    roomId={room.id}
                    onClose={() => setShowBannedUsers(false)}
                />
            )}

            <CatloverModal
                isOpen={modalConfig.isOpen}
                type={modalConfig.type}
                title={modalConfig.title}
                message={modalConfig.message}
                confirmLabel={modalConfig.confirmLabel}
                cancelLabel={modalConfig.cancelLabel}
                onConfirm={modalConfig.onConfirm}
                onCancel={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
                onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
                isDanger={modalConfig.isDanger}
                placeholder={modalConfig.placeholder}
            />
        </div>
    );
}

import React, { useState, useRef } from 'react';
import { Spinner, Icon, Icons } from 'folds';
import { supabase } from '../../supabaseClient';
import { Room } from '../hooks/useSupabaseChat';
import { ImageCropper } from './ImageCropper';
import { InviteLinkManager } from './InviteLinkManager';
import { AuditLogViewer } from './AuditLogViewer';
import { AdminManager } from './AdminManager';
import { BannedUsers } from './BannedUsers';
import { SubscriberManager } from './SubscriberManager';
import { logger } from '../utils/logger';
import { CatloverModal } from './CatloverModal';
import { CatloverAvatar } from './CatloverAvatar';

const toolButtonStyle: React.CSSProperties = {
    padding: '16px',
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '18px',
    color: '#fff',
    fontSize: '13px',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    backdropFilter: 'blur(10px)'
};

interface ChannelSettingsModalProps {
    room: Room;
    onClose: () => void;
    onUpdate: () => void;
}

export function ChannelSettingsModal({ room, onClose, onUpdate }: ChannelSettingsModalProps) {
    const [name, setName] = useState(room.name || '');
    const [topic, setTopic] = useState(room.topic || '');
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(room.avatar_url || null);
    const [isPublic, setIsPublic] = useState(room.is_public || false);
    const [saving, setSaving] = useState(false);
    const [showCropper, setShowCropper] = useState(false);
    const [tempImageUrl, setTempImageUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Sub-modals
    const [showInviteLinks, setShowInviteLinks] = useState(false);
    const [showAuditLog, setShowAuditLog] = useState(false);
    const [showAdminManager, setShowAdminManager] = useState(false);
    const [showBannedUsers, setShowBannedUsers] = useState(false);
    const [showSubscribers, setShowSubscribers] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [backgroundUrl, setBackgroundUrl] = useState(room.background_url || '');
    const [allowComments, setAllowComments] = useState(room.allow_comments || false);
    const [uploadingBg, setUploadingBg] = useState(false);
    const [isEncrypted, setIsEncrypted] = useState(room.is_encrypted || false);

    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean;
        type: 'alert' | 'confirm' | 'prompt';
        title: string;
        message: string;
        confirmLabel?: string;
        cancelLabel?: string;
        onConfirm?: (value?: string) => void;
        isDanger?: boolean;
    }>({
        isOpen: false,
        type: 'alert',
        title: '',
        message: ''
    });

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
        const croppedFile = new File([croppedBlob], 'avatar.jpg', { type: 'image/jpeg' });
        setAvatarFile(croppedFile);
        const previewUrl = URL.createObjectURL(croppedBlob);
        setAvatarPreview(previewUrl);
        setShowCropper(false);
        setTempImageUrl(null);
    };

    const handleSave = async () => {
        if (!name.trim()) {
            setModalConfig({
                isOpen: true,
                type: 'alert',
                title: 'Ошибка',
                message: 'Название канала не может быть пустым',
                isDanger: true
            });
            return;
        }

        setSaving(true);
        try {
            let avatarUrl = room.avatar_url;

            if (avatarFile) {
                const fileExt = avatarFile.name.split('.').pop() || (avatarFile.type.startsWith('image/') ? 'jpg' : 'webm');
                const fileName = `channel-avatars/${room.id}-${Date.now()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage
                    .from('media')
                    .upload(fileName, avatarFile);

                if (uploadError) throw uploadError;

                const { data } = supabase.storage.from('media').getPublicUrl(fileName);
                avatarUrl = data.publicUrl;
            }

            const { error: updateError } = await supabase
                .from('rooms')
                .update({
                    name: name.trim(),
                    topic: topic.trim(),
                    avatar_url: avatarUrl,
                    is_public: isPublic,
                    background_url: backgroundUrl,
                    allow_comments: allowComments,
                    is_encrypted: isEncrypted
                })
                .eq('id', room.id);

            if (updateError) throw updateError;

            onUpdate();
            onClose();
        } catch (error) {
            logger.error('Error saving channel settings:', error);
            setModalConfig({
                isOpen: true,
                type: 'alert',
                title: 'Ошибка',
                message: 'Не удалось сохранить настройки',
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
            title: 'Удалить канал',
            message: `Вы уверены, что хотите удалить канал "${name}"? Это действие необратимо.`,
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

                    if (error) throw error;

                    setModalConfig({
                        isOpen: true,
                        type: 'alert',
                        title: 'Успех',
                        message: 'Канал успешно удален',
                        onConfirm: () => {
                            onUpdate();
                            onClose();
                        }
                    });
                } catch (error) {
                    logger.error('Error deleting channel:', error);
                    setModalConfig({
                        isOpen: true,
                        type: 'alert',
                        title: 'Ошибка',
                        message: 'Не удалось удалить канал',
                        isDanger: true
                    });
                } finally {
                    setDeleting(false);
                }
            }
        });
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(20px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            animation: 'fadeIn 0.2s ease-out'
        }} onClick={onClose}>
            <div style={{
                background: 'linear-gradient(135deg, rgba(15, 15, 15, 0.9) 0%, rgba(30, 30, 30, 0.9) 100%)',
                border: '1px solid rgba(0, 242, 255, 0.1)',
                borderRadius: '28px',
                width: '550px',
                maxWidth: '90%',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                overflow: 'hidden',
                animation: 'modalSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }} onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div style={{
                    padding: '24px 32px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'rgba(255, 255, 255, 0.02)'
                }}>
                    <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '600', color: '#fff', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Icon size="300" src={Icons.Setting} style={{ color: '#00f2ff' }} />
                        Настройки канала
                    </h2>
                    <button onClick={onClose} style={{ color: 'rgba(255,255,255,0.4)', fontSize: '24px', cursor: 'pointer', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'}>×</button>
                </div>

                {/* Content */}
                <div className="custom-scrollbar" style={{ padding: '32px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '28px' }}>

                    {/* Avatar Section */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                        <CatloverAvatar
                            url={avatarPreview}
                            displayName={name}
                            size={100}
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                                borderRadius: '32px',
                                border: '2px solid rgba(0, 242, 255, 0.2)',
                                cursor: 'pointer',
                                transition: 'all 0.3s'
                            }}
                        >
                            {!avatarPreview && <Icon size="300" src={Icons.File} style={{ color: 'rgba(255,255,255,0.2)' }} />}
                            <div style={{
                                position: 'absolute',
                                bottom: '-8px',
                                right: '-8px',
                                width: '32px',
                                height: '32px',
                                borderRadius: '12px',
                                background: '#00f2ff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#000',
                                boxShadow: '0 4px 12px rgba(0, 242, 255, 0.3)',
                                zIndex: 1
                            }}>
                                <Icon size="200" src={Icons.Home} />
                            </div>
                        </CatloverAvatar>
                        <input
                            type="file"
                            id="channel-avatar-input"
                            name="channel-avatar"
                            ref={fileInputRef}
                            onChange={handleAvatarSelect}
                            accept="image/*,video/*"
                            style={{ display: 'none' }}
                            aria-label="Загрузить фото канала"
                        />
                        <div style={{ flex: 1 }}>
                            <label htmlFor="channel-name-input" style={{ display: 'none' }}>Название канала</label>
                            <input
                                id="channel-name-input"
                                name="channel-name"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="Название канала"
                                style={{
                                    width: '100%',
                                    background: 'transparent',
                                    border: 'none',
                                    borderBottom: '2px solid rgba(255,255,255,0.1)',
                                    color: '#fff',
                                    fontSize: '18px',
                                    fontWeight: '500',
                                    padding: '8px 0',
                                    outline: 'none',
                                    marginBottom: '8px'
                                }}
                            />
                            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>Установите название и фото канала</div>
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label htmlFor="channel-topic-input" style={{ display: 'block', fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '8px' }}>Описание канала</label>
                        <textarea
                            id="channel-topic-input"
                            name="channel-topic"
                            value={topic}
                            onChange={e => setTopic(e.target.value)}
                            placeholder="О чем этот канал?"
                            style={{
                                width: '100%',
                                background: 'rgba(255, 255, 255, 0.03)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '14px',
                                color: '#fff',
                                fontSize: '14px',
                                padding: '14px',
                                minHeight: '80px',
                                resize: 'none',
                                outline: 'none'
                            }}
                        />
                    </div>

                    {/* Background Selection */}
                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>Фон чата</label>
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

                    {/* Allow Comments Toggle */}
                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                            <div
                                onClick={() => setAllowComments(!allowComments)}
                                style={{
                                    width: '44px',
                                    height: '24px',
                                    borderRadius: '12px',
                                    background: allowComments ? '#00f2ff' : 'rgba(255,255,255,0.1)',
                                    position: 'relative',
                                    transition: 'all 0.2s',
                                    border: '1px solid rgba(255,255,255,0.1)'
                                }}
                            >
                                <div style={{
                                    position: 'absolute',
                                    top: '2px',
                                    left: allowComments ? '22px' : '2px',
                                    width: '18px',
                                    height: '18px',
                                    borderRadius: '50%',
                                    background: allowComments ? '#000' : '#fff',
                                    transition: 'all 0.2s'
                                }} />
                            </div>
                            <span style={{ fontSize: '15px', color: '#fff' }}>Разрешить комментарии</span>
                        </label>
                        <p style={{ margin: '8px 0 0 56px', fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                            Участники смогут обсуждать посты под сообщениями
                        </p>
                    </div>

                    {/* Specific Channel Toggles */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div
                            onClick={() => setIsPublic(!isPublic)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '16px',
                                background: 'rgba(255, 255, 255, 0.02)',
                                borderRadius: '16px',
                                cursor: 'pointer',
                                border: '1px solid rgba(255,255,255,0.05)'
                            }}
                        >
                            <div>
                                <div style={{ color: '#fff', fontSize: '14px', fontWeight: '500' }}>{isPublic ? 'Публичный' : 'Приватный'} канал</div>
                                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>{isPublic ? 'Все могут найти канал в поиске' : 'Вход только по ссылке'}</div>
                            </div>
                            <Icon size="200" src={isPublic ? Icons.Home : Icons.Lock} style={{ color: isPublic ? '#00f2ff' : 'rgba(255,255,255,0.4)' }} />
                        </div>

                        {/* E2EE Toggle */}
                        <div
                            onClick={() => setIsEncrypted(!isEncrypted)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '16px',
                                background: 'rgba(0, 242, 255, 0.03)',
                                borderRadius: '16px',
                                cursor: 'pointer',
                                border: '1px solid rgba(0, 242, 255, 0.1)',
                                transition: 'all 0.2s'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <Icon size="200" src={Icons.Lock} style={{ color: isEncrypted ? '#00f2ff' : 'rgba(255,255,255,0.3)' }} />
                                <div>
                                    <div style={{ color: '#fff', fontSize: '14px', fontWeight: '500' }}>Сквозное шифрование (E2EE)</div>
                                    <div style={{ color: 'rgba(0, 242, 255, 0.5)', fontSize: '12px' }}>Шифрование сообщений на стороне клиента</div>
                                </div>
                            </div>
                            <div style={{
                                width: '36px',
                                height: '18px',
                                background: isEncrypted ? '#00f2ff' : 'rgba(255,255,255,0.1)',
                                borderRadius: '9px',
                                position: 'relative',
                                transition: 'all 0.2s'
                            }}>
                                <div style={{
                                    width: '14px',
                                    height: '14px',
                                    background: isEncrypted ? '#000' : '#fff',
                                    borderRadius: '50%',
                                    position: 'absolute',
                                    top: '2px',
                                    left: isEncrypted ? '20px' : '2px',
                                    transition: 'all 0.2s'
                                }} />
                            </div>
                        </div>
                    </div>

                    {/* Management Tools Area */}
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '12px' }}>Управление</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <button onClick={() => setShowSubscribers(true)} style={toolButtonStyle}><Icon size="200" src={Icons.User} style={{ color: '#00f2ff' }} /> Подписчики</button>
                            <button onClick={() => setShowAdminManager(true)} style={toolButtonStyle}><Icon size="200" src={Icons.Lock} style={{ color: '#00f2ff' }} /> Админы</button>
                            <button onClick={() => setShowInviteLinks(true)} style={toolButtonStyle}><Icon size="200" src={Icons.Link} style={{ color: '#00f2ff' }} /> Ссылки</button>
                            <button onClick={() => setShowBannedUsers(true)} style={toolButtonStyle}><Icon size="200" src={Icons.Cross} style={{ color: '#ff4d4d' }} /> Бан-лист</button>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div style={{ padding: '24px 32px', display: 'flex', justifyContent: 'space-between', gap: '12px', background: 'rgba(255, 255, 255, 0.02)' }}>
                    <button
                        onClick={handleDelete}
                        disabled={deleting || saving}
                        style={{
                            padding: '10px 24px',
                            background: 'rgba(255, 77, 77, 0.1)',
                            border: '1px solid rgba(255, 77, 77, 0.3)',
                            borderRadius: '8px',
                            color: '#ff4d4d',
                            fontWeight: '500',
                            cursor: deleting || saving ? 'not-allowed' : 'pointer',
                            opacity: deleting || saving ? 0.5 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        {deleting && <Spinner size="200" />}
                        Удалить канал
                    </button>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            onClick={onClose}
                            disabled={saving || deleting}
                            style={{
                                padding: '10px 24px',
                                background: 'transparent',
                                color: 'rgba(255,255,255,0.5)',
                                cursor: saving || deleting ? 'not-allowed' : 'pointer',
                                opacity: saving || deleting ? 0.5 : 1
                            }}
                        >
                            Отмена
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving || deleting}
                            style={{
                                padding: '10px 32px',
                                background: 'rgba(0, 242, 255, 0.15)',
                                border: '1px solid rgba(0, 242, 255, 0.3)',
                                borderRadius: '12px',
                                color: '#00f2ff',
                                fontWeight: '600',
                                cursor: saving || deleting ? 'not-allowed' : 'pointer',
                                opacity: saving || deleting ? 0.5 : 1,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            {saving && <Spinner size="200" />}
                            Сохранить
                        </button>
                    </div>
                </div>
            </div>

            {/* Sub Modals */}
            {showSubscribers && <SubscriberManager roomId={room.id} onClose={() => setShowSubscribers(false)} />}
            {showAdminManager && <AdminManager roomId={room.id} roomType="channel" onClose={() => setShowAdminManager(false)} />}
            {showInviteLinks && <InviteLinkManager roomId={room.id} onClose={() => setShowInviteLinks(false)} />}
            {showBannedUsers && <BannedUsers roomId={room.id} onClose={() => setShowBannedUsers(false)} />}

            {showCropper && tempImageUrl && (
                <ImageCropper imageUrl={tempImageUrl} onCrop={handleCropComplete} onCancel={() => setShowCropper(false)} />
            )}

            <CatloverModal
                isOpen={modalConfig.isOpen}
                type={modalConfig.type}
                title={modalConfig.title}
                message={modalConfig.message}
                confirmLabel={modalConfig.confirmLabel}
                cancelLabel={modalConfig.cancelLabel}
                onConfirm={(val) => {
                    modalConfig.onConfirm?.(val);
                    setModalConfig(prev => ({ ...prev, isOpen: false }));
                }}
                onCancel={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
                onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
                isDanger={modalConfig.isDanger}
            />
        </div>
    );
}

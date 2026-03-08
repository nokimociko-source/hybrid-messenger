import { logger } from '../utils/logger';
import React, { useState, useEffect, useRef } from 'react';
import { Icon, Icons, Scroll, Spinner } from 'folds';
import { supabase } from '../../supabaseClient';
import { ImageCropper } from './ImageCropper';
import { SettingsModal, SettingsSection } from './SettingsModal';
import { useUserPresence } from '../hooks/useUserPresence';

interface ProfileSettingsPanelProps {
    onClose: () => void;
}

export function ProfileSettingsPanel({ onClose }: ProfileSettingsPanelProps) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [username, setUsername] = useState('');
    const [about, setAbout] = useState('');
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [showCropper, setShowCropper] = useState(false);
    const [tempImageUrl, setTempImageUrl] = useState<string | null>(null);
    const [isDarkTheme, setIsDarkTheme] = useState(true);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [settingsSection, setSettingsSection] = useState<SettingsSection>('main');
    const [userId, setUserId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { isOnline } = useUserPresence();

    useEffect(() => {
        loadProfile();

        // Load theme preference
        const theme = localStorage.getItem('theme_preference') || 'dark';
        setIsDarkTheme(theme === 'dark');
    }, []);

    const loadProfile = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setUserId(user.id);

            const { data, error } = await supabase
                .from('users')
                .select('username, about, avatar_url, status')
                .eq('id', user.id)
                .single();

            if (error) throw error;

            setUsername(data.username || '');
            setAbout(data.about || '');
            setAvatarUrl(data.avatar_url || null);
        } catch (err) {
            logger.error('Error loading profile:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setTempImageUrl(reader.result as string);
                setShowCropper(true);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCropComplete = (croppedBlob: Blob) => {
        const croppedFile = new File([croppedBlob], 'avatar.jpg', { type: 'image/jpeg' });
        setAvatarFile(croppedFile);
        const previewUrl = URL.createObjectURL(croppedBlob);
        setAvatarUrl(previewUrl);
        setShowCropper(false);
        setTempImageUrl(null);
    };

    const handleSave = async () => {
        if (!username.trim()) {
            alert('Имя пользователя не может быть пустым');
            return;
        }

        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            let newAvatarUrl = avatarUrl;

            // Upload new avatar if selected
            if (avatarFile) {
                const fileExt = avatarFile.name.split('.').pop();
                const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;
                const filePath = `avatars/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('media')
                    .upload(filePath, avatarFile);

                if (uploadError) throw uploadError;

                const { data } = supabase.storage.from('media').getPublicUrl(filePath);
                newAvatarUrl = data.publicUrl;
            }

            // Update profile
            const { error } = await supabase
                .from('users')
                .update({
                    username: username.trim(),
                    about: about.trim() || null,
                    avatar_url: newAvatarUrl,
                })
                .eq('id', user.id);

            if (error) throw error;

            alert('Профиль успешно обновлен');
        } catch (err) {
            logger.error('Error updating profile:', err);
            alert('Не удалось обновить профиль');
        } finally {
            setSaving(false);
        }
    };

    const handleThemeToggle = () => {
        const newTheme = !isDarkTheme;
        setIsDarkTheme(newTheme);
        localStorage.setItem('theme_preference', newTheme ? 'dark' : 'light');
        document.documentElement.setAttribute('data-theme', newTheme ? 'dark' : 'light');
    };

    const handleLogout = async () => {
        if (confirm('Выйти из аккаунта?')) {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    await supabase.from('user_presence').upsert({
                        user_id: user.id,
                        status: 'offline',
                        last_seen: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    }, { onConflict: 'user_id' });
                }
            } catch (e) {
                console.error('Error setting offline status on logout:', e);
            }
            await supabase.auth.signOut();
            window.location.reload();
        }
    };

    const openSettings = (section: SettingsSection) => {
        setSettingsSection(section);
        setShowSettingsModal(true);
    };

    if (loading) {
        return (
            <div style={{
                width: '360px',
                height: '100vh',
                background: '#0d0d0d',
                borderRight: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}>
                <Spinner variant="Secondary" />
            </div>
        );
    }

    return (
        <div style={{
            width: '360px',
            height: '100vh',
            background: '#0d0d0d',
            borderRight: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            flexDirection: 'column',
        }}>
            {/* Header */}
            <div style={{
                padding: '16px 20px',
                borderBottom: '1px solid rgba(0, 242, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
            }}>
                <div
                    onClick={onClose}
                    style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                    <Icon size="200" src={Icons.ChevronLeft} style={{ color: '#00f2ff' }} />
                </div>
                <h2 style={{
                    fontSize: '20px',
                    fontWeight: '600',
                    color: '#fff',
                    margin: 0,
                }}>
                    Анкета пользователя
                </h2>
            </div>

            {/* Content */}
            <Scroll style={{ flex: 1 }}>
                <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Avatar Section */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                                width: '120px',
                                height: '120px',
                                borderRadius: '50%',
                                backgroundImage: avatarUrl ? `url(${avatarUrl})` : 'none',
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
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                position: 'relative',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
                            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                        >
                            {!avatarUrl && (username[0]?.toUpperCase() || '?')}
                            <div style={{
                                position: 'absolute',
                                bottom: '0',
                                right: '0',
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                background: '#00f2ff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '3px solid #0d0d0d',
                                fontSize: '18px',
                            }}>
                                📷
                            </div>
                        </div>
                        <input
                            id="profile-panel-avatar-input"
                            name="profile-avatar"
                            type="file"
                            accept="image/*"
                            ref={fileInputRef}
                            style={{ display: 'none' }}
                            onChange={handleAvatarSelect}
                            aria-label="Загрузить новый аватар"
                        />

                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '22px', fontWeight: '600', color: '#fff', marginBottom: '4px' }}>
                                {username || 'Пользователь'}
                            </div>
                            <div style={{ fontSize: '14px', color: userId && isOnline(userId) ? '#00f2ff' : 'rgba(255, 255, 255, 0.4)' }}>
                                {userId && isOnline(userId) ? 'в сети' : 'не в сети'}
                            </div>
                        </div>
                    </div>

                    {/* About Section */}
                    <div>
                        <label
                            htmlFor="profile-panel-about-input"
                            style={{
                                fontSize: '13px',
                                color: 'rgba(255, 255, 255, 0.5)',
                                marginBottom: '8px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                display: 'block'
                            }}
                        >
                            ОБО МНЕ
                        </label>
                        <textarea
                            id="profile-panel-about-input"
                            name="profile-about"
                            value={about}
                            onChange={(e) => setAbout(e.target.value)}
                            placeholder="Добро пожаловать в Catlover Universe."
                            maxLength={200}
                            rows={3}
                            style={{
                                width: '100%',
                                padding: '12px',
                                background: 'rgba(255, 255, 255, 0.03)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '12px',
                                color: '#fff',
                                fontSize: '14px',
                                outline: 'none',
                                resize: 'none',
                                fontFamily: 'inherit',
                                boxSizing: 'border-box',
                            }}
                        />
                    </div>

                    {/* Settings Button */}
                    <div
                        onClick={() => openSettings('main')}
                        style={{
                            padding: '16px',
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                            transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(0, 242, 255, 0.1)';
                            e.currentTarget.style.borderColor = 'rgba(0, 242, 255, 0.3)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                        }}
                    >
                        <Icon size="200" src={Icons.Setting} style={{ color: '#00f2ff' }} />
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '15px', color: '#fff', fontWeight: '500' }}>
                                Полные настройки
                            </div>
                            <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.4)' }}>
                                Уведомления, приватность, чаты...
                            </div>
                        </div>
                        <Icon size="200" src={Icons.ChevronRight} style={{ color: 'rgba(255, 255, 255, 0.3)' }} />
                    </div>


                    {/* Save Button */}
                    {(avatarFile || username !== '' || about !== '') && (
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            style={{
                                padding: '14px 24px',
                                background: saving ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 242, 255, 0.2)',
                                border: `1px solid ${saving ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 242, 255, 0.5)'}`,
                                borderRadius: '12px',
                                color: saving ? 'rgba(255, 255, 255, 0.5)' : '#00f2ff',
                                fontSize: '15px',
                                fontWeight: '500',
                                cursor: saving ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                transition: 'all 0.2s',
                            }}
                        >
                            {saving && <Spinner size="200" variant="Secondary" />}
                            {saving ? 'Сохранение...' : 'Сохранить изменения'}
                        </button>
                    )}
                </div>
            </Scroll>

            {/* Logout Button */}
            <div style={{
                padding: '16px 20px',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            }}>
                <button
                    onClick={handleLogout}
                    style={{
                        width: '100%',
                        padding: '14px 24px',
                        background: 'rgba(255, 77, 77, 0.1)',
                        border: '1px solid rgba(255, 77, 77, 0.3)',
                        borderRadius: '12px',
                        color: '#ff4d4d',
                        fontSize: '15px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 77, 77, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 77, 77, 0.1)';
                    }}
                >
                    Выйти из аккаунта
                </button>
            </div>

            {/* Image Cropper */}
            {
                showCropper && tempImageUrl && (
                    <ImageCropper
                        imageUrl={tempImageUrl}
                        onCrop={handleCropComplete}
                        onCancel={() => {
                            setShowCropper(false);
                            setTempImageUrl(null);
                        }}
                    />
                )
            }

            {/* Settings Modal */}
            {
                showSettingsModal && (
                    <SettingsModal
                        onClose={() => setShowSettingsModal(false)}
                        initialSection={settingsSection}
                    />
                )
            }
        </div>
    );
}

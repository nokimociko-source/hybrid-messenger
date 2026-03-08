import { logger } from '../../utils/logger';
import React, { useState, useEffect, useRef } from 'react';
import { Spinner } from 'folds';
import { CatloverModal } from '../CatloverModal';
import { supabase } from '../../../supabaseClient';
import { ImageCropper } from '../ImageCropper';
import { CatloverAvatar } from '../CatloverAvatar';

interface ProfileSettingsProps {
    onBack: () => void;
}

export function ProfileSettings({ onBack }: ProfileSettingsProps) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [username, setUsername] = useState('');
    const [about, setAbout] = useState('');
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [showCropper, setShowCropper] = useState(false);
    const [tempImageUrl, setTempImageUrl] = useState<string | null>(null);
    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean;
        type: 'alert' | 'confirm';
        title: string;
        message: string;
        isDanger?: boolean;
    }>({
        isOpen: false,
        type: 'alert',
        title: '',
        message: ''
    });
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('users')
                .select('username, about, avatar_url')
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
            const isAnimated = file.type === 'image/gif' || file.type.startsWith('video/');
            if (isAnimated) {
                setAvatarFile(file);
                setAvatarUrl(URL.createObjectURL(file));
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
        setAvatarUrl(previewUrl);
        setShowCropper(false);
        setTempImageUrl(null);
    };

    const handleSave = async () => {
        if (!username.trim()) {
            setModalConfig({
                isOpen: true,
                type: 'alert',
                title: 'Внимание',
                message: 'Имя пользователя не может быть пустым'
            });
            return;
        }

        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            let newAvatarUrl = avatarUrl;

            // Upload new avatar if selected
            if (avatarFile) {
                const fileExt = avatarFile.name.split('.').pop() || (avatarFile.type.startsWith('image/') ? 'jpg' : 'webm');
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

            setModalConfig({
                isOpen: true,
                type: 'alert',
                title: 'Уведомление',
                message: 'Профиль успешно обновлен'
            });
            setTimeout(onBack, 1500);
        } catch (err) {
            logger.error('Error updating profile:', err);
            setModalConfig({
                isOpen: true,
                type: 'alert',
                title: 'Ошибка',
                message: 'Не удалось обновить профиль',
                isDanger: true
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                <Spinner variant="Secondary" />
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Avatar */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                <div
                    onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => (e.currentTarget.style.opacity = '0.8')}
                    onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => (e.currentTarget.style.opacity = '1')}
                    style={{ transition: 'opacity 0.2s', borderRadius: '50%' }}
                >
                    <CatloverAvatar
                        url={avatarUrl}
                        displayName={username}
                        size={120}
                        onClick={() => fileInputRef.current?.click()}
                        style={{ cursor: 'pointer' }}
                    />
                </div>
                <input
                    id="profile-avatar-input"
                    name="profile-avatar"
                    type="file"
                    accept="image/*,video/*"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    onChange={handleAvatarSelect}
                    aria-label="Изменить фото"
                />
                <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                        padding: '8px 20px',
                        background: 'rgba(0, 242, 255, 0.1)',
                        border: '1px solid rgba(0, 242, 255, 0.3)',
                        borderRadius: '8px',
                        color: '#00f2ff',
                        fontSize: '14px',
                        cursor: 'pointer',
                    }}
                >
                    Изменить фото
                </button>
            </div>

            {/* Username */}
            <div>
                <label htmlFor="profile-username-input" style={{ display: 'block', fontSize: '13px', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '8px' }}>
                    Имя пользователя
                </label>
                <input
                    id="profile-username-input"
                    name="profile-username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Введите имя"
                    maxLength={50}
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

            {/* About */}
            <div>
                <label htmlFor="profile-about-input" style={{ display: 'block', fontSize: '13px', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '8px' }}>
                    О себе
                </label>
                <textarea
                    id="profile-about-input"
                    name="profile-about"
                    value={about}
                    onChange={(e) => setAbout(e.target.value)}
                    placeholder="Расскажите о себе"
                    maxLength={200}
                    rows={4}
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
                <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.4)', marginTop: '4px' }}>
                    {about.length}/200
                </div>
            </div>

            {/* Save Button */}
            <button
                onClick={handleSave}
                disabled={saving || !username.trim()}
                style={{
                    padding: '12px 24px',
                    background: saving || !username.trim() ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 242, 255, 0.2)',
                    border: `1px solid ${saving || !username.trim() ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 242, 255, 0.5)'}`,
                    borderRadius: '8px',
                    color: saving || !username.trim() ? 'rgba(255, 255, 255, 0.5)' : '#00f2ff',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: saving || !username.trim() ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                }}
            >
                {saving && <Spinner size="200" variant="Secondary" />}
                Сохранить изменения
            </button>

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

            <CatloverModal
                isOpen={modalConfig.isOpen}
                type={modalConfig.type}
                title={modalConfig.title}
                message={modalConfig.message}
                isDanger={modalConfig.isDanger}
                onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
                onConfirm={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
            />
        </div>
    );
}

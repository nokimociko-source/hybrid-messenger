import React, { useState, useEffect } from 'react';
import { CatloverAvatar } from '../CatloverAvatar';
import { Icon, Icons } from 'folds';
import { getPresignedViewUrl } from '../../utils/s3Client';

interface GeneralSettingsProps {
    room: any;
    name: string;
    setName: (val: string) => void;
    topic: string;
    setTopic: (val: string) => void;
    avatarPreview: string | null;
    handleAvatarSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleRemoveAvatar: () => void;
    fileInputRef: React.RefObject<HTMLInputElement>;
    backgroundUrl: string;
    handleBackgroundSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleRemoveBackground: () => void;
    uploadingBg: boolean;
    uploadProgress: number;
    isPublic: boolean;
    setIsPublic: (val: boolean) => void;
    isEncrypted: boolean;
    setIsEncrypted: (val: boolean) => void;
}

export function GeneralSettings({
    room, name, setName, topic, setTopic,
    avatarPreview, handleAvatarSelect, handleRemoveAvatar, fileInputRef,
    backgroundUrl, handleBackgroundSelect, handleRemoveBackground, uploadingBg, uploadProgress,
    isPublic, setIsPublic, isEncrypted, setIsEncrypted
}: GeneralSettingsProps) {
    const [signedBgUrl, setSignedBgUrl] = useState<string | null>(null);

    // Get signed URL for background preview
    useEffect(() => {
        if (backgroundUrl && backgroundUrl.includes('wasabisys.com')) {
            getPresignedViewUrl(backgroundUrl).then(setSignedBgUrl).catch(() => setSignedBgUrl(backgroundUrl));
        } else {
            setSignedBgUrl(backgroundUrl || null);
        }
    }, [backgroundUrl]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Avatar Section */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <CatloverAvatar
                    url={avatarPreview}
                    displayName={name}
                    size={100}
                    onClick={() => fileInputRef.current?.click()}
                    style={{ border: '3px solid rgba(0, 242, 255, 0.2)', cursor: 'pointer' }}
                />
                <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleAvatarSelect} accept="image/*" />
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => fileInputRef.current?.click()} style={buttonStyle}>Изменить</button>
                    {avatarPreview && <button onClick={handleRemoveAvatar} style={dangerButtonStyle}>Удалить</button>}
                </div>
            </div>

            {/* Name & Topic */}
            <div>
                <label style={labelStyle}>Название {room.type === 'channel' ? 'канала' : 'группы'}</label>
                <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div>
                <label style={labelStyle}>Описание</label>
                <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={3} value={topic} onChange={(e) => setTopic(e.target.value)} />
            </div>

            {/* Background */}
            <div>
                <label style={labelStyle}>Фон чата</label>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    {signedBgUrl ? (
                        <div style={{ position: 'relative' }}>
                            <img src={signedBgUrl} style={{ width: '120px', height: '60px', borderRadius: '8px', objectFit: 'cover' }} />
                            <button onClick={handleRemoveBackground} style={removeBadgeStyle}>×</button>
                        </div>
                    ) : <div style={emptyBgStyle}>Нет фона</div>}
                    <label style={buttonStyle}>
                        {uploadingBg ? `Загрузка... ${uploadProgress}%` : 'Выбрать фото'}
                        <input type="file" accept="image/*" onChange={handleBackgroundSelect} style={{ display: 'none' }} disabled={uploadingBg} />
                    </label>
                </div>
            </div>

            {/* Toggles */}
            <div style={toggleRowStyle} onClick={() => setIsPublic(!isPublic)}>
                <span>{isPublic ? 'Публичный' : 'Приватный'}</span>
                <Toggle active={isPublic} />
            </div>

            <div style={toggleRowStyle} onClick={() => setIsEncrypted(!isEncrypted)}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Icon size="200" src={Icons.Lock} style={{ color: isEncrypted ? '#00f2ff' : 'rgba(255,255,255,0.4)' }} />
                    Сквозное шифрование (E2EE)
                </span>
                <Toggle active={isEncrypted} />
            </div>
        </div>
    );
}

// Internal reusable components/styles
function Toggle({ active }: { active: boolean }) {
    return (
        <div style={{ width: '40px', height: '20px', background: active ? '#00f2ff' : '#333', borderRadius: '10px', position: 'relative' }}>
            <div style={{ width: '16px', height: '16px', background: '#fff', borderRadius: '50%', position: 'absolute', top: '2px', left: active ? '22px' : '2px', transition: 'left 0.2s' }} />
        </div>
    );
}

const labelStyle = { display: 'block', fontSize: '13px', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '8px' };
const inputStyle = { width: '100%', padding: '12px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(0, 242, 255, 0.3)', borderRadius: '8px', color: '#fff', fontSize: '14px', outline: 'none' };
const buttonStyle = { padding: '6px 12px', background: 'rgba(0, 242, 255, 0.1)', border: '1px solid rgba(0, 242, 255, 0.3)', borderRadius: '8px', color: '#00f2ff', fontSize: '13px', cursor: 'pointer' };
const dangerButtonStyle = { padding: '6px 12px', background: 'rgba(255, 77, 77, 0.1)', border: '1px solid rgba(255, 77, 77, 0.3)', borderRadius: '8px', color: '#ff4d4d', fontSize: '13px', cursor: 'pointer' };
const removeBadgeStyle = { position: 'absolute', top: '-8px', right: '-8px', width: '24px', height: '24px', borderRadius: '50%', background: '#ff4d4d', border: 'none', color: '#fff', cursor: 'pointer' } as any;
const emptyBgStyle = { width: '120px', height: '60px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px dashed rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '12px' };
const toggleRowStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(0, 242, 255, 0.3)', borderRadius: '8px', cursor: 'pointer' };

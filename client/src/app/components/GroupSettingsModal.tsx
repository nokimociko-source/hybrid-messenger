import React, { useState, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { Room } from '../hooks/useSupabaseChat';
import { CatloverModal } from './CatloverModal';
import { ImageCropper } from './ImageCropper';
import { InviteLinkManager } from './InviteLinkManager';
import { AuditLogViewer } from './AuditLogViewer';
import { PollCreator } from './PollCreator';
import { TopicManager } from './TopicManager';
import { AdminManager } from './AdminManager';
import { BannedUsers } from './BannedUsers';
import { logger } from '../utils/logger';
import { uploadMediaFile } from '../hooks/supabaseHelpers';

// Sub-components
import { GeneralSettings } from './GroupSettings/GeneralSettings';
import { PermissionsSettings } from './GroupSettings/PermissionsSettings';
import { ManagementTools } from './GroupSettings/ManagementTools';

interface GroupSettingsModalProps {
    room: Room;
    onClose: () => void;
    onUpdate: () => void;
}

export function GroupSettingsModal({ room, onClose, onUpdate }: GroupSettingsModalProps) {
    const [name, setName] = useState(room.name || '');
    const [topic, setTopic] = useState(room.topic || '');
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(room.avatar_url || null);
    const [isPublic, setIsPublic] = useState(room.is_public || false);
    const [permissions, setPermissions] = useState<any>((room as any).permissions || {});
    const [saving, setSaving] = useState(false);
    const [showCropper, setShowCropper] = useState(false);
    const [tempImageUrl, setTempImageUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [backgroundUrl, setBackgroundUrl] = useState(room.background_url || '');
    const [uploadingBg, setUploadingBg] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isEncrypted, setIsEncrypted] = useState(room.is_encrypted || false);

    // Management Tool Visibility
    const [showInviteLinks, setShowInviteLinks] = useState(false);
    const [showAuditLog, setShowAuditLog] = useState(false);
    const [showPollCreator, setShowPollCreator] = useState(false);
    const [showTopicManager, setShowTopicManager] = useState(false);
    const [showAdminManager, setShowAdminManager] = useState(false);
    const [showBannedUsers, setShowBannedUsers] = useState(false);

    const [modalConfig, setModalConfig] = useState<any>({ isOpen: false });

    // Handlers
    const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            setTempImageUrl(reader.result as string);
            setShowCropper(true);
        };
        reader.readAsDataURL(file);
    };

    const handleBackgroundSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingBg(true);
        setUploadProgress(0);
        try {
            const url = await uploadMediaFile(file, (percent) => setUploadProgress(percent));
            if (url) {
                setBackgroundUrl(url);
            } else {
                throw new Error('Upload returned null');
            }
        } catch (err) {
            logger.error('Background upload failed', err);
        } finally {
            setUploadingBg(false);
            setUploadProgress(0);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            let avatarUrl = room.avatar_url;
            if (avatarFile) {
                const url = await uploadMediaFile(avatarFile);
                if (url) {
                    avatarUrl = url;
                } else {
                    throw new Error('Avatar upload returned null');
                }
            }

            await supabase.from('rooms').update({
                name, topic, is_public: isPublic, 
                permissions, background_url: backgroundUrl, 
                is_encrypted: isEncrypted, avatar_url: avatarUrl
            }).eq('id', room.id);

            onUpdate();
            onClose();
        } catch (err) {
            logger.error('Save failed', err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={overlayStyle}>
            <div style={modalStyle}>
                <div style={headerStyle}>
                    <h3>Настройки {room.type === 'channel' ? 'канала' : 'группы'}</h3>
                    <div onClick={onClose} style={closeButtonStyle}>×</div>
                </div>

                <div style={contentStyle} className="custom-scrollbar">
                    <GeneralSettings 
                        room={room} name={name} setName={setName} 
                        topic={topic} setTopic={setTopic}
                        avatarPreview={avatarPreview} handleAvatarSelect={handleAvatarSelect}
                        handleRemoveAvatar={() => setAvatarPreview(null)}
                        fileInputRef={fileInputRef} backgroundUrl={backgroundUrl}
                        handleBackgroundSelect={handleBackgroundSelect}
                        handleRemoveBackground={() => setBackgroundUrl('')}
                        uploadingBg={uploadingBg} uploadProgress={uploadProgress} isPublic={isPublic} setIsPublic={setIsPublic}
                        isEncrypted={isEncrypted} setIsEncrypted={setIsEncrypted}
                    />

                    <PermissionsSettings permissions={permissions} setPermissions={setPermissions} />

                    <ManagementTools 
                        setShowInviteLinks={setShowInviteLinks} setShowTopicManager={setShowTopicManager}
                        setShowPollCreator={setShowPollCreator} setShowAdminManager={setShowAdminManager}
                        setShowBannedUsers={setShowBannedUsers} setShowAuditLog={setShowAuditLog}
                    />
                    
                    <button onClick={handleSave} disabled={saving} style={saveButtonStyle}>
                        {saving ? 'Сохранение...' : 'Сохранить изменения'}
                    </button>
                </div>
            </div>

            {showCropper && tempImageUrl && (
                <ImageCropper 
                    imageUrl={tempImageUrl} 
                    onCrop={(blob: Blob) => {
                        setAvatarFile(new File([blob], 'avatar.jpg'));
                        setAvatarPreview(URL.createObjectURL(blob));
                        setShowCropper(false);
                    }} 
                    onCancel={() => setShowCropper(false)} 
                />
            )}

            {/* Sub-modals Render Logic */}
            {showInviteLinks && <InviteLinkManager roomId={room.id} onClose={() => setShowInviteLinks(false)} />}
            {showAuditLog && <AuditLogViewer roomId={room.id} onClose={() => setShowAuditLog(false)} />}
            {showPollCreator && (
                <PollCreator 
                    onClose={() => setShowPollCreator(false)} 
                    onCreate={async (pollData) => {
                        // TODO: создать опрос в комнате room.id
                        logger.info('Poll creation not yet implemented', pollData);
                        setShowPollCreator(false);
                    }} 
                />
            )}
            {showTopicManager && <TopicManager roomId={room.id} onClose={() => setShowTopicManager(false)} />}
            {showAdminManager && <AdminManager roomId={room.id} roomType="group" onClose={() => setShowAdminManager(false)} />}
            {showBannedUsers && <BannedUsers roomId={room.id} onClose={() => setShowBannedUsers(false)} />}

            <CatloverModal {...modalConfig} onClose={() => setModalConfig({ ...modalConfig, isOpen: false })} />
        </div>
    );
}

const overlayStyle: any = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modalStyle: any = { background: 'linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%)', border: '1px solid rgba(0, 242, 255, 0.3)', borderRadius: '16px', padding: '24px', minWidth: '500px', maxWidth: '90%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', gap: '20px', overflow: 'hidden' };
const headerStyle: any = { display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const closeButtonStyle: any = { cursor: 'pointer', color: 'rgba(255,255,255,0.6)', fontSize: '24px', padding: '4px 8px' };
const contentStyle: any = { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', paddingRight: '8px' };
const saveButtonStyle: any = { width: '100%', padding: '14px', background: '#00f2ff', border: 'none', borderRadius: '10px', color: '#000', fontWeight: 'bold', cursor: 'pointer' };

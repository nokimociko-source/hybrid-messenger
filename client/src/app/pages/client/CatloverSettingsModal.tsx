import React, { useRef, useState } from 'react';
import { useSupabaseProfile } from '../../hooks/useSupabaseChat';
import { useTheme } from '../../hooks/useTheme';
import { Spinner } from 'folds';
import { supabase } from '../../../supabaseClient';
import { ImageCropper } from '../../components/ImageCropper';
import { LegalModal } from '../../components/LegalModal';
import { CatloverAvatar } from '../../components/CatloverAvatar';

export function CatloverSettingsModal({ onClose }: { onClose: () => void }) {
    const { profile, loading, updateUserAvatar } = useSupabaseProfile();
    const { theme, toggleTheme } = useTheme();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showCropper, setShowCropper] = useState(false);
    const [tempImageUrl, setTempImageUrl] = useState<string | null>(null);
    const [legalModal, setLegalModal] = useState<'privacy' | 'terms' | null>(null);

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const isAnimated = file.type === 'image/gif' || file.type.startsWith('video/');
            if (isAnimated) {
                await updateUserAvatar(file);
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

    const handleCropComplete = async (croppedBlob: Blob) => {
        const croppedFile = new File([croppedBlob], 'avatar.jpg', { type: 'image/jpeg' });
        await updateUserAvatar(croppedFile);
        setShowCropper(false);
        setTempImageUrl(null);
    };

    return (
        <div style={{
            position: 'fixed',
            left: '72px',
            top: 0,
            bottom: 0,
            width: '360px',
            backgroundColor: 'var(--bg-secondary)',
            borderRight: '1px solid var(--border-secondary)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '10px 0 30px rgba(0,0,0,0.5)',
        }}
            className="settings-modal"
        >
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                padding: '20px 24px',
                borderBottom: '1px solid var(--border-tertiary)',
                backgroundColor: 'var(--bg-primary)',
            }}>
                <div style={{
                    flexGrow: 1,
                    fontWeight: '600',
                    fontSize: '20px',
                    color: 'var(--text-primary)',
                    letterSpacing: '0.3px'
                }}>
                    Настройки
                </div>
                <button
                    onClick={onClose}
                    style={{
                        cursor: 'pointer',
                        padding: '8px',
                        borderRadius: '50%',
                        color: 'var(--text-tertiary)',
                        backgroundColor: 'transparent',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                        e.currentTarget.style.color = 'var(--accent-primary)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = 'var(--text-tertiary)';
                    }}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1 }}>
                    <Spinner variant="Secondary" />
                </div>
            ) : profile ? (
                <div style={{
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '24px',
                    flexGrow: 1,
                    overflowY: 'auto'
                }}>
                    {/* Profile Section */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '16px',
                        padding: '20px',
                        backgroundColor: 'var(--bg-primary)',
                        borderRadius: '16px',
                        border: '1px solid var(--border-tertiary)'
                    }}>
                        <CatloverAvatar
                            url={profile.avatar_url}
                            displayName={profile.username}
                            size={100}
                            onClick={handleAvatarClick}
                            style={{
                                cursor: 'pointer',
                                border: '3px solid var(--accent-primary)',
                                boxShadow: '0 0 20px var(--accent-primary)',
                                transition: 'all 0.2s',
                                position: 'relative'
                            }}
                        >
                            {/* Camera icon overlay */}
                            <div style={{
                                position: 'absolute',
                                bottom: 0,
                                right: 0,
                                backgroundColor: 'var(--accent-primary)',
                                borderRadius: '50%',
                                padding: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                                zIndex: 1
                            }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                    <circle cx="12" cy="13" r="4" />
                                </svg>
                            </div>
                        </CatloverAvatar>
                        <input
                            id="user-avatar-input"
                            name="user-avatar"
                            type="file"
                            accept="image/*,video/*"
                            ref={fileInputRef}
                            style={{ display: 'none' }}
                            onChange={handleFileChange}
                            aria-label="Сменить аватар"
                        />
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)' }}>
                                {profile.username || 'Аноним'}
                            </div>
                            <div style={{
                                color: 'var(--accent-primary)',
                                fontSize: '13px',
                                marginTop: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px'
                            }}>
                                <div style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    backgroundColor: 'var(--accent-primary)',
                                    boxShadow: '0 0 8px var(--accent-primary)'
                                }} />
                                online
                            </div>
                        </div>
                    </div>

                    {/* About Section */}
                    <div>
                        <div style={{
                            color: 'var(--text-tertiary)',
                            fontSize: '12px',
                            textTransform: 'uppercase',
                            marginBottom: '12px',
                            fontWeight: '600',
                            letterSpacing: '0.5px'
                        }}>
                            Обо мне
                        </div>
                        <div style={{
                            color: 'var(--text-secondary)',
                            fontSize: '14px',
                            backgroundColor: 'var(--bg-primary)',
                            padding: '16px',
                            borderRadius: '12px',
                            border: '1px solid var(--border-tertiary)',
                            lineHeight: '1.5'
                        }}>
                            {profile.about || "Добро пожаловать в Catlover Universe."}
                        </div>
                    </div>

                    {/* Theme Toggle */}
                    <div>
                        <div style={{
                            color: 'var(--text-tertiary)',
                            fontSize: '12px',
                            textTransform: 'uppercase',
                            marginBottom: '12px',
                            fontWeight: '600',
                            letterSpacing: '0.5px'
                        }}>
                            Тема оформления
                        </div>
                        <div
                            onClick={toggleTheme}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '16px',
                                background: 'var(--bg-primary)',
                                border: '1px solid var(--border-secondary)',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'var(--bg-hover)';
                                e.currentTarget.style.borderColor = 'var(--accent-primary)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'var(--bg-primary)';
                                e.currentTarget.style.borderColor = 'var(--border-secondary)';
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                    fontSize: '28px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '50%',
                                    backgroundColor: 'var(--bg-tertiary)'
                                }}>
                                    {theme === 'dark' ? (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                                        </svg>
                                    ) : (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="12" cy="12" r="5" />
                                            <line x1="12" y1="1" x2="12" y2="3" />
                                            <line x1="12" y1="21" x2="12" y2="23" />
                                            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                                            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                                            <line x1="1" y1="12" x2="3" y2="12" />
                                            <line x1="21" y1="12" x2="23" y2="12" />
                                            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                                            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                                        </svg>
                                    )}
                                </div>
                                <div>
                                    <div style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '500' }}>
                                        {theme === 'dark' ? 'Тёмная тема' : 'Светлая тема'}
                                    </div>
                                    <div style={{ color: 'var(--text-tertiary)', fontSize: '12px', marginTop: '2px' }}>
                                        Нажмите для переключения
                                    </div>
                                </div>
                            </div>
                            <div
                                style={{
                                    width: '48px',
                                    height: '28px',
                                    borderRadius: '14px',
                                    background: theme === 'dark' ? 'var(--accent-primary)' : '#ffc800',
                                    opacity: 0.3,
                                    position: 'relative',
                                    transition: 'all 0.3s',
                                }}
                            >
                                <div
                                    style={{
                                        width: '22px',
                                        height: '22px',
                                        borderRadius: '50%',
                                        background: theme === 'dark' ? 'var(--accent-primary)' : '#ffc800',
                                        position: 'absolute',
                                        top: '3px',
                                        left: theme === 'dark' ? '3px' : '23px',
                                        transition: 'all 0.3s',
                                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Logout Button */}
                    <div style={{ marginTop: 'auto', paddingTop: '20px' }}>
                        <button
                            onClick={async () => {
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
                                window.location.href = '/';
                            }}
                            style={{
                                width: '100%',
                                padding: '14px',
                                background: 'rgba(255, 50, 50, 0.1)',
                                border: '1px solid rgba(255, 50, 50, 0.3)',
                                color: '#ff4444',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                fontWeight: '600',
                                fontSize: '14px',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 50, 50, 0.2)';
                                e.currentTarget.style.transform = 'translateY(-2px)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 50, 50, 0.1)';
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                <polyline points="16 17 21 12 16 7" />
                                <line x1="21" y1="12" x2="9" y2="12" />
                            </svg>
                            Выйти из аккаунта
                        </button>
                    </div>
                </div>
            ) : null}

            {/* About App */}
            <div style={{ padding: '16px 24px 8px' }}>
                <div style={{
                    background: 'linear-gradient(135deg, rgba(0, 242, 255, 0.05) 0%, rgba(0, 130, 200, 0.05) 100%)',
                    border: '1px solid rgba(0, 242, 255, 0.15)',
                    borderRadius: '20px',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                }}>
                    {/* App Identity */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <img
                            src="/favicon.png"
                            alt="Catlover icon"
                            style={{
                                width: '56px',
                                height: '56px',
                                borderRadius: '16px',
                                border: '2px solid rgba(0, 242, 255, 0.3)',
                                boxShadow: '0 0 20px rgba(0, 242, 255, 0.2)'
                            }}
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                        <div>
                            <div style={{ fontSize: '22px', fontWeight: '700', color: '#fff', letterSpacing: '0.5px' }}>
                                Catlover
                            </div>
                            <div style={{ fontSize: '13px', color: 'rgba(0, 242, 255, 0.7)', marginTop: '2px' }}>
                                Версия 1.0.0 · Hybrid Messenger
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.55)', lineHeight: '1.6' }}>
                        Современный защищённый мессенджер с поддержкой каналов, групп, звонков и сквозного шифрования.
                    </p>

                    {/* Feature badges */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {['🔒 E2E шифрование', '📡 Real-time', '🐱 Каналы', '💬 Группы', '📞 Звонки'].map(f => (
                            <span key={f} style={{
                                padding: '4px 12px',
                                borderRadius: '20px',
                                background: 'rgba(0, 242, 255, 0.08)',
                                border: '1px solid rgba(0, 242, 255, 0.2)',
                                color: 'rgba(255,255,255,0.7)',
                                fontSize: '12px',
                            }}>{f}</span>
                        ))}
                    </div>

                    {/* Links */}
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {/* Legal buttons */}
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={() => setLegalModal('privacy')}
                                style={{
                                    flex: 1,
                                    padding: '10px 12px',
                                    background: 'rgba(255, 255, 255, 0.04)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '12px',
                                    color: 'rgba(255,255,255,0.65)',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    transition: 'all 0.2s',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,242,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(0,242,255,0.2)'; e.currentTarget.style.color = '#fff'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.65)'; }}
                            >
                                🔒 Конфиденциальность
                            </button>
                            <button
                                onClick={() => setLegalModal('terms')}
                                style={{
                                    flex: 1,
                                    padding: '10px 12px',
                                    background: 'rgba(255, 255, 255, 0.04)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '12px',
                                    color: 'rgba(255,255,255,0.65)',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    transition: 'all 0.2s',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,242,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(0,242,255,0.2)'; e.currentTarget.style.color = '#fff'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.65)'; }}
                            >
                                📋 Условия использования
                            </button>
                        </div>

                        {/* Footer links */}
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <a href="https://github.com" target="_blank" rel="noopener noreferrer" style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                fontSize: '12px', color: 'rgba(0, 242, 255, 0.7)',
                                textDecoration: 'none'
                            }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
                                </svg>
                                GitHub
                            </a>
                            <span style={{ color: 'rgba(255,255,255,0.1)' }}>|</span>
                            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>© 2026 Demonestokom</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Legal Modal */}
            {legalModal && (
                <LegalModal type={legalModal} onClose={() => setLegalModal(null)} />
            )}

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

            <style>{`
                .settings-modal {
                    animation: slideInLeft 0.3s ease-out;
                }
                
                @keyframes slideInLeft {
                    from {
                        transform: translateX(-100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                
                @media (max-width: 768px) {
                    .settings-modal {
                        left: 0 !important;
                        width: 100% !important;
                    }
                }
            `}</style>
        </div>
    );
}

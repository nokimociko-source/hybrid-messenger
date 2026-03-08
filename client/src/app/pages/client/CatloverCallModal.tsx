import React, { useEffect, useState } from 'react';
import { Icon, Icons } from 'folds';
import { Room } from '../../hooks/useSupabaseChat';
import { useSupabaseCall } from '../../hooks/useSupabaseCall';
import { CallDeviceSelector } from '../../components/CallDeviceSelector';

type CatloverCallModalProps = {
    room: Room;
    callHook: ReturnType<typeof useSupabaseCall>;
    onClose: () => void;
};

export function CatloverCallModal({ room, callHook, onClose }: CatloverCallModalProps) {
    const {
        callStatus,
        callType,
        localStream,
        remoteStream,
        error,
        errorMessage,
        audioDevices,
        videoDevices,
        selectedAudioDevice,
        selectedVideoDevice,
        acceptCall,
        rejectCall,
        endCall,
        switchDevice,
        toggleAudio,
        toggleVideo
    } = callHook;

    const [showDeviceSelector, setShowDeviceSelector] = useState(false);
    const [isAudioMuted, setIsAudioMuted] = useState(false);
    const [isVideoMuted, setIsVideoMuted] = useState(false);

    const isDirect = room.is_direct;
    const displayName = isDirect ? (room.other_user?.username || 'Unknown User') : (room.name || 'Group Chat');
    const avatarUrl = isDirect ? room.other_user?.avatar_url : null;

    useEffect(() => {
        if (callStatus === 'idle') {
            onClose();
        }
    }, [callStatus, onClose]);

    const handleToggleAudio = () => {
        toggleAudio();
        setIsAudioMuted(!isAudioMuted);
    };

    const handleToggleVideo = () => {
        toggleVideo();
        setIsVideoMuted(!isVideoMuted);
    };

    if (callStatus === 'idle') {
        return null;
    }

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 10000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(30px)'
        }}>
            {/* Background Blur Avatar */}
            <div style={{
                position: 'absolute', inset: -50,
                backgroundImage: avatarUrl ? `url(${avatarUrl})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'blur(100px) opacity(0.3)',
                zIndex: -1
            }} />

            <div style={{
                width: '100%', maxWidth: '400px',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: '30px', padding: '40px',
                textAlign: 'center'
            }}>
                <div style={{ position: 'relative' }}>
                    <div style={{
                        width: '120px', height: '120px',
                        borderRadius: '50%',
                        border: '3px solid #00f2ff',
                        boxShadow: '0 0 30px rgba(0, 242, 255, 0.4)',
                        backgroundImage: avatarUrl ? `url(${avatarUrl})` : 'none',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundColor: '#1a1a1a',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '48px', color: '#00f2ff', fontWeight: 'bold'
                    }}>
                        {!avatarUrl && displayName[0]?.toUpperCase()}
                    </div>
                </div>

                <div>
                    <h2 style={{ color: '#fff', fontSize: '28px', margin: '0', textShadow: '0 0 10px rgba(255,255,255,0.3)' }}>{displayName}</h2>
                    <p style={{ color: '#00f2ff', fontSize: '16px', marginTop: '8px', textTransform: 'uppercase', letterSpacing: '2px' }}>
                        {callStatus === 'incoming' ? 'Входящий вызов...' :
                            callStatus === 'calling' ? 'Вызов...' :
                                callStatus === 'connected' ? 'На связи' :
                                    callStatus === 'error' ? 'Ошибка' : 'Завершение...'}
                    </p>
                    {error && errorMessage && (
                        <p style={{ color: '#ff3333', fontSize: '14px', marginTop: '8px' }}>
                            {errorMessage}
                        </p>
                    )}
                </div>

                {/* Device Selector */}
                {callStatus === 'incoming' && (
                    <>
                        <button
                            onClick={() => setShowDeviceSelector(!showDeviceSelector)}
                            style={{
                                background: 'transparent',
                                border: '1px solid #00f2ff',
                                color: '#00f2ff',
                                padding: '8px 16px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '14px'
                            }}
                        >
                            {showDeviceSelector ? 'Скрыть устройства' : 'Выбрать устройства'}
                        </button>
                        
                        {showDeviceSelector && (
                            <CallDeviceSelector
                                audioDevices={audioDevices}
                                videoDevices={videoDevices}
                                selectedAudioDevice={selectedAudioDevice}
                                selectedVideoDevice={selectedVideoDevice}
                                onAudioDeviceChange={(deviceId) => switchDevice(deviceId, 'audio')}
                                onVideoDeviceChange={(deviceId) => switchDevice(deviceId, 'video')}
                                showVideo={callType === 'video'}
                            />
                        )}
                    </>
                )}

                {/* Video Streams */}
                <div style={{ display: 'flex', gap: '20px', width: '100%', justifyContent: 'center' }}>
                    {localStream && callType === 'video' && (
                        <video
                            ref={(v) => v && (v.srcObject = localStream)}
                            autoPlay muted playsInline
                            style={{ width: '120px', height: '160px', borderRadius: '12px', objectFit: 'cover', border: '1px solid #00f2ff' }}
                        />
                    )}
                    {remoteStream && callType === 'video' && (
                        <video
                            ref={(v) => v && (v.srcObject = remoteStream)}
                            autoPlay playsInline
                            style={{ width: '120px', height: '160px', borderRadius: '12px', objectFit: 'cover', border: '1px solid #00f2ff' }}
                        />
                    )}
                </div>

                <div style={{ display: 'flex', gap: '40px', marginTop: '20px' }}>
                    {callStatus === 'incoming' ? (
                        <>
                            <div
                                onClick={rejectCall}
                                style={{
                                    width: '64px', height: '64px', borderRadius: '50%',
                                    backgroundColor: '#ff3333', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer', boxShadow: '0 0 20px rgba(255, 51, 51, 0.5)'
                                }}
                            >
                                <Icon size="300" src={Icons.PhoneDown} style={{ color: '#fff' }} />
                            </div>
                            <div
                                onClick={acceptCall}
                                style={{
                                    width: '64px', height: '64px', borderRadius: '50%',
                                    backgroundColor: '#00ff00', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer', boxShadow: '0 0 20px rgba(0, 255, 0, 0.5)'
                                }}
                            >
                                <Icon size="300" src={Icons.Phone} style={{ color: '#fff' }} />
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Mute/Unmute buttons */}
                            <div
                                onClick={handleToggleAudio}
                                style={{
                                    width: '56px', height: '56px', borderRadius: '50%',
                                    backgroundColor: isAudioMuted ? '#ff3333' : '#333',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer', boxShadow: '0 0 15px rgba(0, 242, 255, 0.3)'
                                }}
                            >
                                <Icon size="200" src={isAudioMuted ? Icons.MicMute : Icons.Mic} style={{ color: '#fff' }} />
                            </div>
                            
                            {callType === 'video' && (
                                <div
                                    onClick={handleToggleVideo}
                                    style={{
                                        width: '56px', height: '56px', borderRadius: '50%',
                                        backgroundColor: isVideoMuted ? '#ff3333' : '#333',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: 'pointer', boxShadow: '0 0 15px rgba(162, 0, 255, 0.3)'
                                    }}
                                >
                                    <Icon size="200" src={isVideoMuted ? Icons.EyeBlind : Icons.VideoCamera} style={{ color: '#fff' }} />
                                </div>
                            )}
                            
                            <div
                                onClick={endCall}
                                style={{
                                    width: '72px', height: '72px', borderRadius: '50%',
                                    backgroundColor: '#ff3333', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer', boxShadow: '0 0 30px rgba(255, 51, 51, 0.6)'
                                }}
                            >
                                <Icon size="300" src={Icons.PhoneDown} style={{ color: '#fff' }} />
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

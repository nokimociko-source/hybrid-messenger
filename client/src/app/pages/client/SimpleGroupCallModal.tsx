import React, { useEffect, useRef } from 'react';
import { Icon, Icons } from 'folds';
import { Room } from '../../hooks/useSupabaseChat';
import { useWebRTCCall } from '../../hooks/useWebRTCCall';

type SimpleGroupCallModalProps = {
    room: Room;
    onClose: () => void;
};

export function SimpleGroupCallModal({ room, onClose }: SimpleGroupCallModalProps) {
    const {
        participants,
        localStream,
        isAudioEnabled,
        isVideoEnabled,
        callStatus,
        isRecording,
        startCall,
        endCall,
        toggleAudio,
        toggleVideo,
        startRecording,
        stopRecording
    } = useWebRTCCall(room.id);

    const localVideoRef = useRef<HTMLVideoElement>(null);

    // Автоматически начать звонок
    useEffect(() => {
        if (callStatus === 'idle') {
            startCall(false); // Начать с аудио
        }
    }, []);

    // Обновить локальное видео
    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    const handleEndCall = async () => {
        await endCall();
        onClose();
    };

    if (callStatus === 'connecting') {
        return (
            <div style={{
                position: 'fixed', inset: 0, zIndex: 10000,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: 'rgba(0,0,0,0.85)',
            }}>
                <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: '20px', padding: '40px'
                }}>
                    <h2 style={{ color: '#00f2ff', fontSize: '24px', margin: '0' }}>
                        Подключение...
                    </h2>
                </div>
            </div>
        );
    }

    const participantsList = Array.from(participants.values());

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 10000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(30px)'
        }}>
            <div style={{
                width: '100%', maxWidth: '800px',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: '30px', padding: '40px'
            }}>
                <h2 style={{ color: '#fff', fontSize: '24px', margin: '0' }}>
                    {room.name || 'Групповой звонок'}
                </h2>
                <p style={{ color: '#00f2ff', fontSize: '14px', margin: '0' }}>
                    {participantsList.length + 1} участник{participantsList.length !== 0 ? 'ов' : ''}
                </p>

                {/* Участники */}
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: participantsList.length > 1 ? 'repeat(2, 1fr)' : '1fr',
                    gap: '20px',
                    width: '100%',
                    maxHeight: '60vh',
                    overflowY: 'auto'
                }}>
                    {/* Локальное видео */}
                    <ParticipantVideo
                        stream={localStream}
                        name="Вы"
                        isLocal={true}
                        isVideoEnabled={isVideoEnabled}
                    />

                    {/* Удалённые участники */}
                    {participantsList.map((participant) => (
                        <ParticipantVideo
                            key={participant.userId}
                            stream={participant.stream}
                            name={participant.username}
                            isLocal={false}
                            isVideoEnabled={true}
                        />
                    ))}
                </div>

                {/* Кнопки управления */}
                <div style={{ display: 'flex', gap: '40px', marginTop: '20px', alignItems: 'center' }}>
                    {/* Микрофон */}
                    <button
                        onClick={toggleAudio}
                        style={{
                            width: '56px', height: '56px', borderRadius: '50%',
                            backgroundColor: isAudioEnabled ? '#333' : '#ff3333',
                            border: 'none',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer',
                            boxShadow: '0 0 15px rgba(0, 242, 255, 0.3)',
                            transition: 'all 0.2s'
                        }}
                    >
                        <Icon 
                            size="200" 
                            src={isAudioEnabled ? Icons.Mic : Icons.MicMute} 
                            style={{ color: '#fff' }} 
                        />
                    </button>
                    
                    {/* Камера */}
                    <button
                        onClick={toggleVideo}
                        style={{
                            width: '56px', height: '56px', borderRadius: '50%',
                            backgroundColor: isVideoEnabled ? '#333' : '#ff3333',
                            border: 'none',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer',
                            boxShadow: '0 0 15px rgba(162, 0, 255, 0.3)',
                            transition: 'all 0.2s'
                        }}
                    >
                        <Icon 
                            size="200" 
                            src={isVideoEnabled ? Icons.VideoCamera : Icons.EyeBlind} 
                            style={{ color: '#fff' }} 
                        />
                    </button>

                    {/* Запись */}
                    <button
                        onClick={isRecording ? stopRecording : startRecording}
                        style={{
                            width: '56px', height: '56px', borderRadius: '50%',
                            backgroundColor: isRecording ? '#ff3333' : '#333',
                            border: 'none',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer',
                            boxShadow: isRecording ? '0 0 20px rgba(255, 51, 51, 0.6)' : '0 0 15px rgba(255, 255, 255, 0.2)',
                            transition: 'all 0.2s',
                            animation: isRecording ? 'pulse 2s infinite' : 'none'
                        }}
                        title={isRecording ? 'Остановить запись' : 'Начать запись'}
                    >
                        <div style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: isRecording ? '2px' : '50%',
                            backgroundColor: '#fff',
                            transition: 'all 0.2s'
                        }} />
                    </button>
                    
                    {/* Завершить звонок */}
                    <button
                        onClick={handleEndCall}
                        style={{
                            width: '72px', height: '72px', borderRadius: '50%',
                            backgroundColor: '#ff3333',
                            border: 'none',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer',
                            boxShadow: '0 0 30px rgba(255, 51, 51, 0.6)',
                            transition: 'all 0.2s'
                        }}
                    >
                        <Icon size="300" src={Icons.PhoneDown} style={{ color: '#fff' }} />
                    </button>
                </div>

                {/* CSS для анимации */}
                <style>{`
                    @keyframes pulse {
                        0%, 100% { opacity: 1; }
                        50% { opacity: 0.5; }
                    }
                `}</style>
            </div>
        </div>
    );
}

// Компонент для отображения участника
function ParticipantVideo({ 
    stream, 
    name, 
    isLocal, 
    isVideoEnabled 
}: { 
    stream: MediaStream | null | undefined; 
    name: string; 
    isLocal: boolean;
    isVideoEnabled: boolean;
}) {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    return (
        <div style={{
            position: 'relative',
            aspectRatio: '4/3',
            borderRadius: '12px',
            overflow: 'hidden',
            border: '2px solid #00f2ff',
            boxShadow: '0 0 20px rgba(0, 242, 255, 0.3)',
            background: '#1a1a1a'
        }}>
            {isVideoEnabled && stream ? (
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted={isLocal}
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        transform: isLocal ? 'scaleX(-1)' : 'none'
                    }}
                />
            ) : (
                <div style={{
                    width: '100%', height: '100%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '48px', color: '#00f2ff', fontWeight: 'bold'
                }}>
                    {name[0]?.toUpperCase() || '?'}
                </div>
            )}
            
            <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)',
                padding: '12px',
                color: '#00f2ff',
                fontSize: '14px',
                fontWeight: '600'
            }}>
                {name}
            </div>
        </div>
    );
}

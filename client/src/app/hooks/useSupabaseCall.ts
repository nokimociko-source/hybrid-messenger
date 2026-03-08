import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { getCurrentUser, getCurrentUserId } from '../utils/authCache';
import { notifyIncomingCall, stopCallNotification, requestNotificationPermission } from '../utils/platformNotifications';
import { useRateLimit } from './useRateLimit';
import { logger } from '../utils/logger';

export type CallType = 'audio' | 'video';
export type CallStatus = 'idle' | 'calling' | 'incoming' | 'connected' | 'ended' | 'error';
export type CallError = 'permission_denied' | 'device_not_found' | 'connection_failed' | 'unknown';

export interface MediaDevice {
    deviceId: string;
    label: string;
    kind: 'audioinput' | 'videoinput' | 'audiooutput';
}

export function useSupabaseCall(roomId?: string) {
    const [callStatus, setCallStatus] = useState<CallStatus>('idle');
    const [callType, setCallType] = useState<CallType>('audio');
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [callerId, setCallerId] = useState<string | null>(null);
    const [error, setError] = useState<CallError | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [currentCallId, setCurrentCallId] = useState<string | null>(null);
    const [callStartTime, setCallStartTime] = useState<number | null>(null);

    // Rate limiting hook
    const { checkRateLimit, lastError: rateLimitError } = useRateLimit();

    // Устройства
    const [audioDevices, setAudioDevices] = useState<MediaDevice[]>([]);
    const [videoDevices, setVideoDevices] = useState<MediaDevice[]>([]);
    const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>('default');
    const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>('default');

    const pcRef = useRef<RTCPeerConnection | null>(null);
    const channelRef = useRef<any>(null);
    const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);
    const isChannelReady = useRef(false);

    // Загрузка списка устройств
    const loadDevices = useCallback(async () => {
        try {
            // Сначала запрашиваем разрешение
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
                .catch(() => navigator.mediaDevices.getUserMedia({ audio: true }));

            // Останавливаем временный стрим
            stream.getTracks().forEach(track => track.stop());

            const devices = await navigator.mediaDevices.enumerateDevices();

            const audio = devices
                .filter(d => d.kind === 'audioinput')
                .map(d => ({
                    deviceId: d.deviceId,
                    label: d.label || `Микрофон ${d.deviceId.slice(0, 5)}`,
                    kind: 'audioinput' as const
                }));

            const video = devices
                .filter(d => d.kind === 'videoinput')
                .map(d => ({
                    deviceId: d.deviceId,
                    label: d.label || `Камера ${d.deviceId.slice(0, 5)}`,
                    kind: 'videoinput' as const
                }));

            setAudioDevices(audio);
            setVideoDevices(video);

            // Установить первое устройство по умолчанию
            if (audio.length > 0 && selectedAudioDevice === 'default') {
                setSelectedAudioDevice(audio[0].deviceId);
            }
            if (video.length > 0 && selectedVideoDevice === 'default') {
                setSelectedVideoDevice(video[0].deviceId);
            }
        } catch (err) {
            logger.error('Error loading devices:', err);
            // Не критично, просто не будет выбора устройств
        }
    }, [selectedAudioDevice, selectedVideoDevice]);

    // Загрузить устройства при монтировании
    useEffect(() => {
        // Не загружаем устройства автоматически, только по требованию
        // loadDevices();

        // Проверяем доступность navigator.mediaDevices
        if (!navigator.mediaDevices) {
            logger.warn('navigator.mediaDevices is not available. Calls may not work.');
            return;
        }

        // Обновлять список при подключении/отключении устройств
        navigator.mediaDevices.addEventListener('devicechange', loadDevices);
        return () => {
            navigator.mediaDevices?.removeEventListener('devicechange', loadDevices);
        };
    }, [loadDevices]);

    const cleanup = useCallback(() => {
        // Save call history if call was connected
        if (currentCallId && callStartTime && roomId) {
            const duration = Math.floor((Date.now() - callStartTime) / 1000);
            supabase
                .from('call_history')
                .update({
                    status: 'ended',
                    ended_at: new Date().toISOString(),
                    duration: duration
                })
                .eq('id', currentCallId)
                .then(
                    () => {
                        logger.debug('Call history updated');
                    },
                    (err: any) => logger.error('Error updating call history:', err)
                );
        }

        if (pcRef.current) {
            pcRef.current.close();
            pcRef.current = null;
        }
        if (localStream) {
            localStream.getTracks().forEach(t => t.stop());
            setLocalStream(null);
        }
        pendingCandidates.current = [];
        setRemoteStream(null);
        setCallStatus('idle');
        setCallerId(null);
        setCurrentCallId(null);
        setCallStartTime(null);
    }, [localStream, currentCallId, callStartTime, roomId]);

    useEffect(() => {
        if (!roomId) return;

        // Запросить разрешение на уведомления при монтировании
        requestNotificationPermission();

        const channel = supabase.channel(`call:${roomId}`, {
            config: { broadcast: { self: false } }
        });

        channel
            .on('broadcast', { event: 'signal' }, async ({ payload }) => {
                const { type, from, signal, callType: incomingCallType, callerName } = payload;

                if (type === 'offer') {
                    setCallStatus('incoming');
                    setCallerId(from);
                    setCallType(incomingCallType);
                    // Store signal for later use when accepting
                    (window as any).pendingOffer = signal;

                    // Показать уведомление о входящем звонке
                    await notifyIncomingCall(
                        callerName || 'Неизвестный пользователь',
                        incomingCallType === 'video'
                    );
                } else if (type === 'answer') {
                    if (pcRef.current) {
                        try {
                            await pcRef.current.setRemoteDescription(new RTCSessionDescription(signal));
                            // Process queued candidates
                            for (const candidate of pendingCandidates.current) {
                                await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
                            }
                            pendingCandidates.current = [];
                        } catch (err) {
                            logger.error('Error setting remote description or candidates:', err);
                        }
                    }
                } else if (type === 'candidate') {
                    if (pcRef.current && pcRef.current.remoteDescription) {
                        try {
                            await pcRef.current.addIceCandidate(new RTCIceCandidate(signal));
                        } catch (err) {
                            logger.error('Error adding ICE candidate:', err);
                        }
                    } else {
                        pendingCandidates.current.push(signal);
                    }
                } else if (type === 'hangup') {
                    stopCallNotification();
                    cleanup();
                }
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    isChannelReady.current = true;
                }
            });

        channelRef.current = channel;

        return () => {
            isChannelReady.current = false;
            stopCallNotification();
            supabase.removeChannel(channel);
        };
    }, [roomId, cleanup]);

    const initPeerConnection = async (stream: MediaStream) => {
        // TURN сервер для работы через NAT/Firewall
        const pc = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                // Добавь свой TURN сервер для production:
                // {
                //     urls: 'turn:your-turn-server.com:3478',
                //     username: 'username',
                //     credential: 'password'
                // }
            ],
            iceCandidatePoolSize: 10
        });

        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        pc.ontrack = (event) => {
            setRemoteStream(event.streams[0]);
            setCallStatus('connected');
            // Start tracking call duration
            if (!callStartTime) {
                setCallStartTime(Date.now());
            }
        };

        pc.onicecandidate = async (event) => {
            if (event.candidate && channelRef.current && isChannelReady.current) {
                await channelRef.current.send({
                    type: 'broadcast',
                    event: 'signal',
                    payload: { type: 'candidate', signal: event.candidate }
                });
            }
        };

        pc.oniceconnectionstatechange = () => {
            if (pc.iceConnectionState === 'disconnected') {
                setError('connection_failed');
                setErrorMessage('Соединение потеряно');
            } else if (pc.iceConnectionState === 'failed') {
                setError('connection_failed');
                setErrorMessage('Не удалось установить соединение');
                setCallStatus('error');
                cleanup();
            } else if (pc.iceConnectionState === 'connected') {
                setError(null);
                setErrorMessage(null);
            }
        };

        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'failed') {
                setError('connection_failed');
                setErrorMessage('Ошибка соединения');
                setCallStatus('error');
                cleanup();
            }
        };

        pcRef.current = pc;
        return pc;
    };

    const startCall = async (type: CallType = 'audio') => {
        if (!roomId) return;

        // Check rate limit before starting call
        const allowed = await checkRateLimit('call');
        if (!allowed) {
            setError('unknown');
            setErrorMessage(rateLimitError || 'Слишком много звонков. Подождите немного.');
            setCallStatus('error');
            return;
        }

        try {
            setCallStatus('calling');
            setCallType(type);
            setError(null);
            setErrorMessage(null);

            // Create call history entry
            const user = await getCurrentUser();
            if (user) {
                const { data: callEntry } = await supabase
                    .from('call_history')
                    .insert({
                        room_id: roomId,
                        caller_id: user.id,
                        call_type: type,
                        status: 'answered',
                        participants: [user.id]
                    })
                    .select()
                    .single();

                if (callEntry) {
                    setCurrentCallId(callEntry.id);
                }
            }

            // Сначала проверяем доступность устройств
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                const hasAudio = devices.some(d => d.kind === 'audioinput');
                const hasVideo = devices.some(d => d.kind === 'videoinput');

                if (!hasAudio) {
                    throw new Error('NoAudioDevice');
                }
                if (type === 'video' && !hasVideo) {
                    throw new Error('NoVideoDevice');
                }
            } catch (enumErr: any) {
                if (enumErr.message === 'NoAudioDevice') {
                    setError('device_not_found');
                    setErrorMessage('Микрофон не найден. Подключите микрофон и попробуйте снова.');
                    setCallStatus('error');
                    return;
                }
                if (enumErr.message === 'NoVideoDevice') {
                    setError('device_not_found');
                    setErrorMessage('Камера не найдена. Подключите камеру и попробуйте снова.');
                    setCallStatus('error');
                    return;
                }
            }

            const constraints: MediaStreamConstraints = {
                audio: true,
                video: type === 'video' ? true : false
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            setLocalStream(stream);

            const pc = await initPeerConnection(stream);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            // user уже получен выше, используем его
            if (channelRef.current && isChannelReady.current && user) {
                await channelRef.current.send({
                    type: 'broadcast',
                    event: 'signal',
                    payload: {
                        type: 'offer',
                        from: user.id,
                        signal: offer,
                        callType: type,
                        callerName: user.email || user.id
                    }
                });
            }
        } catch (err: any) {
            logger.error('Error starting call:', err);

            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                setError('permission_denied');
                setErrorMessage('Доступ к камере/микрофону запрещен. Разрешите доступ в настройках браузера.');
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                setError('device_not_found');
                setErrorMessage('Камера или микрофон не найдены. Проверьте подключение устройств.');
            } else {
                setError('unknown');
                setErrorMessage(`Ошибка: ${err.message}`);
            }

            setCallStatus('error');
        }
    };

    const acceptCall = async () => {
        const offer = (window as any).pendingOffer;
        if (!offer) return;

        try {
            setError(null);
            setErrorMessage(null);

            // Остановить звук звонка
            stopCallNotification();

            const constraints: MediaStreamConstraints = {
                audio: true, // Используем дефолтное устройство
                video: callType === 'video' ? true : false
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            setLocalStream(stream);

            const pc = await initPeerConnection(stream);

            await pc.setRemoteDescription(new RTCSessionDescription(offer));

            // Process queued candidates
            for (const candidate of pendingCandidates.current) {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
            }
            pendingCandidates.current = [];

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            if (channelRef.current && isChannelReady.current) {
                channelRef.current.send({
                    type: 'broadcast',
                    event: 'signal',
                    payload: { type: 'answer', signal: answer }
                });
            }

            setCallStatus('connected');
        } catch (err: any) {
            logger.error('Error accepting call:', err);

            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                setError('permission_denied');
                setErrorMessage('Доступ к камере/микрофону запрещен');
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                setError('device_not_found');
                setErrorMessage('Камера или микрофон не найдены');
            } else {
                setError('unknown');
                setErrorMessage(`Ошибка: ${err.message}`);
            }

            setCallStatus('error');
            // Не вызываем cleanup() чтобы показать ошибку в модалке
        }
    };

    const rejectCall = () => {
        stopCallNotification();
        if (channelRef.current && isChannelReady.current) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'signal',
                payload: { type: 'hangup' }
            });
        }
        cleanup();
    };

    const endCall = () => {
        stopCallNotification();
        if (channelRef.current && isChannelReady.current) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'signal',
                payload: { type: 'hangup' }
            });
        }
        cleanup();
    };

    // Переключение камеры/микрофона во время звонка
    const switchDevice = async (deviceId: string, kind: 'audio' | 'video') => {
        if (!localStream) return;

        try {
            const constraints: MediaStreamConstraints = {
                audio: kind === 'audio' ? { deviceId: { exact: deviceId } } : false,
                video: kind === 'video' ? { deviceId: { exact: deviceId } } : false
            };

            const newStream = await navigator.mediaDevices.getUserMedia(constraints);
            const newTrack = newStream.getTracks()[0];

            if (pcRef.current) {
                const sender = pcRef.current.getSenders().find(s => s.track?.kind === kind);
                if (sender) {
                    await sender.replaceTrack(newTrack);
                }
            }

            // Заменить трек в локальном стриме
            const oldTrack = localStream.getTracks().find(t => t.kind === kind);
            if (oldTrack) {
                oldTrack.stop();
                localStream.removeTrack(oldTrack);
            }
            localStream.addTrack(newTrack);

            if (kind === 'audio') {
                setSelectedAudioDevice(deviceId);
            } else {
                setSelectedVideoDevice(deviceId);
            }
        } catch (err) {
            logger.error('Error switching device:', err);
            setError('device_not_found');
            setErrorMessage('Не удалось переключить устройство');
        }
    };

    // Переключение микрофона/камеры (mute/unmute)
    const toggleAudio = () => {
        if (localStream) {
            const audioTrack = localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
            }
        }
    };

    const toggleVideo = () => {
        if (localStream) {
            const videoTrack = localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
            }
        }
    };

    return {
        callStatus,
        callType,
        localStream,
        remoteStream,
        callerId,
        error,
        errorMessage,
        audioDevices,
        videoDevices,
        selectedAudioDevice,
        selectedVideoDevice,
        startCall,
        acceptCall,
        rejectCall,
        endCall,
        switchDevice,
        toggleAudio,
        toggleVideo,
        loadDevices,
        rateLimitError
    };
}

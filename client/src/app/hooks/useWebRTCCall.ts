import { logger } from '../utils/logger';
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { getCurrentUser, getCurrentUserId } from '../utils/authCache';

interface Participant {
  userId: string;
  username: string;
  stream?: MediaStream;
  connection?: RTCPeerConnection;
}

interface CallSignal {
  type: 'offer' | 'answer' | 'ice-candidate' | 'join' | 'leave';
  from: string;
  to?: string;
  data?: any;
}

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]
};

export function useWebRTCCall(roomId: string) {
  const [participants, setParticipants] = useState<Map<string, Participant>>(new Map());
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [callStatus, setCallStatus] = useState<'idle' | 'connecting' | 'connected'>('idle');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const channelRef = useRef<any>(null);
  const connectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Получить текущего пользователя
  useEffect(() => {
    getCurrentUser().then((user) => {
      if (user) setCurrentUserId(user.id);
    });
  }, []);

  // Создать peer connection
  const createPeerConnection = useCallback((userId: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Добавить локальные треки
    if (localStream) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
    }

    // Обработка входящих треков
    pc.ontrack = (event) => {
      logger.info('📹 Получен трек от', userId);
      setParticipants(prev => {
        const updated = new Map(prev);
        const participant = updated.get(userId) || { userId, username: userId };
        participant.stream = event.streams[0];
        updated.set(userId, participant);
        return updated;
      });
    };

    // Обработка ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'signal',
          payload: {
            type: 'ice-candidate',
            from: currentUserId,
            to: userId,
            data: event.candidate
          }
        });
      }
    };

    // Обработка изменения состояния
    pc.onconnectionstatechange = () => {
      logger.info(`🔗 Состояние соединения с ${userId}:`, pc.connectionState);
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        // Переподключение
        setTimeout(() => {
          if (pc.connectionState === 'failed') {
            pc.restartIce();
          }
        }, 1000);
      }
    };

    connectionsRef.current.set(userId, pc);
    return pc;
  }, [localStream, currentUserId]);

  // Отправить offer
  const sendOffer = useCallback(async (userId: string) => {
    const pc = createPeerConnection(userId);

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      if (channelRef.current) {
        await channelRef.current.send({
          type: 'broadcast',
          event: 'signal',
          payload: {
            type: 'offer',
            from: currentUserId,
            to: userId,
            data: offer
          }
        });
      }
    } catch (err) {
      logger.error('❌ Ошибка создания offer:', err);
    }
  }, [createPeerConnection, currentUserId]);

  // Обработать offer
  const handleOffer = useCallback(async (signal: CallSignal) => {
    if (signal.to !== currentUserId) return;

    const pc = createPeerConnection(signal.from);

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(signal.data));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      if (channelRef.current) {
        await channelRef.current.send({
          type: 'broadcast',
          event: 'signal',
          payload: {
            type: 'answer',
            from: currentUserId,
            to: signal.from,
            data: answer
          }
        });
      }
    } catch (err) {
      logger.error('❌ Ошибка обработки offer:', err);
    }
  }, [createPeerConnection, currentUserId]);

  // Обработать answer
  const handleAnswer = useCallback(async (signal: CallSignal) => {
    if (signal.to !== currentUserId) return;

    const pc = connectionsRef.current.get(signal.from);
    if (pc) {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.data));
      } catch (err) {
        logger.error('❌ Ошибка обработки answer:', err);
      }
    }
  }, [currentUserId]);

  // Обработать ICE candidate
  const handleIceCandidate = useCallback(async (signal: CallSignal) => {
    if (signal.to !== currentUserId) return;

    const pc = connectionsRef.current.get(signal.from);
    if (pc) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(signal.data));
      } catch (err) {
        logger.error('❌ Ошибка добавления ICE candidate:', err);
      }
    }
  }, [currentUserId]);

  // Начать звонок
  const startCall = useCallback(async (enableVideo: boolean = false) => {
    try {
      setCallStatus('connecting');

      // Получить медиа поток
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: enableVideo
      });

      setLocalStream(stream);
      setIsVideoEnabled(enableVideo);
      setCallStatus('connected');

      // Подключиться к каналу
      const channel = supabase.channel(`call:${roomId}`, {
        config: { broadcast: { self: false } }
      });

      channel
        .on('broadcast', { event: 'signal' }, ({ payload }) => {
          const signal = payload as CallSignal;

          switch (signal.type) {
            case 'offer':
              handleOffer(signal);
              break;
            case 'answer':
              handleAnswer(signal);
              break;
            case 'ice-candidate':
              handleIceCandidate(signal);
              break;
            case 'join':
              // Новый участник присоединился - отправить ему offer
              if (signal.from !== currentUserId) {
                sendOffer(signal.from);
              }
              break;
            case 'leave':
              // Участник покинул звонок
              const pc = connectionsRef.current.get(signal.from);
              if (pc) {
                pc.close();
                connectionsRef.current.delete(signal.from);
              }
              setParticipants(prev => {
                const updated = new Map(prev);
                updated.delete(signal.from);
                return updated;
              });
              break;
          }
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            // Объявить о присоединении
            await channel.send({
              type: 'broadcast',
              event: 'signal',
              payload: {
                type: 'join',
                from: currentUserId
              }
            });
          }
        });

      channelRef.current = channel;

      logger.info('✅ Звонок начат');
    } catch (err) {
      logger.error('❌ Ошибка запуска звонка:', err);
      setCallStatus('idle');
      throw err;
    }
  }, [roomId, currentUserId, handleOffer, handleAnswer, handleIceCandidate, sendOffer]);

  // Завершить звонок
  const endCall = useCallback(async () => {
    // Объявить о выходе
    if (channelRef.current && currentUserId) {
      await channelRef.current.send({
        type: 'broadcast',
        event: 'signal',
        payload: {
          type: 'leave',
          from: currentUserId
        }
      });
    }

    // Закрыть все соединения
    connectionsRef.current.forEach(pc => pc.close());
    connectionsRef.current.clear();

    // Остановить локальный поток
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }

    // Отключиться от канала
    if (channelRef.current) {
      await supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    setParticipants(new Map());
    setCallStatus('idle');
    logger.info('✅ Звонок завершён');
  }, [localStream, currentUserId]);

  // Переключить микрофон
  const toggleAudio = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  }, [localStream]);

  // Переключить камеру
  const toggleVideo = useCallback(async () => {
    if (!localStream) return;

    const videoTrack = localStream.getVideoTracks()[0];

    if (videoTrack) {
      // Выключить камеру
      videoTrack.stop();
      localStream.removeTrack(videoTrack);
      setIsVideoEnabled(false);
    } else {
      // Включить камеру
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const newVideoTrack = videoStream.getVideoTracks()[0];
        localStream.addTrack(newVideoTrack);

        // Добавить трек во все соединения
        connectionsRef.current.forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            sender.replaceTrack(newVideoTrack);
          } else {
            pc.addTrack(newVideoTrack, localStream);
          }
        });

        setIsVideoEnabled(true);
      } catch (err) {
        logger.error('❌ Не удалось включить камеру:', err);
      }
    }
  }, [localStream]);

  // Начать запись
  const startRecording = useCallback(async () => {
    if (!localStream) {
      logger.error('❌ Нет локального потока для записи');
      return;
    }

    try {
      // Создать canvas для объединения всех потоков
      const canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Не удалось создать canvas context');
      }

      // Создать видео элементы для всех участников
      const videoElements = new Map<string, HTMLVideoElement>();

      // Локальное видео
      const localVideo = document.createElement('video');
      localVideo.srcObject = localStream;
      localVideo.muted = true;
      await localVideo.play();
      videoElements.set('local', localVideo);

      // Видео удалённых участников
      for (const [userId, participant] of participants.entries()) {
        if (participant.stream) {
          const video = document.createElement('video');
          video.srcObject = participant.stream;
          await video.play();
          videoElements.set(userId, video);
        }
      }

      // Создать аудио контекст для микширования звука
      const audioContext = new AudioContext();
      const audioDestination = audioContext.createMediaStreamDestination();

      // Добавить локальный звук
      const localAudioSource = audioContext.createMediaStreamSource(localStream);
      localAudioSource.connect(audioDestination);

      // Добавить звук удалённых участников
      for (const participant of participants.values()) {
        if (participant.stream) {
          const remoteAudioSource = audioContext.createMediaStreamSource(participant.stream);
          remoteAudioSource.connect(audioDestination);
        }
      }

      // Рисовать кадры на canvas
      const drawFrame = () => {
        if (!isRecording) return;

        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const videos = Array.from(videoElements.values());
        const cols = Math.ceil(Math.sqrt(videos.length));
        const rows = Math.ceil(videos.length / cols);
        const cellWidth = canvas.width / cols;
        const cellHeight = canvas.height / rows;

        videos.forEach((video, index) => {
          const col = index % cols;
          const row = Math.floor(index / cols);
          const x = col * cellWidth;
          const y = row * cellHeight;

          ctx.drawImage(video, x, y, cellWidth, cellHeight);
        });

        requestAnimationFrame(drawFrame);
      };

      drawFrame();

      // Создать поток из canvas и аудио
      const canvasStream = canvas.captureStream(30); // 30 FPS
      const videoTrack = canvasStream.getVideoTracks()[0];
      const audioTrack = audioDestination.stream.getAudioTracks()[0];

      const recordStream = new MediaStream([videoTrack, audioTrack]);

      // Создать MediaRecorder
      const mediaRecorder = new MediaRecorder(recordStream, {
        mimeType: 'video/webm;codecs=vp9,opus',
        videoBitsPerSecond: 2500000 // 2.5 Mbps
      });

      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        await uploadRecording(blob);

        // Очистка
        videoElements.forEach(video => {
          video.pause();
          video.srcObject = null;
        });
        audioContext.close();
      };

      mediaRecorder.start(1000); // Сохранять каждую секунду
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);

      logger.info('✅ Запись начата');
    } catch (err) {
      logger.error('❌ Ошибка начала записи:', err);
    }
  }, [localStream, participants, isRecording]);

  // Остановить запись
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
      setIsRecording(false);
      logger.info('✅ Запись остановлена');
    }
  }, [isRecording]);

  // Загрузить запись в Supabase Storage
  const uploadRecording = async (blob: Blob) => {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `call-recording-${roomId}-${timestamp}.webm`;

      logger.info('⏳ Загрузка записи...', filename);

      const { data, error } = await supabase.storage
        .from('media')
        .upload(`recordings/${filename}`, blob, {
          contentType: 'video/webm',
          cacheControl: '3600'
        });

      if (error) throw error;

      logger.info('✅ Запись загружена:', data.path);

      // Получить публичный URL
      const { data: urlData } = supabase.storage
        .from('media')
        .getPublicUrl(data.path);

      // Сохранить информацию о записи в БД
      await supabase.from('call_recordings').insert({
        room_id: roomId,
        file_url: urlData.publicUrl,
        file_name: filename,
        duration: 0, // Можно вычислить из blob
        created_by: currentUserId,
        created_at: new Date().toISOString()
      });

      logger.info('✅ Запись сохранена в БД');
    } catch (err) {
      logger.error('❌ Ошибка загрузки записи:', err);
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (isRecording) {
        stopRecording();
      }
      if (callStatus !== 'idle') {
        endCall();
      }
    };
  }, []);

  return {
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
  };
}

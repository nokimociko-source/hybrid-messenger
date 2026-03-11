// Универсальная система уведомлений для Web, Electron, Capacitor
import { getToken, onMessage } from 'firebase/messaging';
import { messaging } from '../../firebaseConfig';
import { supabase } from '../../supabaseClient';
import { logger } from './logger';

type Platform = 'web' | 'electron' | 'capacitor';

// Определение платформы (ленивое, безопасное для SSR)
let _platform: Platform | null = null;
function detectPlatform(): Platform {
    if (_platform) return _platform;
    if (typeof window === 'undefined') return 'web';
    if ((window as any).electron) _platform = 'electron';
    else if ((window as any).Capacitor) _platform = 'capacitor';
    else _platform = 'web';
    return _platform;
}

const VAPID_KEY = import.meta.env.VITE_VAPID_KEY;

// Проверка доступности Capacitor плагинов
function hasCapacitorPlugin(name: string): boolean {
    return detectPlatform() === 'capacitor' &&
        (window as any).Capacitor?.Plugins?.[name] !== undefined;
}

// Типы уведомлений
export type NotificationType = 'message' | 'call';

export interface NotificationOptions {
    title: string;
    body: string;
    icon?: string;
    tag?: string;
    data?: any;
    silent?: boolean;
    onClick?: () => void;
}

// Кэш для звуков — клонируем для параллельного воспроизведения
const soundTemplates = new Map<string, HTMLAudioElement>();
const activeCallSounds = new Set<HTMLAudioElement>();
let soundPlaybackBlocked = false;
let soundBlockWarned = false;
const unsupportedSoundUrls = new Set<string>();
const unsupportedSoundWarned = new Set<string>();

function guessAudioMime(url: string): string {
    const u = url.split('?')[0];
    if (u.endsWith('.ogg')) return 'audio/ogg; codecs="vorbis"';
    if (u.endsWith('.mp3')) return 'audio/mpeg';
    if (u.endsWith('.wav')) return 'audio/wav';
    if (u.endsWith('.m4a')) return 'audio/mp4';
    return '';
}

function getSupportedSoundUrl(url: string): string | null {
    if (unsupportedSoundUrls.has(url)) return null;
    if (typeof Audio === 'undefined') return null;

    const testAudio = new Audio();
    const mime = guessAudioMime(url);
    if (mime) {
        const canPlay = testAudio.canPlayType(mime);
        if (!canPlay) {
            const fallback = url.endsWith('.ogg') ? url.replace(/\.ogg(\?.*)?$/, '.mp3$1') : null;
            if (fallback) {
                const fbMime = guessAudioMime(fallback);
                const canPlayFallback = fbMime ? testAudio.canPlayType(fbMime) : '';
                if (canPlayFallback) return fallback;
            }

            unsupportedSoundUrls.add(url);
            return null;
        }
    }

    return url;
}

function createSound(url: string): HTMLAudioElement {
    if (!soundTemplates.has(url)) {
        const audio = new Audio(url);
        audio.preload = 'auto';
        soundTemplates.set(url, audio);
    }
    // Клон позволяет воспроизводить несколько экземпляров одновременно
    return soundTemplates.get(url)!.cloneNode(true) as HTMLAudioElement;
}

// Кэш разрешения — не спрашиваем каждый раз
let _permissionGranted: boolean | null = null;

// Запрос разрешения на уведомления
export async function requestNotificationPermission(): Promise<boolean> {
    // Возвращаем кэш если уже получили разрешение
    if (_permissionGranted === true) return true;

    const platform = detectPlatform();

    if (platform === 'web' || platform === 'electron') {
        if (!('Notification' in window)) return false;

        if (Notification.permission === 'granted') {
            _permissionGranted = true;
            return true;
        }
        if (Notification.permission === 'denied') {
            _permissionGranted = false;
            return false;
        }

        const permission = await Notification.requestPermission();
        _permissionGranted = permission === 'granted';
        return _permissionGranted;
    }

    if (platform === 'capacitor' && hasCapacitorPlugin('LocalNotifications')) {
        try {
            const LocalNotifications = (window as any).Capacitor.Plugins.LocalNotifications;
            const result = await LocalNotifications.requestPermissions();
            _permissionGranted = result.display === 'granted';
            return _permissionGranted;
        } catch {
            _permissionGranted = false;
            return false;
        }
    }

    return false;
}

// Инициализация FCM и регистрация токена
export async function initPushNotifications(userId: string) {
    try {
        const hasPermission = await requestNotificationPermission();
        if (!hasPermission) {
            logger.warn('Notification permission not granted, FCM skipping.');
            return;
        }

        // 1. Получаем токен устройства для FCM
        const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });

        if (currentToken) {
            logger.info('FCM Token received:', currentToken.substring(0, 15) + '...');

            // 2. Сохраняем в Supabase (Upsert)
            const { error } = await supabase.from('fcm_tokens').upsert({
                user_id: userId,
                token: currentToken,
                device_type: detectPlatform()
            }, { onConflict: 'user_id,token' });

            if (error) {
                logger.error('Error saving FCM token:', error.message);
            }
        }

        // 3. Подписываемся на foreground сообщения (когда страница открыта)
        onMessage(messaging, (payload) => {
            logger.debug('Received foreground FCM message:', payload);
            if (payload.notification) {
                // Избегаем двойных уведомлений, если мы уже в активном чате 
                // (можно добавить проверку на текущий roomId)
                showNotification('message', {
                    title: payload.notification.title || 'Catlover Messenger',
                    body: payload.notification.body || 'Новое уведомление'
                });
                playSound('/sound/notification.ogg', false);
            }
        });

    } catch (err) {
        logger.error('Failed to initialize push notifications:', err);
    }
}

// Показать уведомление
export async function showNotification(type: NotificationType, options: NotificationOptions): Promise<void> {
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) return;

    const platform = detectPlatform();

    if (platform === 'web') {
        const notification = new Notification(options.title, {
            body: options.body,
            icon: options.icon || '/favicon.ico',
            tag: options.tag,
            data: options.data,
            silent: options.silent,
        });

        // Обработка клика по уведомлению
        if (options.onClick) {
            notification.onclick = () => {
                window.focus();
                options.onClick!();
                notification.close();
            };
        }
    } else if (platform === 'electron') {
        if ((window as any).electron?.showNotification) {
            (window as any).electron.showNotification({
                title: options.title,
                body: options.body,
                icon: options.icon,
                silent: options.silent,
            });
        }
    } else if (platform === 'capacitor' && hasCapacitorPlugin('LocalNotifications')) {
        try {
            const LocalNotifications = (window as any).Capacitor.Plugins.LocalNotifications;
            await LocalNotifications.schedule({
                notifications: [{
                    id: Date.now(),
                    title: options.title,
                    body: options.body,
                    smallIcon: options.icon,
                    sound: options.silent ? undefined : 'default',
                    extra: options.data,
                }],
            });
        } catch (err) {
            logger.error('Capacitor notification error:', err);
        }
    }
}

// Воспроизвести звук
export function playSound(url: string, loop: boolean = false): HTMLAudioElement | null {
    try {
        const supportedUrl = getSupportedSoundUrl(url);
        if (!supportedUrl) {
            if (!unsupportedSoundWarned.has(url)) {
                unsupportedSoundWarned.add(url);
                logger.warn('Sound format not supported or source missing:', url);
            }
            return null;
        }

        if (soundPlaybackBlocked) {
            if (typeof navigator !== 'undefined' && (navigator as any).userActivation?.hasBeenActive) {
                soundPlaybackBlocked = false;
                soundBlockWarned = false;
            } else {
                return null;
            }
        }

        if (typeof navigator !== 'undefined' && (navigator as any).userActivation && !(navigator as any).userActivation.hasBeenActive) {
            return null;
        }

        // Check sound preferences
        const prefs = getSoundPreferencesFromStorage();

        // Determine if sound should be played based on preferences
        const shouldPlay = url.includes('notification.ogg')
            ? prefs.messageSound !== 'none'
            : url.includes('invite.ogg')
                ? prefs.callSound !== 'none'
                : true;

        if (!shouldPlay) {
            return null;
        }

        const audio = createSound(supportedUrl);
        audio.loop = loop;
        audio.volume = prefs.volume;
        audio.play().catch((err) => {
            const name = (err as any)?.name;
            if (name === 'NotAllowedError') {
                soundPlaybackBlocked = true;
                if (!soundBlockWarned) {
                    soundBlockWarned = true;
                    logger.warn('Sound play blocked (user interaction required).');
                }
                return;
            }
            if (name === 'NotSupportedError') {
                unsupportedSoundUrls.add(url);
                if (!unsupportedSoundWarned.has(url)) {
                    unsupportedSoundWarned.add(url);
                    logger.warn('Sound format not supported or source missing:', url);
                }
                return;
            }
            logger.warn('Sound play error:', err);
        });

        if (loop) {
            activeCallSounds.add(audio);

            // Автоочистка при завершении (на случай если loop сняли программно)
            audio.addEventListener('ended', () => {
                activeCallSounds.delete(audio);
            }, { once: true });
        }

        return audio;
    } catch (err) {
        logger.error('Sound error:', err);
        return null;
    }
}

// Helper to get sound preferences from localStorage
function getSoundPreferencesFromStorage() {
    const STORAGE_KEY = 'sound_preferences';
    const defaultPrefs = {
        messageSound: 'message' as const,
        callSound: 'call' as const,
        volume: 0.7,
    };

    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return { ...defaultPrefs, ...JSON.parse(stored) };
        }
    } catch {
        // Ignore parse errors
    }

    return defaultPrefs;
}

// Остановить все звуки звонков
export function stopCallSounds(): void {
    activeCallSounds.forEach(audio => {
        audio.loop = false;
        audio.pause();
        audio.currentTime = 0;
        audio.src = ''; // Освобождаем ресурс
    });
    activeCallSounds.clear();
}

// Вибрация (только для мобильных)
export async function vibrate(pattern: number | number[]): Promise<void> {
    const platform = detectPlatform();

    if (platform === 'capacitor' && hasCapacitorPlugin('Haptics')) {
        try {
            const Haptics = (window as any).Capacitor.Plugins.Haptics;
            const ImpactStyle = { Heavy: 'HEAVY', Medium: 'MEDIUM', Light: 'LIGHT' };

            if (Array.isArray(pattern)) {
                for (let i = 0; i < pattern.length; i++) {
                    if (pattern[i] <= 0) continue;
                    if (i % 2 === 0) {
                        // Чётный индекс = вибрация
                        await Haptics.impact({ style: ImpactStyle.Heavy });
                    }
                    // Пауза между шагами
                    await new Promise(resolve => setTimeout(resolve, pattern[i]));
                }
            } else {
                await Haptics.impact({ style: ImpactStyle.Heavy });
            }
        } catch (err) {
            logger.error('Haptics error:', err);
        }
    } else if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
            if ((navigator as any).userActivation && !(navigator as any).userActivation.hasBeenActive) {
                return;
            }
            navigator.vibrate(pattern);
        } catch (e) {
            logger.debug('Vibration API not available', e);
        }
    }
}

// Уведомление о входящем звонке
export async function notifyIncomingCall(
    callerName: string,
    isVideo: boolean,
    onClick?: () => void
): Promise<void> {
    await showNotification('call', {
        title: `Входящий ${isVideo ? 'видео' : 'аудио'} звонок`,
        body: `${callerName} звонит вам`,
        icon: '/favicon.ico',
        tag: 'incoming-call',
        data: { type: 'call', callerName, isVideo },
        onClick,
    });

    // Звук звонка (зацикленный)
    playSound('/sound/invite.ogg', true);

    // Вибрация для мобильных (вибрация-пауза-вибрация...)
    if (detectPlatform() === 'capacitor') {
        vibrate([500, 200, 500, 200, 500]);
    }
}

// Остановить уведомление о звонке
export function stopCallNotification(): void {
    stopCallSounds();

    // Остановить вибрацию на Web
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
            if ((navigator as any).userActivation && !(navigator as any).userActivation.hasBeenActive) {
                return;
            }
            navigator.vibrate(0);
        } catch (e) {
            logger.debug('Vibration API not available', e);
        }
    }
}

// Уведомление о новом сообщении
export async function notifyNewMessage(
    senderName: string,
    messageText: string,
    roomId: string,
    onClick?: () => void
): Promise<void> {
    // Не уведомляем если вкладка активна
    if (typeof document !== 'undefined' && document.hasFocus()) return;

    await showNotification('message', {
        title: senderName,
        body: messageText || '📎 Медиа',
        icon: '/favicon.ico',
        tag: `message-${roomId}`,
        data: { type: 'message', roomId },
        onClick,
    });

    playSound('/sound/notification.ogg', false);

    if (detectPlatform() === 'capacitor') {
        vibrate(200);
    }
}

// Проверка, есть ли разрешение (синхронная)
export function hasNotificationPermission(): boolean {
    if (_permissionGranted !== null) return _permissionGranted;

    const platform = detectPlatform();
    if (platform === 'web' || platform === 'electron') {
        return 'Notification' in window && Notification.permission === 'granted';
    }
    return false;
}

// Очистка всех ресурсов (вызвать при logout / unmount приложения)
export function disposeNotifications(): void {
    stopCallSounds();
    soundTemplates.forEach(audio => {
        audio.src = '';
    });
    soundTemplates.clear();
    _permissionGranted = null;

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
            if ((navigator as any).userActivation && !(navigator as any).userActivation.hasBeenActive) {
                return;
            }
            navigator.vibrate(0);
        } catch (e) {
            logger.debug('Vibration API not available', e);
        }
    }
}

# Система уведомлений

## Обзор

Универсальная система уведомлений для трех платформ:
- **Web** (браузер) - Web Notifications API
- **Electron** (десктоп) - Native notifications через IPC
- **Capacitor** (мобильные) - LocalNotifications + Haptics

## Текущий статус

✅ **Реализовано:**
- Универсальный API в `platformNotifications.ts`
- Автоопределение платформы
- Уведомления о входящих звонках (звук + вибрация)
- Уведомления о новых сообщениях
- Интеграция в `useSupabaseCall` хук
- Интеграция в `useSupabaseMessages` хук
- IPC handlers в Electron (main.cjs + preload.cjs)
- Запрос разрешений при запуске приложения

⚠️ **Требуется для мобильной версии:**
```bash
npm install @capacitor/local-notifications @capacitor/haptics
```

## Использование

### Автоматические уведомления

Уведомления работают автоматически:

1. **Входящий звонок** - звук `/sound/invite.ogg` зацикливается + вибрация
2. **Новое сообщение** - звук `/sound/notification.ogg` один раз + короткая вибрация

### Ручное использование

```typescript
import { 
    notifyIncomingCall, 
    notifyNewMessage, 
    stopCallNotification,
    requestNotificationPermission 
} from '../utils/platformNotifications';

// Запросить разрешение
await requestNotificationPermission();

// Уведомление о звонке
await notifyIncomingCall('Иван Иванов', true); // true = видео

// Остановить звук звонка
stopCallNotification();

// Уведомление о сообщении
await notifyNewMessage('Иван Иванов', 'Привет!', 'room-id-123');
```

## Платформы

### Web (браузер)
- Использует `Notification` API
- Требует разрешение пользователя
- Звуки через `<audio>` элементы
- Вибрация через `navigator.vibrate()`

### Electron (десктоп)
- Native notifications через `electron.Notification`
- IPC коммуникация: renderer → main process
- Не требует разрешения (системные уведомления)
- Звуки воспроизводятся в renderer process

### Capacitor (мобильные)
- `@capacitor/local-notifications` для уведомлений
- `@capacitor/haptics` для вибрации
- Требует разрешения в манифесте
- Поддержка iOS и Android

## Файлы

- `src/app/utils/platformNotifications.ts` - основной API
- `electron/main.cjs` - IPC handler для Electron
- `electron/preload.cjs` - bridge для IPC
- `src/app/hooks/useSupabaseCall.ts` - интеграция звонков
- `src/app/hooks/useSupabaseChat.ts` - интеграция сообщений
- `src/app/pages/App.tsx` - запрос разрешений

## Звуки

Звуки должны быть в `public/sound/`:
- `invite.ogg` - входящий звонок (зацикленный)
- `notification.ogg` - новое сообщение (один раз)

## Тестирование

### Web
1. Открыть в браузере
2. Разрешить уведомления
3. Отправить сообщение из другого аккаунта
4. Позвонить из другого аккаунта

### Electron
1. Запустить `npm run electron:dev`
2. Уведомления появятся как системные

### Capacitor (будущее)
1. Установить пакеты: `npm install @capacitor/local-notifications @capacitor/haptics`
2. Добавить в `capacitor.config.ts`
3. Собрать: `npx cap sync`
4. Запустить на устройстве

## Особенности

- **Кэширование звуков** - звуки загружаются один раз и переиспользуются
- **Автоостановка** - звук звонка останавливается при принятии/отклонении
- **Умная вибрация** - только на мобильных устройствах
- **Graceful degradation** - если платформа не поддерживает, просто не показывает уведомление

## Roadmap

- [ ] Установить Capacitor пакеты для мобильной версии
- [ ] Добавить настройки уведомлений (вкл/выкл звук, вибрацию)
- [ ] Кастомные звуки для разных типов уведомлений
- [ ] Badge count для непрочитанных сообщений
- [ ] Rich notifications с кнопками действий

# Интеграция системы жалоб в UI

## Быстрый старт

### 1. Добавить кнопку жалобы в профиль пользователя

Файл: `hybrid_messenger/client/src/app/components/UserProfileModal.tsx`

```typescript
import { ReportModal } from './ReportModal';

// В компоненте добавить state:
const [reportModalOpen, setReportModalOpen] = useState(false);

// В JSX добавить кнопку:
<button 
  onClick={() => setReportModalOpen(true)}
  style={{ 
    padding: '8px 16px', 
    background: 'rgba(255,60,60,0.2)', 
    color: '#ff4d4d', 
    border: 'none', 
    borderRadius: '6px', 
    cursor: 'pointer',
    fontSize: '13px'
  }}
>
  🚩 Пожаловаться
</button>

// И добавить модальное окно:
<ReportModal 
  isOpen={reportModalOpen}
  onClose={() => setReportModalOpen(false)}
  reportType="user"
  targetId={userId}
  targetName={userName}
/>
```

### 2. Добавить кнопку жалобы в контекстное меню сообщений

Файл: `hybrid_messenger/client/src/app/pages/client/CatloverRoomView.tsx`

В контекстном меню сообщения добавить:

```typescript
import { ReportModal } from '../../components/ReportModal';

// В компоненте добавить state:
const [reportModalOpen, setReportModalOpen] = useState(false);
const [reportingMessage, setReportingMessage] = useState<any>(null);

// В контекстном меню добавить опцию:
{
  label: '🚩 Пожаловаться',
  onClick: () => {
    setReportingMessage(message);
    setReportModalOpen(true);
  }
}

// И добавить модальное окно:
<ReportModal 
  isOpen={reportModalOpen}
  onClose={() => {
    setReportModalOpen(false);
    setReportingMessage(null);
  }}
  reportType="message"
  targetId={reportingMessage?.id}
  targetName={`Сообщение от ${reportingMessage?.user?.username}`}
/>
```

### 3. Добавить кнопку жалобы в настройки комнаты

Файл: `hybrid_messenger/client/src/app/components/ChannelSettingsModal.tsx` или `GroupSettingsModal.tsx`

```typescript
import { ReportModal } from './ReportModal';

// В компоненте добавить state:
const [reportModalOpen, setReportModalOpen] = useState(false);

// В JSX добавить кнопку (обычно в "Опасной зоне"):
<button 
  onClick={() => setReportModalOpen(true)}
  style={{ 
    padding: '12px 16px', 
    background: 'rgba(255,60,60,0.1)', 
    border: '1px solid rgba(255,60,60,0.3)', 
    borderRadius: '8px', 
    color: '#ff4d4d', 
    cursor: 'pointer',
    fontSize: '14px'
  }}
>
  🚩 Пожаловаться на комнату
</button>

// И добавить модальное окно:
<ReportModal 
  isOpen={reportModalOpen}
  onClose={() => setReportModalOpen(false)}
  reportType="room"
  targetId={roomId}
  targetName={roomName}
/>
```

## Проверка работоспособности

1. ✅ Откройте профиль пользователя
2. ✅ Нажмите кнопку "🚩 Пожаловаться"
3. ✅ Выберите причину жалобы
4. ✅ Добавьте описание (опционально)
5. ✅ Нажмите "Отправить"
6. ✅ Откройте админ-панель (Settings → Admin Panel)
7. ✅ Перейдите на вкладку "Жалобы"
8. ✅ Проверьте, что жалоба появилась в списке

## Структура жалобы

```typescript
interface Report {
  id: UUID;
  reporter_id: UUID;           // Кто пожаловался
  reported_user_id?: UUID;     // На кого жалоба (если на пользователя)
  reported_message_id?: UUID;  // На какое сообщение (если на сообщение)
  reported_room_id?: UUID;     // На какую комнату (если на комнату)
  reason: string;              // Причина жалобы
  description?: string;        // Описание
  status: 'open' | 'reviewing' | 'resolved' | 'rejected';
  created_at: timestamp;
  updated_at: timestamp;
  admin_notes?: string;        // Заметки администратора
}
```

## Типы жалоб и причины

### На пользователя
- Спам
- Оскорбления
- Угрозы
- Мошенничество
- Порнография
- Другое

### На сообщение
- Спам
- Оскорбления
- Угрозы
- Порнография
- Нарушение авторских прав
- Другое

### На комнату
- Спам
- Оскорбления
- Порнография
- Мошенничество
- Нарушение правил
- Другое

## Статусы жалоб

- **Открыта** (open) - новая жалоба, требует рассмотрения
- **На рассмотрении** (reviewing) - администратор рассматривает жалобу
- **Решена** (resolved) - жалоба рассмотрена и приняты меры
- **Отклонена** (rejected) - жалоба отклонена как необоснованная

## Примечания

- Жалобы могут отправлять только авторизованные пользователи
- Каждый пользователь может отправить несколько жалоб
- Администраторы могут просматривать и управлять всеми жалобами
- Описание жалобы ограничено 500 символами
- Все жалобы сохраняются в базе данных для аудита

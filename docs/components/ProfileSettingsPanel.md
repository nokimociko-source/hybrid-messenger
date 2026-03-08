# ProfileSettingsPanel - Боковая панель настроек профиля

Компонент боковой панели для настройки профиля пользователя в стиле Telegram/Discord.

## Описание

Это боковая панель шириной 360px, которая открывается слева и содержит:
- Аватар пользователя с возможностью изменения
- Имя пользователя и статус "online"
- Поле "О себе" (About)
- Переключатель темы оформления
- Кнопку выхода из аккаунта

## Использование

```tsx
import { ProfileSettingsPanel } from './ProfileSettingsPanel';

function MyComponent() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <button onClick={() => setIsOpen(true)}>
                Открыть профиль
            </button>

            {isOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, zIndex: 1000 }}>
                    <ProfileSettingsPanel onClose={() => setIsOpen(false)} />
                </div>
            )}
        </>
    );
}
```

## Интеграция в CatloverChatList

Кнопка профиля добавлена в верхнюю панель списка чатов:

```tsx
// В CatloverChatList.tsx
<button
    onClick={() => setIsProfileSettingsOpen(true)}
    style={{ /* стили */ }}
    title="Профиль"
>
    <Icon size="200" src={Icons.User} />
</button>
```

## Функциональность

### 1. Загрузка и изменение аватара
- Клик по аватару открывает выбор файла
- Автоматическая обрезка изображения через ImageCropper
- Загрузка в Supabase Storage
- Обновление URL в базе данных

### 2. Редактирование профиля
- **Имя пользователя**: Обязательное поле
- **О себе**: До 200 символов, опционально
- Автоматическое сохранение в Supabase

### 3. Переключение темы
- Темная/Светлая тема
- Сохранение в localStorage
- Применение к document.documentElement

### 4. Выход из аккаунта
- Подтверждение через confirm()
- Вызов supabase.auth.signOut()
- Перезагрузка страницы

## Дизайн

### Размеры
- Ширина: 360px
- Высота: 100vh (на весь экран)
- Позиция: fixed, слева

### Цветовая схема
- Фон: #0d0d0d
- Акцент: #00f2ff (cyan)
- Текст: #fff
- Вторичный текст: rgba(255, 255, 255, 0.5)

### Элементы
- Аватар: 120x120px, круглый
- Кнопка камеры: 36x36px, справа внизу аватара
- Toggle переключатель: 48x28px
- Кнопки: 14px padding, 12px border-radius

## Состояния

```tsx
const [loading, setLoading] = useState(true);        // Загрузка данных
const [saving, setSaving] = useState(false);         // Сохранение изменений
const [username, setUsername] = useState('');        // Имя пользователя
const [about, setAbout] = useState('');              // О себе
const [avatarUrl, setAvatarUrl] = useState(null);    // URL аватара
const [avatarFile, setAvatarFile] = useState(null);  // Файл для загрузки
const [showCropper, setShowCropper] = useState(false); // Показать cropper
const [isDarkTheme, setIsDarkTheme] = useState(true); // Темная тема
```

## API интеграция

### Загрузка профиля
```tsx
const { data } = await supabase
    .from('users')
    .select('username, about, avatar_url, status')
    .eq('id', user.id)
    .single();
```

### Сохранение профиля
```tsx
await supabase
    .from('users')
    .update({
        username: username.trim(),
        about: about.trim() || null,
        avatar_url: newAvatarUrl,
    })
    .eq('id', user.id);
```

### Загрузка аватара
```tsx
await supabase.storage
    .from('media')
    .upload(filePath, avatarFile);

const { data } = supabase.storage
    .from('media')
    .getPublicUrl(filePath);
```

## Структура

```
ProfileSettingsPanel
├── Header
│   ├── Back Button (←)
│   └── Title ("Настройки профиля")
├── Content (Scrollable)
│   ├── Avatar Section
│   │   ├── Avatar (120x120)
│   │   ├── Camera Button
│   │   ├── Username
│   │   └── Status ("online")
│   ├── About Section
│   │   ├── Label ("ОБО МНЕ")
│   │   └── Textarea (200 chars max)
│   ├── Theme Section
│   │   ├── Label ("ТЕМА ОФОРМЛЕНИЯ")
│   │   └── Toggle Switch
│   └── Save Button (conditional)
└── Footer
    └── Logout Button
```

## Особенности

### Адаптивность
- Фиксированная ширина 360px
- Полная высота экрана
- Скроллируемый контент

### Анимации
- Hover эффекты на кнопках
- Плавные переходы (0.2s)
- Opacity изменение на аватаре

### Валидация
- Имя пользователя не может быть пустым
- About ограничен 200 символами
- Подтверждение выхода

### Оптимизация
- Lazy loading аватара
- Debounce для сохранения
- Минимальные перерисовки

## Зависимости

```tsx
import { Icon, Icons, Scroll, Spinner } from 'folds';
import { supabase } from '../../supabaseClient';
import { ImageCropper } from './ImageCropper';
```

## Стили

Используются inline стили для максимальной гибкости и изоляции компонента.

Основные цвета:
- Primary: #00f2ff
- Background: #0d0d0d
- Border: rgba(255, 255, 255, 0.1)
- Error: #ff4d4d

## Примеры использования

### Открытие из списка чатов
```tsx
// В CatloverChatList.tsx
const [isProfileSettingsOpen, setIsProfileSettingsOpen] = useState(false);

{isProfileSettingsOpen && (
    <div style={{ position: 'fixed', top: 0, left: 0, zIndex: 1000 }}>
        <ProfileSettingsPanel onClose={() => setIsProfileSettingsOpen(false)} />
    </div>
)}
```

### Открытие из меню
```tsx
<MenuItem onClick={() => setIsProfileSettingsOpen(true)}>
    <Icon src={Icons.User} />
    Профиль
</MenuItem>
```

## Будущие улучшения

- [ ] Добавить больше настроек (язык, уведомления)
- [ ] Анимация открытия/закрытия
- [ ] Поддержка жестов (swipe to close)
- [ ] Кастомные статусы
- [ ] История изменений профиля
- [ ] Предпросмотр темы
- [ ] Экспорт/импорт настроек

## Связанные компоненты

- `ImageCropper` - обрезка аватара
- `SettingsModal` - полные настройки приложения
- `CatloverChatList` - список чатов с кнопкой профиля
- `UserProfileModal` - просмотр профиля других пользователей

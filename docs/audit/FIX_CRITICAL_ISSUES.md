# 🔧 Инструкция по исправлению критических проблем

Этот документ содержит пошаговые инструкции для исправления всех критических проблем, найденных в аудите.

---

## 📋 Чеклист исправлений

- [ ] 1. Исправить TypeScript ошибки импортов
- [ ] 2. Добавить валидацию файлов
- [ ] 3. Исправить IP-адрес в rate limiting
- [ ] 4. Добавить sanitization HTML
- [ ] 5. Заменить console.log на logger
- [ ] 6. Убрать `any` типы
- [ ] 7. Добавить мемоизацию
- [ ] 8. Оптимизировать запросы к БД

---

## 1. Исправление TypeScript ошибок импортов

### Проблема
Matrix SDK изменил экспорты, нужно обновить все импорты.

### Решение

**Вариант A: Обновить версию matrix-js-sdk**
```bash
cd hybrid_messenger/client
npm install matrix-js-sdk@latest
```

**Вариант B: Исправить импорты вручную**

Создайте файл `src/app/utils/matrixImports.ts`:

```typescript
// Centralized Matrix SDK imports
// This file handles version-specific import differences

import * as sdk from 'matrix-js-sdk';

// Re-export commonly used types and classes
export const MatrixClient = sdk.MatrixClient || (sdk as any).default?.MatrixClient;
export const MatrixError = sdk.MatrixError || (sdk as any).default?.MatrixError;
export const Room = sdk.Room || (sdk as any).default?.Room;
export const RoomMember = sdk.RoomMember || (sdk as any).default?.RoomMember;
export const MatrixEvent = sdk.MatrixEvent || (sdk as any).default?.MatrixEvent;

// Add other exports as needed
export type { 
  IAuthData,
  AuthDict,
  UIAFlow,
  AuthType,
} from 'matrix-js-sdk';

export default sdk;
```

Затем замените все импорты:

```typescript
// ❌ СТАРЫЙ КОД
import { MatrixClient, Room } from 'matrix-js-sdk';

// ✅ НОВЫЙ КОД
import { MatrixClient, Room } from '../utils/matrixImports';
```

---

## 2. Добавление валидации файлов

### Шаг 1: Обновить `useSupabaseChat.ts`

Найдите функцию `uploadMediaFile` и замените её:

```typescript
import { validateFile } from '../utils/fileValidation';
import { logger } from '../utils/logger';

async function uploadMediaFile(file: File): Promise<string | null> {
    // Validate file before upload
    const validation = validateFile(file);
    
    if (!validation.valid) {
        logger.error('File validation failed', { 
            fileName: file.name, 
            error: validation.error 
        });
        throw new Error(validation.error);
    }

    let fileExt = file.name ? file.name.split('.').pop() : '';
    if (!fileExt && file.type) {
        fileExt = file.type.split('/')[1]?.split(';')[0] || 'webm';
    }
    
    const safeName = file.name ? file.name.replace(/[^a-zA-Z0-9._-]/g, '_') : `file_${Math.random().toString(36).slice(2)}`;
    const filePath = `${Date.now()}_${safeName}`;

    const { error } = await supabase.storage.from('media').upload(filePath, file, {
        contentType: file.type || 'application/octet-stream',
    });

    if (error) {
        logger.error('Error uploading media', { error: error.message, fileName: file.name });
        return null;
    }

    const { data } = supabase.storage.from('media').getPublicUrl(filePath);
    logger.info('File uploaded successfully', { fileName: file.name, url: data.publicUrl });
    return data.publicUrl;
}
```

### Шаг 2: Обновить UI для показа ошибок валидации

В компонентах, где происходит загрузка файлов, добавьте обработку ошибок:

```typescript
const handleFileUpload = async (file: File) => {
    try {
        const url = await uploadMedia(file);
        if (url) {
            // Success
        }
    } catch (error) {
        // Show error to user
        alert(error instanceof Error ? error.message : 'Ошибка загрузки файла');
    }
};
```

---

## 3. Исправление IP-адреса в rate limiting

### Шаг 1: Деплой Edge Function

```bash
cd hybrid_messenger
supabase functions deploy get-client-ip
```

### Шаг 2: Обновить `useRateLimit.ts`

Замените строку с `ipAddress`:

```typescript
import { getClientIP } from '../utils/ipAddress';

// В функции checkRateLimit:
const ipAddress = await getClientIP();
```

### Шаг 3: Тестирование

```typescript
// Добавьте в консоль для проверки
import { getClientIP } from './app/utils/ipAddress';

getClientIP().then(ip => console.log('Your IP:', ip));
```

---

## 4. Добавление sanitization HTML

### Шаг 1: Создать утилиту sanitization

```typescript
// src/app/utils/sanitizeContent.ts
import sanitizeHtml from 'sanitize-html';

export function sanitizeMessageContent(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      'b', 'i', 'em', 'strong', 'a', 'code', 'pre', 
      'br', 'p', 'ul', 'ol', 'li', 'blockquote'
    ],
    allowedAttributes: {
      'a': ['href', 'title'],
      'code': ['class'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: {
      'a': (tagName, attribs) => {
        return {
          tagName: 'a',
          attribs: {
            ...attribs,
            target: '_blank',
            rel: 'noopener noreferrer',
          },
        };
      },
    },
  });
}
```

### Шаг 2: Использовать в компонентах

```typescript
import { sanitizeMessageContent } from '../utils/sanitizeContent';

// В компоненте сообщения:
<div dangerouslySetInnerHTML={{ 
    __html: sanitizeMessageContent(msg.content) 
}} />
```

---

## 5. Замена console.log на logger

### Автоматическая замена (рекомендуется)

Создайте скрипт `scripts/replace-console.js`:

```javascript
const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Replace console.error
  if (content.includes('console.error')) {
    content = content.replace(/console\.error\(/g, 'logger.error(');
    modified = true;
  }

  // Replace console.warn
  if (content.includes('console.warn')) {
    content = content.replace(/console\.warn\(/g, 'logger.warn(');
    modified = true;
  }

  // Replace console.log (only in non-test files)
  if (!filePath.includes('.test.') && content.includes('console.log')) {
    content = content.replace(/console\.log\(/g, 'logger.info(');
    modified = true;
  }

  if (modified) {
    // Add import if not present
    if (!content.includes("from './utils/logger'") && 
        !content.includes("from '../utils/logger'")) {
      const importStatement = "import { logger } from '../utils/logger';\n";
      content = importStatement + content;
    }

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Updated: ${filePath}`);
  }
}

// Run on all TypeScript files
const srcDir = path.join(__dirname, '../src');
// ... implement directory traversal
```

Запустите:
```bash
node scripts/replace-console.js
```

---

## 6. Убрать `any` типы

### Создать типы для Capacitor

```typescript
// src/app/types/capacitor.d.ts
declare global {
  interface Window {
    Capacitor?: {
      Plugins: {
        LocalNotifications: {
          requestPermissions(): Promise<{ display: string }>;
          schedule(options: any): Promise<void>;
        };
        Haptics: {
          impact(options: { style: string }): Promise<void>;
          vibrate(): Promise<void>;
        };
      };
      getPlatform(): string;
    };
    electron?: {
      showNotification(options: {
        title: string;
        body: string;
        icon?: string;
      }): void;
    };
  }
}

export {};
```

### Заменить `any` на правильные типы

```typescript
// ❌ СТАРЫЙ КОД
const LocalNotifications = (window as any).Capacitor.Plugins.LocalNotifications;

// ✅ НОВЫЙ КОД
const LocalNotifications = window.Capacitor?.Plugins.LocalNotifications;
```

---

## 7. Добавление мемоизации

### В `CatloverRoomView.tsx`

```typescript
import { useMemo } from 'react';

// Внутри компонента:
const filteredMessages = useMemo(() => {
    return messages.filter((msg) => {
        // Если это не альбом, показываем
        if (!msg.media_group_id) return true;
        
        // Если это первое сообщение альбома, показываем
        if (msg.media_order === 0) return true;
        
        // Остальные сообщения альбома скрываем
        return false;
    });
}, [messages]);

// Используйте filteredMessages вместо messages.filter(...)
```

---

## 8. Оптимизация запросов к БД

### Создать SQL функцию

```sql
-- В Supabase SQL Editor
CREATE OR REPLACE FUNCTION get_rooms_with_last_message(p_user_id UUID)
RETURNS TABLE (
    room_id UUID,
    room_name TEXT,
    room_type TEXT,
    room_avatar_url TEXT,
    last_message_content TEXT,
    last_message_at TIMESTAMPTZ,
    last_message_user_id UUID,
    last_message_read BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT ON (r.id)
        r.id,
        r.name,
        r.type,
        r.avatar_url,
        m.content,
        m.created_at,
        m.user_id,
        (p_user_id = ANY(m.read_by)) as is_read
    FROM rooms r
    LEFT JOIN messages m ON m.room_id = r.id
    WHERE r.id IN (
        SELECT room_id FROM room_members WHERE user_members.user_id = p_user_id
    )
    ORDER BY r.id, m.created_at DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Использовать в хуке

```typescript
// В useSupabaseRooms:
const { data, error } = await supabase.rpc('get_rooms_with_last_message', {
    p_user_id: currentUserId
});
```

---

## ✅ Проверка после исправлений

Запустите следующие команды для проверки:

```bash
# 1. TypeScript проверка
npm run typecheck

# 2. ESLint проверка
npm run lint

# 3. Prettier проверка
npm run check:prettier

# 4. Запуск тестов
npm test

# 5. Сборка проекта
npm run build
```

Все команды должны завершиться без ошибок!

---

## 📞 Поддержка

Если возникли проблемы при исправлении:
1. Проверьте логи в консоли браузера
2. Проверьте логи Supabase
3. Создайте Issue в репозитории с описанием проблемы

---

**Удачи с исправлениями! 🚀**

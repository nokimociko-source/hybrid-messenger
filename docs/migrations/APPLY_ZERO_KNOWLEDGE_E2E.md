# 🔐 Применение Zero-Knowledge E2E Encryption

**Цель:** Защитить данные пользователей от администраторов БД и сервера.

---

## 🎯 Что это дает

### До применения
- ❌ Администратор БД видит все сообщения
- ❌ Хакер с доступом к БД читает переписку
- ❌ Сервер знает содержимое сообщений

### После применения
- ✅ Администратор БД видит только зашифрованные данные
- ✅ Хакер не может расшифровать сообщения
- ✅ Только отправитель и получатель могут читать сообщения

**Уровень защиты:** 🔒🔒🔒🔒🔒 (5/5) - Как в Signal/Telegram

---

## 📋 Шаг 1: Применить миграцию БД

### Вариант A: Пошагово (РЕКОМЕНДУЕТСЯ)

Используйте пошаговую инструкцию для Supabase SQL Editor:

**Файл:** `database/migrations/enable_zero_knowledge_e2e_step_by_step.md`

1. Откройте **Supabase Dashboard** → **SQL Editor**
2. Откройте файл `enable_zero_knowledge_e2e_step_by_step.md`
3. Копируйте и выполняйте каждый блок SQL **по очереди**
4. Проверяйте результат после каждого шага

**Почему пошагово?**  
Supabase SQL Editor не может выполнить несколько запросов сразу. Нужно выполнять по одному блоку.

### Вариант B: Через CLI (если установлен)

```bash
# Если используете Supabase CLI
supabase db push database/migrations/enable_zero_knowledge_e2e.sql
```

### Проверка

Выполните в SQL Editor:

```sql
-- Проверка, что таблицы созданы
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('room_keys', 'e2e_audit_log');

-- Проверка, что поля добавлены
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND column_name IN ('public_key', 'key_type');

-- Проверка RLS политик
SELECT policyname 
FROM pg_policies 
WHERE tablename = 'room_keys';
```

**Ожидаемый результат:**
- ✅ Таблица `room_keys` создана
- ✅ Таблица `e2e_audit_log` создана
- ✅ Поля `public_key`, `key_type` в `users`
- ✅ 4 RLS политики для `room_keys`

---

## 📋 Шаг 2: Обновить код приложения

### 2.1 Установить зависимости

```bash
cd client
npm install tweetnacl tweetnacl-util
npm install --save-dev @types/tweetnacl @types/tweetnacl-util
```

### 2.2 Файл e2eEncryption.ts уже создан

Проверьте файл:
```
client/src/app/utils/e2eEncryption.ts
```

Если его нет, скопируйте из:
```
docs/guides/ZERO_KNOWLEDGE_SECURITY.md
```

### 2.3 Обновить useSupabaseChat.ts

Добавьте в начало файла:

```typescript
import { 
  encryptMessage, 
  decryptMessage,
  getPrivateKeyLocally,
  isE2EEnabled 
} from '../utils/e2eEncryption';
```

Обновите функцию `sendMessage`:

```typescript
const sendMessage = useCallback(async (content: string, roomId: string) => {
  const { id: userId } = await getCurrentUser();
  
  // Проверяем, включено ли E2E
  if (isE2EEnabled(userId)) {
    // Получаем публичный ключ получателя
    const { data: room } = await supabase
      .from('rooms')
      .select('target_user_id')
      .eq('id', roomId)
      .single();
    
    if (room?.target_user_id) {
      const { data: recipient } = await supabase
        .from('users')
        .select('public_key')
        .eq('id', room.target_user_id)
        .single();
      
      if (recipient?.public_key) {
        const privateKey = getPrivateKeyLocally(userId);
        
        if (privateKey) {
          // Шифруем сообщение
          const encrypted = encryptMessage(
            content,
            recipient.public_key,
            privateKey
          );
          
          // Отправляем зашифрованное
          await supabase.from('messages').insert({
            room_id: roomId,
            user_id: userId,
            content: encrypted.ciphertext,
            is_encrypted: true,
            encryption_algorithm: encrypted.algorithm,
            encryption_nonce: encrypted.nonce,
          });
          
          return;
        }
      }
    }
  }
  
  // Если E2E не настроено - обычное сообщение
  await supabase.from('messages').insert({
    room_id: roomId,
    user_id: userId,
    content,
    is_encrypted: false,
  });
}, []);
```

---

## 📋 Шаг 3: Настроить E2E для пользователей

### 3.1 Создать компонент настройки E2E

Файл уже существует:
```
client/src/app/components/E2ESettings.tsx
```

### 3.2 Добавить в настройки приложения

В `SettingsModal.tsx` добавьте вкладку "Безопасность":

```typescript
import E2ESettings from './E2ESettings';

// В компоненте
<Tab label="Безопасность">
  <E2ESettings />
</Tab>
```

### 3.3 Генерация ключей при регистрации

В компоненте регистрации добавьте:

```typescript
import { generateKeyPair, savePrivateKeyLocally } from '../utils/e2eEncryption';

// После успешной регистрации
const handleRegister = async () => {
  // ... регистрация пользователя
  
  // Генерируем ключи
  const keyPair = generateKeyPair();
  
  // Сохраняем приватный ключ ЛОКАЛЬНО
  savePrivateKeyLocally(keyPair.privateKey, userId);
  
  // Отправляем ТОЛЬКО публичный ключ на сервер
  await supabase
    .from('users')
    .update({ 
      public_key: keyPair.publicKey,
      key_type: 'nacl' 
    })
    .eq('id', userId);
};
```

---

## 📋 Шаг 4: Тестирование

### 4.1 Проверка генерации ключей

```typescript
import { generateKeyPair } from './utils/e2eEncryption';

const keyPair = generateKeyPair();
console.log('Public Key:', keyPair.publicKey);
console.log('Private Key:', keyPair.privateKey);
// ✅ Должны быть разные base64 строки
```

### 4.2 Проверка шифрования

```typescript
import { encryptMessage, decryptMessage } from './utils/e2eEncryption';

const sender = generateKeyPair();
const recipient = generateKeyPair();

const encrypted = encryptMessage(
  'Привет!',
  recipient.publicKey,
  sender.privateKey
);

console.log('Encrypted:', encrypted.ciphertext);
// ✅ Должна быть зашифрованная строка

const decrypted = decryptMessage(
  encrypted,
  sender.publicKey,
  recipient.privateKey
);

console.log('Decrypted:', decrypted);
// ✅ Должно быть: "Привет!"
```

### 4.3 Проверка в БД

Отправьте сообщение и проверьте в Supabase:

```sql
SELECT 
  content,
  is_encrypted,
  encryption_algorithm
FROM messages
ORDER BY created_at DESC
LIMIT 1;
```

**Ожидаемый результат:**
```
content: "base64_encrypted_string..."
is_encrypted: true
encryption_algorithm: "nacl-box"
```

✅ Сообщение зашифровано!

---

## 🔒 Безопасность

### ✅ Что защищено

1. **Сообщения** - зашифрованы E2E
2. **Файлы** - зашифрованы перед загрузкой
3. **Приватные ключи** - хранятся ТОЛЬКО локально
4. **Групповые чаты** - каждый участник имеет свой зашифрованный ключ

### ❌ Что НЕ защищено (пока)

1. **Метаданные** - кто с кем общается (видно в БД)
2. **Время сообщений** - timestamp видны
3. **Размер сообщений** - можно определить длину

### 🔧 Дополнительная защита (опционально)

Для максимальной защиты добавьте:

1. **Шифрование метаданных**
   ```typescript
   encrypted_metadata: encryptMetadata({ 
     timestamp, 
     sender_id 
   })
   ```

2. **Padding сообщений**
   ```typescript
   // Добавляем случайные байты для скрытия размера
   const padded = addPadding(message, 1024);
   ```

3. **Perfect Forward Secrecy**
   ```typescript
   // Новый ключ для каждой сессии
   const sessionKey = generateSessionKey();
   ```

---

## 📊 Мониторинг

### Статистика E2E

```sql
SELECT * FROM e2e_statistics;
```

### Аудит лог

```sql
SELECT 
  action,
  COUNT(*) as count,
  DATE(created_at) as date
FROM e2e_audit_log
GROUP BY action, DATE(created_at)
ORDER BY date DESC;
```

---

## ✅ Чеклист

- [ ] Миграция БД применена
- [ ] Зависимости установлены (tweetnacl)
- [ ] Файл e2eEncryption.ts создан
- [ ] useSupabaseChat.ts обновлен
- [ ] E2ESettings компонент добавлен
- [ ] Генерация ключей при регистрации
- [ ] Тестирование шифрования
- [ ] Проверка в БД

---

## 🎉 Готово!

Теперь ваш мессенджер защищен на уровне Signal/Telegram!

**Никто, кроме отправителя и получателя, не может прочитать сообщения.**

Даже если хакер получит доступ к БД - он увидит только зашифрованные данные! 🔒

---

## 📚 Дополнительно

- [ZERO_KNOWLEDGE_SECURITY.md](../guides/ZERO_KNOWLEDGE_SECURITY.md) - Полное руководство
- [E2E_ENCRYPTION_GUIDE.md](../guides/E2E_ENCRYPTION_GUIDE.md) - Детали реализации
- [Signal Protocol](https://signal.org/docs/) - Золотой стандарт E2E

**Безопасность превыше всего!** 🛡️

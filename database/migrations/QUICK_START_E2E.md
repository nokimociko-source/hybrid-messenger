# ⚡ Быстрый старт E2E шифрования

Минимальные шаги для включения Zero-Knowledge защиты.

---

## 1️⃣ База данных (5 минут)

Откройте **Supabase SQL Editor** и выполните **по очереди**:

### Шаг 1: Поля для ключей
```sql
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS public_key TEXT,
ADD COLUMN IF NOT EXISTS key_type TEXT DEFAULT 'nacl';
```

### Шаг 2: Поля для шифрования
```sql
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS is_encrypted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS encryption_algorithm TEXT,
ADD COLUMN IF NOT EXISTS encryption_nonce TEXT;
```

### Шаг 3: Таблица ключей комнат
```sql
CREATE TABLE IF NOT EXISTS room_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  encrypted_room_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);
```

### Шаг 4: RLS защита
```sql
ALTER TABLE room_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own room keys"
  ON room_keys FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own room keys"
  ON room_keys FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

✅ **БД готова!**

---

## 2️⃣ Код приложения (2 минуты)

### Установить зависимости
```bash
cd client
npm install tweetnacl tweetnacl-util
```

### Проверить файл
Убедитесь что существует:
```
client/src/app/utils/e2eEncryption.ts
```

Если нет - скопируйте из:
```
docs/guides/ZERO_KNOWLEDGE_SECURITY.md
```

✅ **Код готов!**

---

## 3️⃣ Тестирование (1 минута)

### Проверка в консоли браузера
```javascript
import { generateKeyPair, encryptMessage, decryptMessage } from './utils/e2eEncryption';

// Генерируем ключи
const alice = generateKeyPair();
const bob = generateKeyPair();

// Шифруем
const encrypted = encryptMessage('Привет!', bob.publicKey, alice.privateKey);
console.log('Encrypted:', encrypted.ciphertext);

// Расшифровываем
const decrypted = decryptMessage(encrypted, alice.publicKey, bob.privateKey);
console.log('Decrypted:', decrypted); // "Привет!"
```

✅ **Работает!**

---

## 🎉 Готово за 8 минут!

Теперь:
- ✅ Сообщения шифруются E2E
- ✅ Приватные ключи только у пользователей
- ✅ Администраторы БД не могут читать данные

---

## 📚 Полная документация

- [enable_zero_knowledge_e2e_step_by_step.md](enable_zero_knowledge_e2e_step_by_step.md) - Все 17 шагов
- [APPLY_ZERO_KNOWLEDGE_E2E.md](../../docs/migrations/APPLY_ZERO_KNOWLEDGE_E2E.md) - Подробная инструкция
- [ZERO_KNOWLEDGE_SECURITY.md](../../docs/guides/ZERO_KNOWLEDGE_SECURITY.md) - Полное руководство

**Безопасность превыше всего!** 🔒

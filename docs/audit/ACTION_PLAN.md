# 📋 ПЛАН ДЕЙСТВИЙ ПО РЕЗУЛЬТАТАМ АУДИТА

**Дата:** 3 марта 2026  
**Версия:** 1.0

---

## 🎯 Краткое резюме

**Общая оценка:** ⭐⭐⭐⭐☆ (4/5)

**Статус проекта:**
- ✅ Безопасность: Хорошо (с замечаниями)
- ⚠️ Производительность: Требует оптимизации
- ⚠️ Качество кода: Хорошо (требует расширения тестов)
- ✅ Архитектура: Хорошо спроектирована

**Проект готов к production, но требует улучшений.**

---

## 🔴 КРИТИЧЕСКИЕ ПРОБЛЕМЫ (Неделя 1)

### 1. Приватные ключи в localStorage

**Проблема:** Приватные ключи E2E хранятся в localStorage, что уязвимо для XSS

**Файл:** `client/src/app/utils/e2eEncryption.ts`

**Текущий код:**
```typescript
// ⚠️ ПРОБЛЕМА
const stored = localStorage.getItem('ecdh_keys');
if (stored) {
  const { publicKey, privateKey } = JSON.parse(stored);
  // Приватный ключ в памяти!
}
```

**Решение:**

**Шаг 1:** Создать новую утилиту для безопасного хранения
```typescript
// client/src/app/utils/secureKeyStorage.ts

import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface KeyDB extends DBSchema {
  keys: {
    key: string;
    value: {
      id: string;
      encryptedData: string;
      salt: string;
      iv: string;
    };
  };
}

export class SecureKeyStorage {
  private db: IDBPDatabase<KeyDB> | null = null;

  async init(): Promise<void> {
    this.db = await openDB<KeyDB>('e2e-keys', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('keys')) {
          db.createObjectStore('keys');
        }
      },
    });
  }

  async savePrivateKey(userId: string, privateKey: string, password: string): Promise<void> {
    if (!this.db) await this.init();

    // Генерируем salt и IV
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Дериваем ключ из пароля
    const passwordKey = await this.deriveKeyFromPassword(password, salt);

    // Шифруем приватный ключ
    const encoder = new TextEncoder();
    const encryptedData = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      passwordKey,
      encoder.encode(privateKey)
    );

    // Сохраняем в IndexedDB
    await this.db!.put('keys', {
      id: `private-${userId}`,
      encryptedData: this.arrayBufferToBase64(encryptedData),
      salt: this.arrayBufferToBase64(salt),
      iv: this.arrayBufferToBase64(iv),
    });
  }

  async getPrivateKey(userId: string, password: string): Promise<string | null> {
    if (!this.db) await this.init();

    const stored = await this.db!.get('keys', `private-${userId}`);
    if (!stored) return null;

    try {
      // Дериваем ключ из пароля
      const passwordKey = await this.deriveKeyFromPassword(
        password,
        this.base64ToArrayBuffer(stored.salt)
      );

      // Расшифровываем
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: this.base64ToArrayBuffer(stored.iv) },
        passwordKey,
        this.base64ToArrayBuffer(stored.encryptedData)
      );

      return new TextDecoder().decode(decrypted);
    } catch (error) {
      console.error('Failed to decrypt private key:', error);
      return null;
    }
  }

  private async deriveKeyFromPassword(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const passwordKey = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      passwordKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

export const secureKeyStorage = new SecureKeyStorage();
```

**Шаг 2:** Обновить e2eEncryption.ts
```typescript
// client/src/app/utils/e2eEncryption.ts

import { secureKeyStorage } from './secureKeyStorage';

class E2EEncryption {
  async initialize(userId: string, password: string): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Пытаемся загрузить существующий ключ
      const privateKeyStr = await secureKeyStorage.getPrivateKey(userId, password);
      
      if (privateKeyStr) {
        // Ключ существует, загружаем его
        const { publicKey, privateKey } = JSON.parse(privateKeyStr);
        this.keyPair = await this.importKeyPair(publicKey, privateKey);
        this.isInitialized = true;
      } else {
        // Генерируем новый ключ
        await this.generateAndSaveKeyPair(userId, password);
      }
    } catch (err) {
      console.error('E2E initialization error:', err);
    }
  }

  private async generateAndSaveKeyPair(userId: string, password: string): Promise<void> {
    // Генерируем новую пару ключей
    const keyPair = await window.crypto.subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      ['deriveKey']
    );

    // Экспортируем ключи
    const publicKeyExported = await window.crypto.subtle.exportKey('spki', keyPair.publicKey);
    const privateKeyExported = await window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey);

    // Сохраняем в IndexedDB
    const keyData = {
      publicKey: this.arrayBufferToBase64(publicKeyExported),
      privateKey: this.arrayBufferToBase64(privateKeyExported),
    };

    await secureKeyStorage.savePrivateKey(userId, JSON.stringify(keyData), password);

    // Загружаем в память
    this.keyPair = keyPair;
    this.isInitialized = true;

    // Отправляем публичный ключ на сервер
    await this.uploadPublicKey(userId, keyData.publicKey);
  }

  private async uploadPublicKey(userId: string, publicKey: string): Promise<void> {
    const { supabase } = await import('../../supabaseClient');
    
    await supabase
      .from('users')
      .update({
        public_key: publicKey,
        key_type: 'ecdh_p256',
      })
      .eq('id', userId);
  }
}
```

**Шаг 3:** Обновить компонент E2ESettings
```typescript
// client/src/app/components/E2ESettings.tsx

import { useState } from 'react';
import { e2eEncryption } from '../utils/e2eEncryption';
import { getCurrentUser } from '../utils/authCache';

export function E2ESettings() {
  const [password, setPassword] = useState('');
  const [isInitializing, setIsInitializing] = useState(false);

  const handleInitialize = async () => {
    try {
      setIsInitializing(true);
      const user = await getCurrentUser();
      
      if (!user) {
        throw new Error('User not found');
      }

      // Инициализируем E2E с паролем
      await e2eEncryption.initialize(user.id, password);
      
      // Сохраняем флаг в localStorage
      localStorage.setItem('e2e_enabled', 'true');
      
      alert('E2E шифрование включено!');
    } catch (error) {
      console.error('Failed to initialize E2E:', error);
      alert('Ошибка при инициализации E2E');
    } finally {
      setIsInitializing(false);
    }
  };

  return (
    <div className="e2e-settings">
      <h3>🔒 E2E Шифрование</h3>
      
      <input
        type="password"
        placeholder="Введите пароль для защиты ключей"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      
      <button 
        onClick={handleInitialize}
        disabled={isInitializing || !password}
      >
        {isInitializing ? 'Инициализация...' : 'Включить E2E'}
      </button>
    </div>
  );
}
```

**Тестирование:**
```bash
# 1. Откройте DevTools → Application → IndexedDB
# 2. Проверьте, что ключи сохранены в IndexedDB, а не localStorage
# 3. Попробуйте выполнить XSS атаку - приватный ключ не будет украден
```

---

### 2. Отсутствие подписи сообщений

**Проблема:** Нет проверки, что сообщение действительно от отправителя

**Файл:** `client/src/app/utils/e2eEncryption.ts`

**Решение:**

```typescript
// Добавить подпись сообщения
async encryptMessage(message: string, recipientUserId: string): Promise<string> {
  // ... существующий код шифрования ...

  // Подписываем сообщение
  const signature = await this.signMessage(message);

  const encrypted: EncryptedMessage = {
    ciphertext: this.arrayBufferToBase64(ciphertext),
    iv: this.arrayBufferToBase64(iv),
    ephemeralPublicKey: this.arrayBufferToBase64(ephemeralPublicKeyExported),
    signature: signature,  // ✅ Добавляем подпись
  };

  return JSON.stringify(encrypted);
}

private async signMessage(message: string): Promise<string> {
  if (!this.keyPair) throw new Error('Keys not initialized');

  const encoder = new TextEncoder();
  const messageData = encoder.encode(message);

  const signature = await window.crypto.subtle.sign(
    'ECDSA',
    this.keyPair.privateKey,
    messageData
  );

  return this.arrayBufferToBase64(signature);
}

async decryptMessage(encryptedMessage: string, senderUserId: string): Promise<string> {
  // ... существующий код расшифровки ...

  // Проверяем подпись
  const isValid = await this.verifySignature(
    decrypted,
    encrypted.signature,
    senderUserId
  );

  if (!isValid) {
    throw new Error('Message signature verification failed');
  }

  return new TextDecoder().decode(decrypted);
}

private async verifySignature(
  message: string,
  signature: string,
  senderUserId: string
): Promise<boolean> {
  try {
    // Получаем публичный ключ отправителя
    const { supabase } = await import('../../supabaseClient');
    const { data: sender } = await supabase
      .from('users')
      .select('public_key')
      .eq('id', senderUserId)
      .single();

    if (!sender?.public_key) return false;

    // Импортируем публичный ключ
    const publicKey = await window.crypto.subtle.importKey(
      'spki',
      this.base64ToArrayBuffer(sender.public_key),
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify']
    );

    // Проверяем подпись
    const encoder = new TextEncoder();
    const isValid = await window.crypto.subtle.verify(
      'ECDSA',
      publicKey,
      this.base64ToArrayBuffer(signature),
      encoder.encode(message)
    );

    return isValid;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}
```

---

### 3. Rate Limiting на сервере

**Проблема:** Rate limiting только на клиенте, легко обойти

**Файл:** `supabase/functions/rate-limit/index.ts`

**Решение:**

```typescript
// supabase/functions/rate-limit/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  'send_message': { maxRequests: 10, windowSeconds: 60 },
  'upload_file': { maxRequests: 5, windowSeconds: 60 },
  'search': { maxRequests: 30, windowSeconds: 60 },
};

async function checkRateLimit(
  userId: string,
  action: string,
  ip: string
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const config = RATE_LIMITS[action];
  if (!config) {
    return { allowed: true, remaining: -1, resetAt: 0 };
  }

  const key = `rate-limit:${action}:${userId}:${ip}`;
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - config.windowSeconds;

  // Получаем количество запросов в текущем окне
  const { data: requests } = await supabase
    .from('rate_limit_log')
    .select('id')
    .eq('key', key)
    .gte('created_at', new Date(windowStart * 1000).toISOString());

  const count = requests?.length || 0;
  const allowed = count < config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - count - 1);

  if (allowed) {
    // Логируем запрос
    await supabase.from('rate_limit_log').insert({
      key,
      action,
      user_id: userId,
      ip,
      created_at: new Date().toISOString(),
    });
  }

  return {
    allowed,
    remaining,
    resetAt: now + config.windowSeconds,
  };
}

serve(async (req) => {
  const { userId, action, ip } = await req.json();

  const result = await checkRateLimit(userId, action, ip);

  if (!result.allowed) {
    return new Response(
      JSON.stringify({
        error: 'Too many requests',
        resetAt: result.resetAt,
      }),
      {
        status: 429,
        headers: {
          'Retry-After': String(result.resetAt - Math.floor(Date.now() / 1000)),
          'Content-Type': 'application/json',
        },
      }
    );
  }

  return new Response(
    JSON.stringify({
      allowed: true,
      remaining: result.remaining,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
});
```

**Использование в хуке:**
```typescript
// client/src/app/hooks/useRateLimit.ts

import { supabase } from '../../supabaseClient';
import { getCurrentUserId } from '../utils/authCache';

export function useRateLimit() {
  const checkLimit = useCallback(async (action: string): Promise<boolean> => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) return false;

      const { data: { ip } } = await supabase.functions.invoke('get-client-ip');

      const { data, error } = await supabase.functions.invoke('rate-limit', {
        body: { userId, action, ip },
      });

      if (error) {
        console.error('Rate limit check failed:', error);
        return false;
      }

      return data.allowed;
    } catch (error) {
      console.error('Rate limit error:', error);
      return false;
    }
  }, []);

  return { checkLimit };
}
```

---

## 🟡 ВАЖНЫЕ ПРОБЛЕМЫ (Неделя 2)

### 4. Оптимизация React рендеринга

**Файл:** `client/src/app/components/ChannelHeader.tsx`

**Решение:**
```typescript
import React, { useMemo, useCallback } from 'react';

export const ChannelHeader = React.memo(function ChannelHeader({ 
  channel, 
  permissions, 
  onSettingsClick 
}: ChannelHeaderProps) {
  // Мемоизировать функцию
  const getInitials = useCallback((name: string): string => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }, []);

  // Мемоизировать вычисленное значение
  const initials = useMemo(() => getInitials(channel.name), [channel.name, getInitials]);

  return (
    <header 
      className="channel-header"
      role="banner"
      aria-label={`Channel header for ${channel.name}`}
    >
      {/* ... */}
    </header>
  );
});
```

---

### 5. Виртуализация списков

**Файл:** `client/src/app/components/ChannelDiscovery.tsx`

**Решение:**
```typescript
import { FixedSizeList } from 'react-window';

export function ChannelDiscovery() {
  const { channels, searchChannels, loading } = useChannelDiscovery();
  const [query, setQuery] = useState('');

  return (
    <div className="channel-discovery">
      {/* ... поиск ... */}

      <div className="channel-discovery__content">
        {loading ? (
          <Spinner />
        ) : channels.length === 0 ? (
          <div>Нет каналов</div>
        ) : (
          <FixedSizeList
            height={600}
            itemCount={channels.length}
            itemSize={80}
            width="100%"
          >
            {({ index, style }) => (
              <div style={style}>
                <ChannelDiscoveryItem channel={channels[index]} />
              </div>
            )}
          </FixedSizeList>
        )}
      </div>
    </div>
  );
}
```

---

### 6. Улучшение обработки ошибок

**Решение:**
```typescript
// client/src/app/components/ErrorBoundary.tsx

import React, { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: (error: Error) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Отправить в Sentry
    // Sentry.captureException(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback?.(this.state.error!) || (
          <div className="error-boundary">
            <h2>Что-то пошло не так</h2>
            <p>{this.state.error?.message}</p>
            <button onClick={() => window.location.reload()}>
              Перезагрузить страницу
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
```

**Использование:**
```typescript
<ErrorBoundary>
  <ChannelDiscovery />
</ErrorBoundary>
```

---

## 🟢 ЖЕЛАТЕЛЬНЫЕ УЛУЧШЕНИЯ (Неделя 3)

### 7. E2E тесты

**Инструмент:** Playwright

**Установка:**
```bash
npm install -D @playwright/test
npx playwright install
```

**Пример теста:**
```typescript
// tests/e2e/channels.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Channel Discovery', () => {
  test('should search channels', async ({ page }) => {
    await page.goto('http://localhost:8080/channels');
    
    // Ждем загрузки
    await page.waitForSelector('.channel-discovery__list');
    
    // Вводим поисковый запрос
    await page.fill('[placeholder="Search channels"]', 'test');
    
    // Нажимаем кнопку поиска
    await page.click('button[type="submit"]');
    
    // Проверяем результаты
    const items = await page.locator('.channel-discovery-item');
    expect(items).toHaveCount(1);
  });

  test('should display channel details', async ({ page }) => {
    await page.goto('http://localhost:8080/channels');
    
    // Кликаем на канал
    await page.click('.channel-discovery-item');
    
    // Проверяем, что открылась страница канала
    await expect(page).toHaveURL(/\/channels\/\w+/);
  });
});
```

**Запуск:**
```bash
npx playwright test
```

---

### 8. Добавить ErrorBoundary на каждую страницу

```typescript
// client/src/app/pages/Router.tsx

<Route
  path={HOME_PATH}
  element={
    <ErrorBoundary>
      <WelcomePage />
    </ErrorBoundary>
  }
/>

<Route
  path={`${HOME_PATH}room/:roomId`}
  element={
    <ErrorBoundary>
      <CatloverRoomView />
    </ErrorBoundary>
  }
/>
```

---

### 9. Унифицировать State Management

**Текущее состояние:**
- Jotai для глобального состояния
- React Query для серверного состояния
- useState для локального состояния

**Рекомендация:** Использовать React Query для всего

```typescript
// ✅ ЛУЧШЕ: Единый способ
const { data: channels } = useQuery(['channels'], fetchChannels);
const { data: messages } = useQuery(['messages'], fetchMessages);
const { data: user } = useQuery(['user'], getCurrentUser);
```

---

## 📊 Таблица прогресса

| Задача | Приоритет | Статус | Дата |
|--------|-----------|--------|------|
| Приватные ключи в IndexedDB | 🔴 Высокий | ⏳ | Неделя 1 |
| Подпись сообщений | 🔴 Высокий | ⏳ | Неделя 1 |
| Rate limiting на сервере | 🔴 Высокий | ⏳ | Неделя 1 |
| Оптимизация React | 🟡 Средний | ⏳ | Неделя 2 |
| Виртуализация списков | 🟡 Средний | ⏳ | Неделя 2 |
| Обработка ошибок | 🟡 Средний | ⏳ | Неделя 2 |
| E2E тесты | 🟢 Низкий | ⏳ | Неделя 3 |
| ErrorBoundary | 🟢 Низкий | ⏳ | Неделя 3 |
| State Management | 🟢 Низкий | ⏳ | Неделя 3 |

---

## 🚀 Как начать

### Шаг 1: Создать ветку
```bash
git checkout -b audit/security-improvements
```

### Шаг 2: Начать с критических проблем
```bash
# 1. Создать secureKeyStorage.ts
# 2. Обновить e2eEncryption.ts
# 3. Создать rate-limit Edge Function
```

### Шаг 3: Тестировать
```bash
npm run typecheck
npm run lint
npm test
```

### Шаг 4: Создать Pull Request
```bash
git push origin audit/security-improvements
```

---

## 📞 Контакты

**Вопросы по аудиту?**
- Смотрите `COMPREHENSIVE_AUDIT_REPORT.md`
- Смотрите `DETAILED_FINDINGS.md`
- Смотрите `ACTION_PLAN.md` (этот файл)

---

**Дата завершения:** 3 марта 2026  
**Автор:** Kiro Audit System  
**Версия:** 1.0

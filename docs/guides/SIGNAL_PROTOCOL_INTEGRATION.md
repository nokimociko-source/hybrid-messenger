# 🔐 Интеграция Signal Protocol для Production E2E

## Обзор

Signal Protocol — это криптографический протокол, используемый в WhatsApp, Signal, Facebook Messenger и других мессенджерах. Он обеспечивает:

- **Perfect Forward Secrecy (PFS)** — компрометация ключа не раскрывает прошлые сообщения
- **Future Secrecy** — компрометация ключа не раскрывает будущие сообщения
- **Deniability** — невозможно доказать, кто отправил сообщение
- **Асинхронность** — не требует одновременного присутствия обоих участников

## Вариант 1: libsignal-protocol-javascript (Рекомендуется)

### Установка

```bash
cd hybrid_messenger/client
npm install @privacyresearch/libsignal-protocol-typescript
```

### Создание нового хука useSignalE2E.ts

```typescript
// hybrid_messenger/client/src/app/hooks/useSignalE2E.ts
import { useState, useEffect, useCallback } from 'react';
import { 
  SignalProtocolAddress, 
  SessionBuilder, 
  SessionCipher,
  KeyHelper,
  SignedPublicPreKeyType,
  PreKeyType
} from '@privacyresearch/libsignal-protocol-typescript';
import { supabase } from '../../supabaseClient';

// Хранилище для Signal Protocol
class SignalProtocolStore {
  private store: Map<string, any> = new Map();

  async getIdentityKeyPair(): Promise<any> {
    return this.store.get('identityKey');
  }

  async getLocalRegistrationId(): Promise<number> {
    return this.store.get('registrationId');
  }

  async isTrustedIdentity(identifier: string, identityKey: ArrayBuffer): Promise<boolean> {
    const trusted = this.store.get(`identity_${identifier}`);
    if (!trusted) return true;
    return this.arrayBufferEquals(identityKey, trusted);
  }

  async saveIdentity(identifier: string, identityKey: ArrayBuffer): Promise<boolean> {
    const existing = this.store.get(`identity_${identifier}`);
    this.store.set(`identity_${identifier}`, identityKey);
    return !existing || !this.arrayBufferEquals(existing, identityKey);
  }

  async loadPreKey(keyId: number): Promise<any> {
    return this.store.get(`preKey_${keyId}`);
  }

  async storePreKey(keyId: number, keyPair: any): Promise<void> {
    this.store.set(`preKey_${keyId}`, keyPair);
  }

  async removePreKey(keyId: number): Promise<void> {
    this.store.delete(`preKey_${keyId}`);
  }

  async loadSignedPreKey(keyId: number): Promise<any> {
    return this.store.get(`signedPreKey_${keyId}`);
  }

  async storeSignedPreKey(keyId: number, keyPair: any): Promise<void> {
    this.store.set(`signedPreKey_${keyId}`, keyPair);
  }

  async removeSignedPreKey(keyId: number): Promise<void> {
    this.store.delete(`signedPreKey_${keyId}`);
  }

  async loadSession(identifier: string): Promise<any> {
    return this.store.get(`session_${identifier}`);
  }

  async storeSession(identifier: string, record: any): Promise<void> {
    this.store.set(`session_${identifier}`, record);
  }

  async removeSession(identifier: string): Promise<void> {
    this.store.delete(`session_${identifier}`);
  }

  async removeAllSessions(identifier: string): Promise<void> {
    const keys = Array.from(this.store.keys());
    keys.forEach(key => {
      if (key.startsWith(`session_${identifier}`)) {
        this.store.delete(key);
      }
    });
  }

  // Сохранение в localStorage
  async persist(): Promise<void> {
    const data = Array.from(this.store.entries());
    localStorage.setItem('signal_store', JSON.stringify(data));
  }

  // Загрузка из localStorage
  async load(): Promise<void> {
    const data = localStorage.getItem('signal_store');
    if (data) {
      const entries = JSON.parse(data);
      this.store = new Map(entries);
    }
  }

  private arrayBufferEquals(a: ArrayBuffer, b: ArrayBuffer): boolean {
    const aView = new Uint8Array(a);
    const bView = new Uint8Array(b);
    if (aView.length !== bView.length) return false;
    for (let i = 0; i < aView.length; i++) {
      if (aView[i] !== bView[i]) return false;
    }
    return true;
  }
}

export function useSignalE2E() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [store] = useState(() => new SignalProtocolStore());

  // Инициализация
  useEffect(() => {
    initializeSignal();
  }, []);

  const initializeSignal = async () => {
    try {
      await store.load();

      // Проверяем, есть ли уже ключи
      const identityKeyPair = await store.getIdentityKeyPair();
      
      if (!identityKeyPair) {
        // Генерируем новые ключи
        await generateKeys();
      }

      setIsReady(true);
    } catch (err: any) {
      console.error('Signal initialization error:', err);
      setError(err.message);
    }
  };

  const generateKeys = async () => {
    try {
      // Генерация Identity Key
      const identityKeyPair = await KeyHelper.generateIdentityKeyPair();
      
      // Генерация Registration ID
      const registrationId = KeyHelper.generateRegistrationId();

      // Сохраняем в store
      await store.storeIdentityKeyPair(identityKeyPair);
      await store.storeLocalRegistrationId(registrationId);

      // Генерация PreKeys (100 штук)
      const preKeys: PreKeyType[] = [];
      for (let i = 0; i < 100; i++) {
        const preKey = await KeyHelper.generatePreKey(i);
        await store.storePreKey(i, preKey);
        preKeys.push(preKey);
      }

      // Генерация Signed PreKey
      const signedPreKey = await KeyHelper.generateSignedPreKey(
        identityKeyPair,
        0
      );
      await store.storeSignedPreKey(0, signedPreKey);

      // Сохраняем в localStorage
      await store.persist();

      // Загружаем публичные ключи в Supabase
      await uploadPublicKeys({
        identityKey: identityKeyPair.pubKey,
        registrationId,
        preKeys: preKeys.map(pk => ({
          keyId: pk.keyId,
          publicKey: pk.keyPair.pubKey
        })),
        signedPreKey: {
          keyId: signedPreKey.keyId,
          publicKey: signedPreKey.keyPair.pubKey,
          signature: signedPreKey.signature
        }
      });

    } catch (err: any) {
      console.error('Key generation error:', err);
      throw err;
    }
  };

  const uploadPublicKeys = async (keys: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Конвертируем ArrayBuffer в base64
    const toBase64 = (buffer: ArrayBuffer) => {
      return btoa(String.fromCharCode(...new Uint8Array(buffer)));
    };

    await supabase
      .from('signal_keys')
      .upsert({
        user_id: user.id,
        identity_key: toBase64(keys.identityKey),
        registration_id: keys.registrationId,
        pre_keys: keys.preKeys.map((pk: any) => ({
          key_id: pk.keyId,
          public_key: toBase64(pk.publicKey)
        })),
        signed_pre_key: {
          key_id: keys.signedPreKey.keyId,
          public_key: toBase64(keys.signedPreKey.publicKey),
          signature: toBase64(keys.signedPreKey.signature)
        }
      });
  };

  const encryptMessage = async (
    message: string, 
    recipientUserId: string
  ): Promise<string> => {
    try {
      // Получаем публичные ключи получателя
      const { data: recipientKeys } = await supabase
        .from('signal_keys')
        .select('*')
        .eq('user_id', recipientUserId)
        .single();

      if (!recipientKeys) {
        throw new Error('Recipient keys not found');
      }

      // Создаем адрес получателя
      const address = new SignalProtocolAddress(
        recipientUserId,
        recipientKeys.registration_id
      );

      // Проверяем, есть ли уже сессия
      let session = await store.loadSession(address.toString());

      if (!session) {
        // Создаем новую сессию
        const sessionBuilder = new SessionBuilder(store, address);
        
        // Используем preKey bundle для инициализации
        const preKeyBundle = {
          identityKey: this.base64ToArrayBuffer(recipientKeys.identity_key),
          registrationId: recipientKeys.registration_id,
          preKey: {
            keyId: recipientKeys.pre_keys[0].key_id,
            publicKey: this.base64ToArrayBuffer(recipientKeys.pre_keys[0].public_key)
          },
          signedPreKey: {
            keyId: recipientKeys.signed_pre_key.key_id,
            publicKey: this.base64ToArrayBuffer(recipientKeys.signed_pre_key.public_key),
            signature: this.base64ToArrayBuffer(recipientKeys.signed_pre_key.signature)
          }
        };

        await sessionBuilder.processPreKey(preKeyBundle);
      }

      // Шифруем сообщение
      const sessionCipher = new SessionCipher(store, address);
      const ciphertext = await sessionCipher.encrypt(
        new TextEncoder().encode(message)
      );

      // Сохраняем store
      await store.persist();

      // Возвращаем зашифрованное сообщение в base64
      return JSON.stringify({
        type: ciphertext.type,
        body: this.arrayBufferToBase64(ciphertext.body),
        registrationId: ciphertext.registrationId
      });

    } catch (err: any) {
      console.error('Encryption error:', err);
      throw err;
    }
  };

  const decryptMessage = async (
    encryptedMessage: string,
    senderUserId: string
  ): Promise<string> => {
    try {
      const ciphertext = JSON.parse(encryptedMessage);

      // Получаем registration ID отправителя
      const { data: senderKeys } = await supabase
        .from('signal_keys')
        .select('registration_id')
        .eq('user_id', senderUserId)
        .single();

      if (!senderKeys) {
        throw new Error('Sender keys not found');
      }

      const address = new SignalProtocolAddress(
        senderUserId,
        senderKeys.registration_id
      );

      const sessionCipher = new SessionCipher(store, address);

      let plaintext: ArrayBuffer;
      if (ciphertext.type === 3) {
        // PreKeyWhisperMessage
        plaintext = await sessionCipher.decryptPreKeyWhisperMessage(
          this.base64ToArrayBuffer(ciphertext.body)
        );
      } else {
        // WhisperMessage
        plaintext = await sessionCipher.decryptWhisperMessage(
          this.base64ToArrayBuffer(ciphertext.body)
        );
      }

      // Сохраняем store
      await store.persist();

      return new TextDecoder().decode(plaintext);

    } catch (err: any) {
      console.error('Decryption error:', err);
      throw err;
    }
  };

  // Утилиты для конвертации
  const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  };

  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)));
  };

  return {
    isReady,
    error,
    encryptMessage,
    decryptMessage,
    regenerateKeys: generateKeys
  };
}
```

### Схема БД для Signal Keys

```sql
-- hybrid_messenger/signal_keys_schema.sql

-- Таблица для хранения публичных ключей Signal Protocol
CREATE TABLE IF NOT EXISTS public.signal_keys (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    identity_key TEXT NOT NULL,
    registration_id INTEGER NOT NULL,
    pre_keys JSONB NOT NULL, -- Массив {key_id, public_key}
    signed_pre_key JSONB NOT NULL, -- {key_id, public_key, signature}
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS политики
ALTER TABLE public.signal_keys ENABLE ROW LEVEL SECURITY;

-- Пользователи могут читать все публичные ключи
CREATE POLICY "Anyone can read signal keys"
ON public.signal_keys FOR SELECT
USING (true);

-- Пользователи могут обновлять только свои ключи
CREATE POLICY "Users can update own signal keys"
ON public.signal_keys FOR UPDATE
USING (auth.uid() = user_id);

-- Пользователи могут вставлять только свои ключи
CREATE POLICY "Users can insert own signal keys"
ON public.signal_keys FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Индексы
CREATE INDEX idx_signal_keys_user_id ON public.signal_keys(user_id);
```

## Вариант 2: TweetNaCl (Более простой)

Если Signal Protocol слишком сложен, можно использовать TweetNaCl — проверенную криптографическую библиотеку.

### Установка

```bash
npm install tweetnacl tweetnacl-util
npm install --save-dev @types/tweetnacl @types/tweetnacl-util
```

### Реализация

```typescript
// hybrid_messenger/client/src/app/hooks/useNaClE2E.ts
import { useState, useEffect, useCallback } from 'react';
import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64, encodeUTF8, decodeUTF8 } from 'tweetnacl-util';
import { supabase } from '../../supabaseClient';

export function useNaClE2E() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keyPair, setKeyPair] = useState<nacl.BoxKeyPair | null>(null);

  useEffect(() => {
    initializeKeys();
  }, []);

  const initializeKeys = async () => {
    try {
      // Загружаем ключи из localStorage
      const stored = localStorage.getItem('nacl_keys');
      
      if (stored) {
        const { publicKey, secretKey } = JSON.parse(stored);
        setKeyPair({
          publicKey: decodeBase64(publicKey),
          secretKey: decodeBase64(secretKey)
        });
      } else {
        // Генерируем новые ключи
        await generateKeys();
      }

      setIsReady(true);
    } catch (err: any) {
      console.error('NaCl initialization error:', err);
      setError(err.message);
    }
  };

  const generateKeys = async () => {
    // Генерация пары ключей для box (X25519)
    const newKeyPair = nacl.box.keyPair();
    setKeyPair(newKeyPair);

    // Сохраняем в localStorage
    localStorage.setItem('nacl_keys', JSON.stringify({
      publicKey: encodeBase64(newKeyPair.publicKey),
      secretKey: encodeBase64(newKeyPair.secretKey)
    }));

    // Загружаем публичный ключ в Supabase
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('users')
        .update({ 
          public_key: encodeBase64(newKeyPair.publicKey),
          key_type: 'nacl_box'
        })
        .eq('id', user.id);
    }
  };

  const encryptMessage = async (
    message: string,
    recipientUserId: string
  ): Promise<string> => {
    if (!keyPair) throw new Error('Keys not initialized');

    // Получаем публичный ключ получателя
    const { data: recipient } = await supabase
      .from('users')
      .select('public_key')
      .eq('id', recipientUserId)
      .single();

    if (!recipient?.public_key) {
      throw new Error('Recipient public key not found');
    }

    const recipientPublicKey = decodeBase64(recipient.public_key);

    // Генерируем nonce (24 байта)
    const nonce = nacl.randomBytes(24);

    // Шифруем сообщение
    const messageUint8 = encodeUTF8(message);
    const encrypted = nacl.box(
      messageUint8,
      nonce,
      recipientPublicKey,
      keyPair.secretKey
    );

    // Возвращаем nonce + encrypted в base64
    return JSON.stringify({
      nonce: encodeBase64(nonce),
      ciphertext: encodeBase64(encrypted)
    });
  };

  const decryptMessage = async (
    encryptedMessage: string,
    senderUserId: string
  ): Promise<string> => {
    if (!keyPair) throw new Error('Keys not initialized');

    const { nonce, ciphertext } = JSON.parse(encryptedMessage);

    // Получаем публичный ключ отправителя
    const { data: sender } = await supabase
      .from('users')
      .select('public_key')
      .eq('id', senderUserId)
      .single();

    if (!sender?.public_key) {
      throw new Error('Sender public key not found');
    }

    const senderPublicKey = decodeBase64(sender.public_key);

    // Расшифровываем
    const decrypted = nacl.box.open(
      decodeBase64(ciphertext),
      decodeBase64(nonce),
      senderPublicKey,
      keyPair.secretKey
    );

    if (!decrypted) {
      throw new Error('Decryption failed');
    }

    return decodeUTF8(decrypted);
  };

  return {
    isReady,
    error,
    encryptMessage,
    decryptMessage,
    regenerateKeys: generateKeys
  };
}
```

## Вариант 3: Web Crypto API (Встроенный в браузер)

Самый простой вариант без внешних зависимостей.

```typescript
// Уже реализовано в useE2EEncryption.ts
// Но можно улучшить, добавив:
// 1. ECDH для обмена ключами (вместо RSA)
// 2. AES-GCM для шифрования сообщений
// 3. HKDF для деривации ключей
```

## Сравнение вариантов

| Критерий | Signal Protocol | TweetNaCl | Web Crypto API |
|----------|----------------|-----------|----------------|
| **Безопасность** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **PFS** | ✅ Да | ❌ Нет | ❌ Нет |
| **Сложность** | Высокая | Средняя | Низкая |
| **Размер** | ~200KB | ~30KB | 0KB (встроен) |
| **Поддержка** | Отличная | Хорошая | Отличная |
| **Групповые чаты** | ✅ Да | ⚠️ Сложно | ⚠️ Сложно |

## Рекомендация

**Для production:** Используйте **Signal Protocol** (Вариант 1)
- Максимальная безопасность
- Perfect Forward Secrecy
- Проверено временем (WhatsApp, Signal)
- Поддержка групповых чатов

**Для MVP:** Используйте **TweetNaCl** (Вариант 2)
- Простая интеграция
- Хорошая безопасность
- Малый размер библиотеки
- Быстрая реализация

**Для демо:** Используйте **Web Crypto API** (текущая реализация)
- Без зависимостей
- Работает везде
- Подходит для прототипа

## Следующие шаги

1. Выберите вариант реализации
2. Установите необходимые пакеты
3. Создайте миграцию БД (для Signal/NaCl)
4. Замените useE2EEncryption на выбранный хук
5. Протестируйте шифрование/расшифровку
6. Добавьте обработку ошибок
7. Реализуйте групповое шифрование

Хотите, чтобы я реализовал один из этих вариантов полностью?

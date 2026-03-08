# 🛡️ Применение защиты от DDoS атак

## ⚠️ ВАЖНО: Выбор версии схемы

Есть три версии схемы:

1. **ddos_protection_simple.sql** (рекомендуется) — Упрощенная версия, можно запускать повторно
2. **ddos_protection_clean_install.sql** — Полная переустановка (удаляет все данные!)
3. **ddos_protection_schema.sql** — Полная версия (требует поле `role` в таблице `users`)

**Используйте `ddos_protection_simple.sql`** для первой установки или обновления.

**Используйте `ddos_protection_clean_install.sql`** если нужно начать с чистого листа.

## Шаг 1: Применить схему базы данных

### Вариант A: Первая установка или обновление

Выполните SQL-скрипт в Supabase Dashboard (SQL Editor):

```bash
# Откройте файл ddos_protection_simple.sql и скопируйте содержимое
# Вставьте в SQL Editor в Supabase Dashboard
# Нажмите "Run"
```

### Вариант B: Полная переустановка (если есть ошибки)

⚠️ **ВНИМАНИЕ:** Это удалит все существующие данные о rate limits!

```bash
# Откройте файл ddos_protection_clean_install.sql
# Вставьте в SQL Editor в Supabase Dashboard
# Нажмите "Run"
```

## Шаг 2: Проверка применения

Проверьте, что таблицы созданы:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('rate_limits', 'suspicious_activity');
```

Должно вернуть 2 строки.

## Шаг 3: Настройка лимитов

Лимиты по умолчанию (можно изменить в коде):

| Действие | Лимит | Окно времени |
|----------|-------|--------------|
| Отправка сообщений | 10 | 60 секунд |
| Загрузка файлов | 5 | 60 секунд |
| Звонки | 3 | 60 секунд |
| API запросы | 100 | 60 секунд |

## Шаг 4: Интеграция в клиент

Хук `useRateLimit` уже создан и готов к использованию.

### Использование в компонентах:

```typescript
import { useRateLimit } from '../hooks/useRateLimit';

function MyComponent() {
  const { checkRateLimit, isBlocked, blockedUntil } = useRateLimit();
  
  const handleSendMessage = async () => {
    const allowed = await checkRateLimit('message');
    if (!allowed) {
      alert('Слишком много сообщений! Подождите немного.');
      return;
    }
    
    // Отправить сообщение
  };
}
```

## Шаг 5: Мониторинг

### Просмотр подозрительной активности (только для админов):

```sql
SELECT 
  sa.id,
  sa.activity_type,
  sa.severity,
  sa.detected_at,
  u.username,
  sa.ip_address,
  sa.details
FROM suspicious_activity sa
LEFT JOIN users u ON u.id = sa.user_id
WHERE sa.resolved = false
ORDER BY sa.detected_at DESC
LIMIT 50;
```

### Просмотр текущих блокировок:

```sql
SELECT 
  rl.user_id,
  u.username,
  rl.action_type,
  rl.request_count,
  rl.blocked_until,
  rl.ip_address
FROM rate_limits rl
LEFT JOIN users u ON u.id = rl.user_id
WHERE rl.blocked_until > NOW()
ORDER BY rl.blocked_until DESC;
```

## Шаг 6: Автоматическая очистка

Настройте cron-задачу для очистки старых записей (если доступен pg_cron):

```sql
-- Очистка каждый час
SELECT cron.schedule(
  'cleanup-rate-limits',
  '0 * * * *',
  'SELECT cleanup_rate_limits()'
);
```

Или запускайте вручную раз в день:

```sql
SELECT cleanup_rate_limits();
```

## Шаг 7: Настройка для production

### Рекомендуемые лимиты для production:

```typescript
// В useRateLimit.ts измените:
const RATE_LIMITS = {
  message: { max: 20, window: 60 },      // 20 сообщений в минуту
  upload: { max: 10, window: 60 },       // 10 загрузок в минуту
  call: { max: 5, window: 60 },          // 5 звонков в минуту
  api_request: { max: 200, window: 60 }, // 200 API запросов в минуту
};
```

### Настройка IP-адреса:

Для получения реального IP-адреса пользователя (за прокси/CDN):

```typescript
// В useRateLimit.ts добавьте:
const getClientIP = async () => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch {
    return '0.0.0.0';
  }
};
```

## Шаг 8: Тестирование

### Тест 1: Проверка rate limit для сообщений

```typescript
// Отправьте 11 сообщений подряд
// 11-е сообщение должно быть заблокировано
```

### Тест 2: Проверка обнаружения спама

```sql
-- Вставьте 6 одинаковых сообщений за 5 минут
-- Должна появиться запись в suspicious_activity
```

### Тест 3: Проверка автоматической разблокировки

```sql
-- Подождите 60 секунд после блокировки
-- Попробуйте отправить сообщение снова
-- Должно пройти успешно
```

## Возможные проблемы

### Проблема: "политика уже существует"

**Решение:** Используйте `ddos_protection_clean_install.sql` для полной переустановки, или просто игнорируйте ошибку - политики уже созданы и работают.

### Проблема: "Function check_rate_limit does not exist"

**Решение:** Убедитесь, что SQL-скрипт выполнен полностью без ошибок. Используйте `ddos_protection_clean_install.sql`.

### Проблема: "столбец role не существует"

**Решение:** Используйте `ddos_protection_simple.sql` вместо `ddos_protection_schema.sql`.

### Проблема: "Permission denied for table rate_limits"

**Решение:** Проверьте RLS политики. Пользователи видят только свои данные.

### Проблема: Ложные срабатывания

**Решение:** Увеличьте лимиты в `RATE_LIMITS` или добавьте whitelist для доверенных пользователей.

## Дополнительные возможности

### Whitelist для доверенных пользователей:

```sql
-- Добавьте поле в таблицу users
ALTER TABLE users ADD COLUMN is_trusted BOOLEAN DEFAULT FALSE;

-- Измените функцию check_rate_limit:
-- Добавьте проверку:
IF EXISTS (SELECT 1 FROM users WHERE id = p_user_id AND is_trusted = TRUE) THEN
  RETURN TRUE; -- Доверенные пользователи не ограничены
END IF;
```

### Уведомления админам о критических атаках:

```sql
-- Создайте триггер для отправки уведомлений
CREATE OR REPLACE FUNCTION notify_admin_on_critical_attack()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.severity = 'critical' THEN
    -- Отправить уведомление (через webhook или email)
    PERFORM pg_notify('critical_attack', row_to_json(NEW)::text);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_admin
AFTER INSERT ON suspicious_activity
FOR EACH ROW
EXECUTE FUNCTION notify_admin_on_critical_attack();
```

## Статус

- ✅ Схема БД создана
- ✅ Функции проверки реализованы
- ✅ RLS политики настроены
- ✅ Клиентский хук создан
- ⏳ Интеграция в компоненты (требуется)
- ⏳ Тестирование (требуется)
- ⏳ Мониторинг админ-панель (опционально)

## Следующие шаги

1. Примените SQL-скрипт к базе данных
2. Интегрируйте `useRateLimit` в `useSupabaseChat` и `useSupabaseCall`
3. Добавьте UI для отображения ошибок rate limit
4. Создайте админ-панель для мониторинга (опционально)
5. Протестируйте на dev-окружении
6. Настройте лимиты для production
7. Запустите в production

---

**Автор:** Kiro AI  
**Дата:** 2 марта 2026  
**Версия:** 1.0

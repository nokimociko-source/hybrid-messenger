# Настройка Storage для аватаров

## Проблема
Аватары не сохраняются после обрезки, потому что нет прав на загрузку в папку `avatars` в Supabase Storage.

## Решение

### Шаг 1: Создать bucket (если ещё не создан)

1. Откройте Supabase Dashboard
2. Перейдите в **Storage**
3. Если bucket `media` не существует:
   - Нажмите **New bucket**
   - Name: `media`
   - Public: **✓ Включить** (чтобы аватары были доступны публично)
   - Нажмите **Create bucket**

### Шаг 2: Применить политики доступа

1. Откройте Supabase Dashboard
2. Перейдите в **SQL Editor**
3. Создайте новый запрос
4. Скопируйте содержимое файла `storage_avatars_policy.sql`
5. Нажмите **Run**

### Шаг 3: Проверить политики

После применения SQL скрипта вы должны увидеть список созданных политик:

```
policyname                              | cmd
----------------------------------------|--------
Authenticated users can upload avatars  | INSERT
Public read access to media             | SELECT
Users can update avatars                | UPDATE
Users can delete avatars                | DELETE
```

### Шаг 4: Проверить работу

1. Откройте приложение
2. Перейдите в настройки группы
3. Нажмите "Изменить" аватар
4. Выберите изображение
5. Обрежьте его
6. Нажмите "Сохранить"
7. Проверьте консоль браузера (F12) на наличие ошибок
8. Перезагрузите страницу - аватар должен отображаться

## Альтернативный способ (через Dashboard)

Если SQL не работает, можно создать политики вручную:

1. Откройте Supabase Dashboard → Storage → media bucket
2. Нажмите **Policies**
3. Создайте следующие политики:

### Policy 1: Upload avatars
- **Name**: Authenticated users can upload avatars
- **Allowed operation**: INSERT
- **Target roles**: authenticated
- **USING expression**: `bucket_id = 'media' AND (storage.foldername(name))[1] = 'avatars'`

### Policy 2: Read media
- **Name**: Public read access to media
- **Allowed operation**: SELECT
- **Target roles**: public
- **USING expression**: `bucket_id = 'media'`

### Policy 3: Update avatars
- **Name**: Users can update avatars
- **Allowed operation**: UPDATE
- **Target roles**: authenticated
- **USING expression**: `bucket_id = 'media' AND (storage.foldername(name))[1] = 'avatars'`

### Policy 4: Delete avatars
- **Name**: Users can delete avatars
- **Allowed operation**: DELETE
- **Target roles**: authenticated
- **USING expression**: `bucket_id = 'media' AND (storage.foldername(name))[1] = 'avatars'`

## Проверка ошибок

Если после применения политик аватары всё равно не загружаются:

1. Откройте консоль браузера (F12)
2. Попробуйте загрузить аватар
3. Найдите ошибку в консоли
4. Если видите "403 Forbidden" или "Policy violation", значит политики не применились
5. Если видите "404 Not Found", значит bucket не создан
6. Если видите "CORS error", нужно настроить CORS в Supabase

## Настройка CORS (если нужно)

Если видите CORS ошибку:

1. Откройте Supabase Dashboard → Settings → API
2. Найдите раздел **CORS**
3. Добавьте ваш домен (например, `http://localhost:5173`)
4. Сохраните изменения

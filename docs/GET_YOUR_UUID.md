# Как найти ваш UUID и добавить себя администратором

## Шаг 1: Найти ваш UUID в Supabase

### Способ 1: Через Dashboard (самый простой)

1. Откройте [Supabase Dashboard](https://app.supabase.com)
2. Выберите ваш проект
3. Перейдите в **Authentication** → **Users**
4. Найдите вашего пользователя в списке
5. Нажмите на него, чтобы открыть детали
6. Скопируйте значение из колонки **ID** (это ваш UUID)

Пример UUID: `f319fb88-5d1b-4fe1-b2fa-a887a96ed725`

### Способ 2: Через SQL запрос

1. Откройте **SQL Editor** в Supabase
2. Выполните запрос:
```sql
SELECT id, email FROM auth.users LIMIT 10;
```
3. Найдите вашу почту и скопируйте соответствующий ID

---

## Шаг 2: Добавить себя администратором

После того как вы скопировали ваш UUID:

1. Откройте **SQL Editor** в Supabase
2. Выполните команду (замените `YOUR_UUID` на ваш UUID):

```sql
INSERT INTO public.admin_users (id) 
VALUES ('YOUR_UUID')
ON CONFLICT (id) DO NOTHING;
```

**Пример с реальным UUID:**
```sql
INSERT INTO public.admin_users (id) 
VALUES ('f319fb88-5d1b-4fe1-b2fa-a887a96ed725')
ON CONFLICT (id) DO NOTHING;
```

3. Нажмите **Run** или **Ctrl+Enter**

---

## Шаг 3: Проверить, что вы администратор

Выполните запрос:
```sql
SELECT * FROM public.admin_users;
```

Вы должны увидеть вашу запись в результатах.

---

## Шаг 4: Перезагрузить приложение

1. Откройте приложение
2. Нажмите **Ctrl+Shift+R** (полная перезагрузка)
3. Перейдите в **Settings** → **Admin Panel**
4. Введите ключ: `2024`
5. Вы должны увидеть вкладки: Пользователи, Комнаты, Жалобы

---

## Если что-то не работает

### Проверить, что таблица admin_users существует:
```sql
SELECT * FROM information_schema.tables 
WHERE table_name = 'admin_users';
```

### Проверить, что таблица reports существует:
```sql
SELECT * FROM information_schema.tables 
WHERE table_name = 'reports';
```

### Проверить RLS политики:
```sql
SELECT * FROM pg_policies WHERE tablename = 'admin_users';
```

### Удалить себя из администраторов (если нужно):
```sql
DELETE FROM public.admin_users 
WHERE id = 'YOUR_UUID';
```

---

## Полезные команды

### Просмотреть всех администраторов с их именами:
```sql
SELECT u.id, u.username, a.created_at 
FROM public.admin_users a
JOIN public.users u ON a.id = u.id;
```

### Добавить нескольких администраторов:
```sql
INSERT INTO public.admin_users (id) VALUES 
('UUID_1'),
('UUID_2'),
('UUID_3')
ON CONFLICT (id) DO NOTHING;
```

### Просмотреть всех пользователей:
```sql
SELECT id, username, email FROM public.users LIMIT 20;
```

---

## Часто задаваемые вопросы

**Q: Где найти мой UUID?**
A: Authentication → Users → нажмите на вашего пользователя → скопируйте ID

**Q: Что если я не вижу себя в списке пользователей?**
A: Убедитесь, что вы авторизованы в приложении. Пользователь создается при первой регистрации.

**Q: Можно ли добавить нескольких администраторов?**
A: Да, выполните INSERT для каждого UUID

**Q: Как удалить администратора?**
A: `DELETE FROM public.admin_users WHERE id = 'UUID';`

**Q: Почему админ-панель не загружается?**
A: Проверьте, что вы добавлены в admin_users и перезагрузите приложение (Ctrl+Shift+R)

---

## Следующие шаги

После добавления себя администратором:

1. ✅ Откройте админ-панель (Settings → Admin Panel)
2. ✅ Введите ключ: `2024`
3. ✅ Проверьте загрузку пользователей
4. ✅ Проверьте загрузку комнат
5. ✅ Проверьте загрузку жалоб
6. ✅ Попробуйте отправить жалобу
7. ✅ Проверьте, что жалоба появилась в админ-панели

# Настройка LiveKit для групповых звонков

## Шаг 1: Установка зависимостей

```bash
cd hybrid_messenger/client
npm install livekit-client @livekit/components-react
```

## Шаг 2: Получение LiveKit Cloud аккаунта

1. Зарегистрируйтесь на https://cloud.livekit.io/
2. Создайте новый проект
3. Получите:
   - `LIVEKIT_URL` (например: wss://your-project.livekit.cloud)
   - `LIVEKIT_API_KEY`
   - `LIVEKIT_API_SECRET`

## Шаг 3: Настройка Supabase Edge Function

Создайте Edge Function для генерации токенов LiveKit:

```typescript
// supabase/functions/livekit-token/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { AccessToken } from 'https://esm.sh/livekit-server-sdk@1.2.7'

serve(async (req) => {
  const { roomName, participantName } = await req.json()
  
  const at = new AccessToken(
    Deno.env.get('LIVEKIT_API_KEY'),
    Deno.env.get('LIVEKIT_API_SECRET'),
    {
      identity: participantName,
    }
  )
  
  at.addGrant({ roomJoin: true, room: roomName })
  
  return new Response(
    JSON.stringify({ token: at.toJwt() }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
```

## Шаг 4: Добавить переменные окружения

В `.env`:
```
VITE_LIVEKIT_URL=wss://your-project.livekit.cloud
```

В Supabase Dashboard → Edge Functions → Secrets:
```
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret
```

## Шаг 5: Использование

После установки, код автоматически будет использовать:
- **P2P WebRTC** для личных чатов (1-на-1)
- **LiveKit** для групповых звонков (3+ участников)

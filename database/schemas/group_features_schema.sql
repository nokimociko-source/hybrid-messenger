-- ============================================
-- ГРУППЫ: Invite Links, Audit Log, Polls, Topics
-- ============================================
-- Применяйте этот файл ОТДЕЛЬНО от других SQL файлов
-- ============================================

-- 1. INVITE LINKS (Пригласительные ссылки)
CREATE TABLE IF NOT EXISTS public.invite_links (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  link_code TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  max_uses INTEGER DEFAULT NULL, -- NULL = unlimited
  current_uses INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_invite_links_room ON public.invite_links(room_id);
CREATE INDEX IF NOT EXISTS idx_invite_links_code ON public.invite_links(link_code);

-- RLS для invite_links
ALTER TABLE public.invite_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Invite links viewable by room members" ON public.invite_links;
CREATE POLICY "Invite links viewable by room members" ON public.invite_links
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.room_members
      WHERE room_id = invite_links.room_id
      AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can create invite links" ON public.invite_links;
CREATE POLICY "Admins can create invite links" ON public.invite_links
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.room_members
      WHERE room_id = invite_links.room_id
      AND user_id = auth.uid()
      AND role IN ('creator', 'admin')
    )
  );

DROP POLICY IF EXISTS "Admins can update invite links" ON public.invite_links;
CREATE POLICY "Admins can update invite links" ON public.invite_links
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.room_members
      WHERE room_id = invite_links.room_id
      AND user_id = auth.uid()
      AND role IN ('creator', 'admin')
    )
  );

DROP POLICY IF EXISTS "Admins can delete invite links" ON public.invite_links;
CREATE POLICY "Admins can delete invite links" ON public.invite_links
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.room_members
      WHERE room_id = invite_links.room_id
      AND user_id = auth.uid()
      AND role IN ('creator', 'admin')
    )
  );

-- Функция для генерации уникального кода ссылки
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..12 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Функция для присоединения по invite link
CREATE OR REPLACE FUNCTION join_room_by_invite(p_link_code TEXT)
RETURNS JSONB AS $$
DECLARE
  v_link RECORD;
  v_room_id UUID;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  -- Проверяем ссылку
  SELECT * INTO v_link
  FROM public.invite_links
  WHERE link_code = p_link_code
  AND is_active = true
  AND (expires_at IS NULL OR expires_at > NOW())
  AND (max_uses IS NULL OR current_uses < max_uses);
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ссылка недействительна или истекла');
  END IF;
  
  v_room_id := v_link.room_id;
  
  -- Проверяем, не является ли пользователь уже участником
  IF EXISTS (
    SELECT 1 FROM public.room_members
    WHERE room_id = v_room_id AND user_id = v_user_id
  ) THEN
    RETURN jsonb_build_object('success', true, 'room_id', v_room_id, 'already_member', true);
  END IF;
  
  -- Добавляем пользователя в группу
  INSERT INTO public.room_members (room_id, user_id, role, permissions)
  VALUES (
    v_room_id,
    v_user_id,
    'member',
    jsonb_build_object(
      'can_send_messages', true,
      'can_send_media', true,
      'can_add_members', false,
      'can_pin_messages', false,
      'can_delete_messages', false,
      'can_ban_members', false,
      'can_change_info', false,
      'can_invite_users', false
    )
  );
  
  -- Увеличиваем счетчик использований
  UPDATE public.invite_links
  SET current_uses = current_uses + 1
  WHERE id = v_link.id;
  
  RETURN jsonb_build_object('success', true, 'room_id', v_room_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. AUDIT LOG (История изменений)
-- ============================================

CREATE TABLE IF NOT EXISTS public.room_audit_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN (
    'member_added', 'member_removed', 'member_promoted', 'member_demoted',
    'room_created', 'room_updated', 'invite_link_created', 'invite_link_revoked',
    'message_pinned', 'message_unpinned', 'poll_created', 'topic_created'
  )),
  target_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_log_room ON public.room_audit_log(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON public.room_audit_log(user_id);

-- RLS для audit_log
ALTER TABLE public.room_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Audit log viewable by room members" ON public.room_audit_log;
CREATE POLICY "Audit log viewable by room members" ON public.room_audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.room_members
      WHERE room_id = room_audit_log.room_id
      AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "System can insert audit log" ON public.room_audit_log;
CREATE POLICY "System can insert audit log" ON public.room_audit_log
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Триггер для автоматического логирования изменений участников
CREATE OR REPLACE FUNCTION log_member_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.room_audit_log (room_id, user_id, action, target_user_id, details)
    VALUES (
      NEW.room_id,
      auth.uid(),
      'member_added',
      NEW.user_id,
      jsonb_build_object('role', NEW.role)
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.room_audit_log (room_id, user_id, action, target_user_id, details)
    VALUES (
      OLD.room_id,
      auth.uid(),
      'member_removed',
      OLD.user_id,
      jsonb_build_object('role', OLD.role)
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.role != NEW.role THEN
    INSERT INTO public.room_audit_log (room_id, user_id, action, target_user_id, details)
    VALUES (
      NEW.room_id,
      auth.uid(),
      CASE 
        WHEN NEW.role IN ('admin', 'creator') THEN 'member_promoted'
        ELSE 'member_demoted'
      END,
      NEW.user_id,
      jsonb_build_object('old_role', OLD.role, 'new_role', NEW.role)
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS member_changes_audit ON public.room_members;
CREATE TRIGGER member_changes_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.room_members
  FOR EACH ROW EXECUTE FUNCTION log_member_changes();

-- ============================================
-- 3. POLLS (Опросы)
-- ============================================

CREATE TABLE IF NOT EXISTS public.polls (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL NOT NULL,
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]', -- [{id: string, text: string}]
  is_anonymous BOOLEAN DEFAULT false,
  allows_multiple BOOLEAN DEFAULT false,
  closes_at TIMESTAMP WITH TIME ZONE,
  is_closed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.poll_votes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  poll_id UUID REFERENCES public.polls(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  option_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(poll_id, user_id, option_id)
);

CREATE INDEX IF NOT EXISTS idx_polls_room ON public.polls(room_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll ON public.poll_votes(poll_id);

-- RLS для polls
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Polls viewable by room members" ON public.polls;
CREATE POLICY "Polls viewable by room members" ON public.polls
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.room_members
      WHERE room_id = polls.room_id
      AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can create polls" ON public.polls;
CREATE POLICY "Members can create polls" ON public.polls
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.room_members
      WHERE room_id = polls.room_id
      AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Creator can update polls" ON public.polls;
CREATE POLICY "Creator can update polls" ON public.polls
  FOR UPDATE USING (created_by = auth.uid());

-- RLS для poll_votes
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Poll votes viewable by room members" ON public.poll_votes;
CREATE POLICY "Poll votes viewable by room members" ON public.poll_votes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.polls p
      JOIN public.room_members rm ON rm.room_id = p.room_id
      WHERE p.id = poll_votes.poll_id
      AND rm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can vote" ON public.poll_votes;
CREATE POLICY "Members can vote" ON public.poll_votes
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.polls p
      JOIN public.room_members rm ON rm.room_id = p.room_id
      WHERE p.id = poll_votes.poll_id
      AND rm.user_id = auth.uid()
      AND (p.closes_at IS NULL OR p.closes_at > NOW())
      AND p.is_closed = false
    )
  );

DROP POLICY IF EXISTS "Users can delete their votes" ON public.poll_votes;
CREATE POLICY "Users can delete their votes" ON public.poll_votes
  FOR DELETE USING (user_id = auth.uid());

-- ============================================
-- 4. TOPICS (Темы/топики)
-- ============================================

CREATE TABLE IF NOT EXISTS public.room_topics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '💬',
  description TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL NOT NULL,
  is_closed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Добавляем topic_id к сообщениям
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS topic_id UUID REFERENCES public.room_topics(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_topics_room ON public.room_topics(room_id);
CREATE INDEX IF NOT EXISTS idx_messages_topic ON public.messages(topic_id);

-- RLS для topics
ALTER TABLE public.room_topics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Topics viewable by room members" ON public.room_topics;
CREATE POLICY "Topics viewable by room members" ON public.room_topics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.room_members
      WHERE room_id = room_topics.room_id
      AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can create topics" ON public.room_topics;
CREATE POLICY "Admins can create topics" ON public.room_topics
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.room_members
      WHERE room_id = room_topics.room_id
      AND user_id = auth.uid()
      AND role IN ('creator', 'admin')
    )
  );

DROP POLICY IF EXISTS "Admins can update topics" ON public.room_topics;
CREATE POLICY "Admins can update topics" ON public.room_topics
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.room_members
      WHERE room_id = room_topics.room_id
      AND user_id = auth.uid()
      AND role IN ('creator', 'admin')
    )
  );

-- Realtime subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE public.invite_links;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_audit_log;
ALTER PUBLICATION supabase_realtime ADD TABLE public.polls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.poll_votes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_topics;

-- Комментарии для документации
COMMENT ON TABLE public.invite_links IS 'Пригласительные ссылки для групп';
COMMENT ON TABLE public.room_audit_log IS 'История изменений в группах';
COMMENT ON TABLE public.polls IS 'Опросы в группах';
COMMENT ON TABLE public.poll_votes IS 'Голоса в опросах';
COMMENT ON TABLE public.room_topics IS 'Темы/топики в супергруппах';

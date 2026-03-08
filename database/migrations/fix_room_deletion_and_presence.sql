-- =============================================================
-- FIX: Room Deletion Trigger Conflict & Presence Defaults
-- =============================================================

-- 1. Fix log_member_changes trigger function
-- We must NOT log member removal if the ROOM itself is being deleted, 
-- otherwise the FK constraint room_audit_log -> rooms fails.

CREATE OR REPLACE FUNCTION public.log_member_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- If we are deleting a member, check if the room still exists
  -- If it doesn't, it means we are in a cascading delete of the room itself
  -- and we should SKIP logging the member removal.
  IF TG_OP = 'DELETE' THEN
    IF NOT EXISTS (SELECT 1 FROM public.rooms WHERE id = OLD.room_id) THEN
      RETURN OLD;
    END IF;

    INSERT INTO public.room_audit_log (room_id, user_id, action, target_user_id, details)
    VALUES (
      OLD.room_id,
      auth.uid(),
      'member_removed',
      OLD.user_id,
      jsonb_build_object('role', OLD.role)
    );
    RETURN OLD;
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.room_audit_log (room_id, user_id, action, target_user_id, details)
    VALUES (
      NEW.room_id,
      auth.uid(),
      'member_added',
      NEW.user_id,
      jsonb_build_object('role', NEW.role)
    );
    RETURN NEW;
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
    RETURN NEW;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fix Default User Status
-- Change default status to 'offline' to prevent new/inactive users from showing as 'online'
ALTER TABLE public.users ALTER COLUMN status SET DEFAULT 'offline';

-- 3. Reset all stuck 'online' statuses to 'offline'
-- This is a one-time cleanup. Live heartbeats will set them back to 'online'.
UPDATE public.users SET status = 'offline' WHERE status = 'online';

-- 4. Set replica identity to FULL for audit log if not set (for realtime)
ALTER TABLE public.room_audit_log REPLICA IDENTITY FULL;

-- 5. Robust Trigger for new users (ensure metadata isn't required)
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, username)
  VALUES (
    new.id, 
    COALESCE(
      new.raw_user_meta_data->>'username', 
      SPLIT_PART(new.email, '@', 1),
      'user_' || substr(new.id::text, 1, 8)
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Fix for EXISTING accounts with missing public.users records
INSERT INTO public.users (id, username)
SELECT 
    id, 
    COALESCE(
        raw_user_meta_data->>'username', 
        SPLIT_PART(email, '@', 1),
        'user_' || substr(id::text, 1, 8)
    )
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 7. Ensure everyone has a presence record
INSERT INTO public.user_presence (user_id, status, last_seen, updated_at)
SELECT id, 'offline', now(), now()
FROM public.users
ON CONFLICT (user_id) DO NOTHING;

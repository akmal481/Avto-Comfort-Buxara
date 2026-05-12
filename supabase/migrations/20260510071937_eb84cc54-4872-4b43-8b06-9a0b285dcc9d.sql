
-- 1. Profiles ga maydonlar qo'shish
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_blocked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS blocked_at timestamptz,
  ADD COLUMN IF NOT EXISTS blocked_reason text,
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS is_suspicious boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cancelled_orders_count integer NOT NULL DEFAULT 0;

-- 2. Activity log
CREATE TABLE IF NOT EXISTS public.user_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activity_user ON public.user_activity_log(user_id, created_at DESC);
ALTER TABLE public.user_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own activity"
  ON public.user_activity_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own activity"
  ON public.user_activity_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage activity"
  ON public.user_activity_log FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. Broadcasts
CREATE TABLE IF NOT EXISTS public.admin_broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  sent_by uuid NOT NULL,
  recipients_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_broadcasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage broadcasts"
  ON public.admin_broadcasts FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 4. Trigger: cancelled order -> suspicious counter
CREATE OR REPLACE FUNCTION public.mark_suspicious_on_cancel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'cancelled' AND (OLD.status IS DISTINCT FROM 'cancelled') AND NEW.user_id IS NOT NULL THEN
    UPDATE public.profiles
      SET cancelled_orders_count = cancelled_orders_count + 1,
          is_suspicious = (cancelled_orders_count + 1) >= 3
      WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mark_suspicious ON public.orders;
CREATE TRIGGER trg_mark_suspicious
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.mark_suspicious_on_cancel();

-- 5. Block enforcement on profile updates and orders
CREATE POLICY "Blocked users cannot create orders"
  ON public.orders FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND is_blocked = true
    )
  );

-- 6. Admin can update profiles (for block/unblock)
CREATE POLICY "Admins update profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 7. RPC: get users with stats (admin only)
CREATE OR REPLACE FUNCTION public.get_users_with_stats()
RETURNS TABLE (
  user_id uuid,
  display_name text,
  phone text,
  avatar_url text,
  created_at timestamptz,
  last_seen_at timestamptz,
  is_blocked boolean,
  blocked_at timestamptz,
  blocked_reason text,
  is_suspicious boolean,
  cancelled_orders_count integer,
  orders_count bigint,
  total_spent bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    p.user_id,
    p.display_name,
    p.phone,
    p.avatar_url,
    p.created_at,
    p.last_seen_at,
    p.is_blocked,
    p.blocked_at,
    p.blocked_reason,
    p.is_suspicious,
    p.cancelled_orders_count,
    COALESCE(o.cnt, 0) AS orders_count,
    COALESCE(o.sum_total, 0) AS total_spent
  FROM public.profiles p
  LEFT JOIN (
    SELECT user_id, COUNT(*) AS cnt, SUM(total) AS sum_total
    FROM public.orders
    WHERE user_id IS NOT NULL
    GROUP BY user_id
  ) o ON o.user_id = p.user_id
  ORDER BY p.created_at DESC;
END;
$$;

-- 8. Helper: update last_seen_at
CREATE OR REPLACE FUNCTION public.touch_last_seen()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles SET last_seen_at = now() WHERE user_id = auth.uid();
$$;


-- Telegram users mapping (phone <-> chat_id)
CREATE TABLE public.telegram_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL UNIQUE,
  telegram_chat_id bigint NOT NULL,
  telegram_username text,
  first_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_telegram_users_chat_id ON public.telegram_users(telegram_chat_id);
ALTER TABLE public.telegram_users ENABLE ROW LEVEL SECURITY;
-- No public policies; only service role (edge functions) can access

-- OTP codes
CREATE TABLE public.otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts int NOT NULL DEFAULT 0,
  consumed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_otp_codes_phone ON public.otp_codes(phone, created_at DESC);
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

-- Rate limiting log
CREATE TABLE public.otp_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_otp_rate_limits_phone_time ON public.otp_rate_limits(phone, sent_at DESC);
ALTER TABLE public.otp_rate_limits ENABLE ROW LEVEL SECURITY;

-- updated_at trigger for telegram_users
CREATE TRIGGER update_telegram_users_updated_at
BEFORE UPDATE ON public.telegram_users
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

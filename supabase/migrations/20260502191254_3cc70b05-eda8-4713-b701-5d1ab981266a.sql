
-- Enum for credential status
CREATE TYPE public.credential_status AS ENUM ('pending', 'verified', 'revoked');

-- Enum for verification result
CREATE TYPE public.verification_result AS ENUM ('valid', 'invalid', 'expired', 'revoked');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT '',
  bio TEXT DEFAULT '',
  github_username TEXT DEFAULT '',
  webhook_url TEXT,
  webhook_secret TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Credentials table (verifiable credentials)
CREATE TABLE public.credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credential_type TEXT NOT NULL DEFAULT 'contributor_identity',
  subject JSONB NOT NULL DEFAULT '{}'::jsonb,
  issuer TEXT NOT NULL DEFAULT 'hiero',
  status public.credential_status NOT NULL DEFAULT 'pending',
  issued_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  credential_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Verification logs table
CREATE TABLE public.verification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credential_id UUID NOT NULL REFERENCES public.credentials(id) ON DELETE CASCADE,
  verifier_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  result public.verification_result NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Webhook delivery logs
CREATE TABLE public.webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status_code INT,
  response_body TEXT,
  error TEXT,
  delivered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update their own profile
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Credentials: users can read their own, anyone authenticated can verify
CREATE POLICY "Users can read own credentials" ON public.credentials FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own credentials" ON public.credentials FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own credentials" ON public.credentials FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Verification logs: credential owner and verifier can read
CREATE POLICY "Users can read verification logs for own credentials" ON public.verification_logs FOR SELECT TO authenticated
  USING (
    verifier_id = auth.uid() OR
    credential_id IN (SELECT id FROM public.credentials WHERE user_id = auth.uid())
  );
CREATE POLICY "Authenticated users can insert verification logs" ON public.verification_logs FOR INSERT TO authenticated WITH CHECK (true);

-- Webhook logs: users can read their own
CREATE POLICY "Users can read own webhook logs" ON public.webhook_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own webhook logs" ON public.webhook_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, ''));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER credentials_updated_at BEFORE UPDATE ON public.credentials FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

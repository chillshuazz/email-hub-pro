
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "users see own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Auto-assign 'user' role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- SMTP accounts
CREATE TYPE public.smtp_status AS ENUM ('unknown', 'checking', 'ok', 'error');

CREATE TABLE public.smtp_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  host TEXT NOT NULL,
  port INT NOT NULL,
  secure BOOLEAN NOT NULL DEFAULT false,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  from_email TEXT NOT NULL,
  from_name TEXT,
  status smtp_status NOT NULL DEFAULT 'unknown',
  last_checked TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.smtp_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "smtp own select" ON public.smtp_accounts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "smtp own insert" ON public.smtp_accounts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "smtp own update" ON public.smtp_accounts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "smtp own delete" ON public.smtp_accounts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Contact lists
CREATE TABLE public.contact_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.contact_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lists own select" ON public.contact_lists FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "lists own insert" ON public.contact_lists FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "lists own update" ON public.contact_lists FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "lists own delete" ON public.contact_lists FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES public.contact_lists(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  phone TEXT,
  extra JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(list_id, email)
);
CREATE INDEX idx_contacts_list ON public.contacts(list_id);
CREATE INDEX idx_contacts_user ON public.contacts(user_id);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contacts own select" ON public.contacts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "contacts own insert" ON public.contacts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "contacts own update" ON public.contacts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "contacts own delete" ON public.contacts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Campaigns
CREATE TYPE public.campaign_status AS ENUM ('draft', 'sending', 'sent', 'failed');
CREATE TYPE public.send_status AS ENUM ('pending', 'sent', 'failed');

CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  smtp_id UUID NOT NULL REFERENCES public.smtp_accounts(id) ON DELETE RESTRICT,
  list_id UUID NOT NULL REFERENCES public.contact_lists(id) ON DELETE RESTRICT,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  is_html BOOLEAN NOT NULL DEFAULT false,
  rate_per_minute INT NOT NULL DEFAULT 60,
  status campaign_status NOT NULL DEFAULT 'draft',
  total_recipients INT NOT NULL DEFAULT 0,
  sent_count INT NOT NULL DEFAULT 0,
  failed_count INT NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "camp own select" ON public.campaigns FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "camp own insert" ON public.campaigns FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "camp own update" ON public.campaigns FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "camp own delete" ON public.campaigns FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.campaign_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  status send_status NOT NULL DEFAULT 'pending',
  error TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sends_campaign ON public.campaign_sends(campaign_id);
ALTER TABLE public.campaign_sends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sends own select" ON public.campaign_sends FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "sends own insert" ON public.campaign_sends FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Autodetect job log (real-time progress streaming via polling)
CREATE TABLE public.smtp_detect_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  result JSONB,
  smtp_account_id UUID REFERENCES public.smtp_accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.smtp_detect_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jobs own select" ON public.smtp_detect_jobs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "jobs own insert" ON public.smtp_detect_jobs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "jobs own update" ON public.smtp_detect_jobs FOR UPDATE TO authenticated USING (auth.uid() = user_id);

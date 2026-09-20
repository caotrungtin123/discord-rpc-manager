
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  discord_id TEXT UNIQUE,
  username TEXT,
  avatar_url TEXT,
  sync_mode BOOLEAN NOT NULL DEFAULT true,
  active_preset_id UUID,
  runner_key TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.presets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'RPC mới',
  activity_name TEXT NOT NULL DEFAULT 'Sleep',
  text_1 TEXT NOT NULL DEFAULT '',
  text_2 TEXT NOT NULL DEFAULT '',
  text_3 TEXT NOT NULL DEFAULT '',
  big_img TEXT NOT NULL DEFAULT '',
  small_img TEXT NOT NULL DEFAULT '',
  button_1_name TEXT NOT NULL DEFAULT '',
  button_1_url TEXT NOT NULL DEFAULT '',
  button_2_name TEXT NOT NULL DEFAULT '',
  button_2_url TEXT NOT NULL DEFAULT '',
  platform TEXT NOT NULL DEFAULT 'desktop',
  duration INTEGER NOT NULL DEFAULT 1800,
  elapsed INTEGER NOT NULL DEFAULT 0,
  spoof_device BOOLEAN NOT NULL DEFAULT true,
  city TEXT NOT NULL DEFAULT 'default',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.presets TO authenticated;
GRANT ALL ON public.presets TO service_role;
ALTER TABLE public.presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "presets_own" ON public.presets FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'Token',
  masked TEXT NOT NULL DEFAULT '',
  enabled BOOLEAN NOT NULL DEFAULT true,
  preset_id UUID REFERENCES public.presets(id) ON DELETE SET NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE, DELETE ON public.tokens TO authenticated;
GRANT ALL ON public.tokens TO service_role;
ALTER TABLE public.tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tokens_select_own" ON public.tokens FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "tokens_update_own" ON public.tokens FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tokens_delete_own" ON public.tokens FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.token_secrets (
  token_id UUID NOT NULL PRIMARY KEY REFERENCES public.tokens(id) ON DELETE CASCADE,
  ciphertext TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.token_secrets TO service_role;
ALTER TABLE public.token_secrets ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_active_preset_fk
  FOREIGN KEY (active_preset_id) REFERENCES public.presets(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER presets_touch BEFORE UPDATE ON public.presets FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER tokens_touch BEFORE UPDATE ON public.tokens FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.limit_presets()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF (SELECT count(*) FROM public.presets WHERE user_id = NEW.user_id) >= 5 THEN
    RAISE EXCEPTION 'Tối đa 5 mẫu RPC';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER presets_limit BEFORE INSERT ON public.presets FOR EACH ROW EXECUTE FUNCTION public.limit_presets();

CREATE OR REPLACE FUNCTION public.limit_tokens()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF (SELECT count(*) FROM public.tokens WHERE user_id = NEW.user_id) >= 5 THEN
    RAISE EXCEPTION 'Tối đa 5 token';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER tokens_limit BEFORE INSERT ON public.tokens FOR EACH ROW EXECUTE FUNCTION public.limit_tokens();

CREATE INDEX presets_user_idx ON public.presets(user_id);
CREATE INDEX tokens_user_idx ON public.tokens(user_id);

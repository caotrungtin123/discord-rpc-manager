
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.voice_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  token_id UUID REFERENCES public.tokens(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT '',
  guild_id TEXT NOT NULL DEFAULT '',
  channel_id TEXT NOT NULL DEFAULT '',
  mic_enabled BOOLEAN NOT NULL DEFAULT false,
  camera_enabled BOOLEAN NOT NULL DEFAULT false,
  screen_share_enabled BOOLEAN NOT NULL DEFAULT false,
  running BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'idle',
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.voice_sessions TO authenticated;
GRANT ALL ON public.voice_sessions TO service_role;
ALTER TABLE public.voice_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own voice sessions" ON public.voice_sessions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.quest_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  token_id UUID REFERENCES public.tokens(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT '',
  auto_run BOOLEAN NOT NULL DEFAULT false,
  scan_requested BOOLEAN NOT NULL DEFAULT false,
  run_requested BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'idle',
  last_scan_at TIMESTAMPTZ,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quest_jobs TO authenticated;
GRANT ALL ON public.quest_jobs TO service_role;
ALTER TABLE public.quest_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own quest jobs" ON public.quest_jobs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.quest_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  job_id UUID NOT NULL REFERENCES public.quest_jobs(id) ON DELETE CASCADE,
  quest_id TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  game TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  progress INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (job_id, quest_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quest_items TO authenticated;
GRANT ALL ON public.quest_items TO service_role;
ALTER TABLE public.quest_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own quest items" ON public.quest_items FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_voice_sessions_updated BEFORE UPDATE ON public.voice_sessions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_quest_jobs_updated BEFORE UPDATE ON public.quest_jobs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_quest_items_updated BEFORE UPDATE ON public.quest_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

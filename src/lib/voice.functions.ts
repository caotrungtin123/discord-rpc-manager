import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SELECT =
  "id, token_id, label, guild_id, channel_id, mic_enabled, camera_enabled, screen_share_enabled, running, status, last_seen_at";

export const listVoiceSessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("voice_sessions")
      .select(SELECT)
      .eq("user_id", context.userId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const createSchema = z.object({
  token_id: z.string().uuid(),
  label: z.string().trim().max(60).default(""),
  guild_id: z.string().trim().max(40).default(""),
  channel_id: z.string().trim().max(40).default(""),
});

export const createVoiceSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { count } = await context.supabase
      .from("voice_sessions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", context.userId);
    if ((count ?? 0) >= 5) throw new Error("Tối đa 5 phiên voice");

    const { data: row, error } = await context.supabase
      .from("voice_sessions")
      .insert({ ...data, user_id: context.userId })
      .select(SELECT)
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

const updateSchema = z.object({
  id: z.string().uuid(),
  label: z.string().trim().max(60).optional(),
  guild_id: z.string().trim().max(40).optional(),
  channel_id: z.string().trim().max(40).optional(),
  token_id: z.string().uuid().nullable().optional(),
  mic_enabled: z.boolean().optional(),
  camera_enabled: z.boolean().optional(),
  screen_share_enabled: z.boolean().optional(),
  running: z.boolean().optional(),
});

export const updateVoiceSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updateSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const patch = Object.fromEntries(
      Object.entries(rest).filter(([, v]) => v !== undefined),
    ) as Record<string, unknown>;
    const { data: row, error } = await context.supabase
      .from("voice_sessions")
      .update(patch)
      .eq("id", id)
      .eq("user_id", context.userId)
      .select(SELECT)
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteVoiceSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("voice_sessions")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

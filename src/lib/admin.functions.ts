import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const presetFields = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(80),
  activity_name: z.string().max(128),
  text_1: z.string().max(128),
  text_2: z.string().max(128),
  text_3: z.string().max(128),
  big_img: z.string().max(500),
  small_img: z.string().max(500),
  button_1_name: z.string().max(32),
  button_1_url: z.string().max(500),
  button_2_name: z.string().max(32),
  button_2_url: z.string().max(500),
  platform: z.string().max(40),
  duration: z.number().int().min(0).max(31_536_000),
  elapsed: z.number().int().min(0).max(31_536_000),
  spoof_device: z.boolean(),
  city: z.string().max(100),
  city_enabled: z.boolean(),
});

async function requireOwner(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "owner")
    .maybeSingle();
  if (error || !data) throw new Error("Bạn không có quyền quản trị");
}

export const getAdminUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireOwner(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: profiles, error: profilesError }, { data: presets }, { data: tokens }] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("id, discord_id, username, avatar_url, sync_mode, active_preset_id, rpc_running, created_at, updated_at")
        .order("created_at", { ascending: false }),
      supabaseAdmin.from("presets").select("*").order("position", { ascending: true }),
      supabaseAdmin.from("tokens").select("id, user_id, label, masked, enabled, preset_id, position").order("position", { ascending: true }),
    ]);
    if (profilesError) throw new Error("Không tải được danh sách người dùng");
    return (profiles ?? []).map((profile) => ({
      ...profile,
      presets: (presets ?? []).filter((preset) => preset.user_id === profile.id),
      tokens: (tokens ?? []).filter((token) => token.user_id === profile.id),
    }));
  });

const profileUpdateSchema = z.object({
  userId: z.string().uuid(),
  rpc_running: z.boolean().optional(),
  sync_mode: z.boolean().optional(),
  active_preset_id: z.string().uuid().nullable().optional(),
});

export const adminUpdateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => profileUpdateSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireOwner(context);
    const changes = {
      ...(data.rpc_running === undefined ? {} : { rpc_running: data.rpc_running }),
      ...(data.sync_mode === undefined ? {} : { sync_mode: data.sync_mode }),
      ...(data.active_preset_id === undefined ? {} : { active_preset_id: data.active_preset_id }),
    };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("profiles").update(changes).eq("id", data.userId);
    if (error) throw new Error("Không cập nhật được người dùng");
    return { ok: true };
  });

export const adminUpdatePreset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ userId: z.string().uuid(), preset: presetFields }).parse(input))
  .handler(async ({ data, context }) => {
    await requireOwner(context);
    const { id, ...changes } = data.preset;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("presets").update(changes).eq("id", id).eq("user_id", data.userId);
    if (error) throw new Error("Không lưu được mẫu RPC");
    return { ok: true };
  });

export const adminUpdateToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ userId: z.string().uuid(), tokenId: z.string().uuid(), enabled: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    await requireOwner(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("tokens").update({ enabled: data.enabled }).eq("id", data.tokenId).eq("user_id", data.userId);
    if (error) throw new Error("Không cập nhật được token");
    return { ok: true };
  });

export const adminDeleteItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.discriminatedUnion("type", [
    z.object({ type: z.literal("preset"), userId: z.string().uuid(), id: z.string().uuid() }),
    z.object({ type: z.literal("token"), userId: z.string().uuid(), id: z.string().uuid() }),
    z.object({ type: z.literal("user"), userId: z.string().uuid(), id: z.string().uuid() }),
  ]).parse(input))
  .handler(async ({ data, context }) => {
    await requireOwner(context);
    if (data.type === "user" && data.id === context.userId) throw new Error("Không thể xóa tài khoản owner đang đăng nhập");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.type === "user") {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(data.id);
      if (error) throw new Error("Không xóa được người dùng");
    } else {
      const table = data.type === "preset" ? "presets" : "tokens";
      const { error } = await supabaseAdmin.from(table).delete().eq("id", data.id).eq("user_id", data.userId);
      if (error) throw new Error(`Không xóa được ${data.type === "preset" ? "mẫu" : "token"}`);
    }
    return { ok: true };
  });
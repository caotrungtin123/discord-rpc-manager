import type { SupabaseClient } from "@supabase/supabase-js";

export type RunnerProfile = { id: string; username: string | null };

export function readRunnerKey(request: Request): string {
  return (
    request.headers.get("x-runner-key") ??
    new URL(request.url).searchParams.get("key") ??
    ""
  );
}

export async function authenticateRunner(request: Request): Promise<
  | { ok: true; profile: RunnerProfile; admin: SupabaseClient<any, any, any> }
  | { ok: false; response: Response }
> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Cách 1: phiên đăng nhập của chính người dùng (Bearer token) — không cần khoá runner.
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (bearer.length > 20) {
    const { data, error } = await supabaseAdmin.auth.getUser(bearer);
    if (!error && data.user) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("id, username")
        .eq("id", data.user.id)
        .maybeSingle();
      if (profile) {
        return { ok: true, profile, admin: supabaseAdmin as unknown as SupabaseClient<any, any, any> };
      }
    }
  }

  // Cách 2 (tuỳ chọn, cho bot chạy trên host riêng): khoá runner.
  const key = readRunnerKey(request);
  if (key.length >= 20) {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, username")
      .eq("runner_key", key)
      .maybeSingle();
    if (profile) {
      return { ok: true, profile, admin: supabaseAdmin as unknown as SupabaseClient<any, any, any> };
    }
  }

  return { ok: false, response: Response.json({ error: "unauthorized" }, { status: 401 }) };
}

export function jsonNoStore(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

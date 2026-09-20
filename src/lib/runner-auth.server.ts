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
  const key = readRunnerKey(request);
  if (key.length < 20) {
    return { ok: false, response: Response.json({ error: "missing runner key" }, { status: 401 }) };
  }
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, username")
    .eq("runner_key", key)
    .maybeSingle();
  if (!profile) {
    return { ok: false, response: Response.json({ error: "invalid runner key" }, { status: 401 }) };
  }
  return { ok: true, profile, admin: supabaseAdmin as unknown as SupabaseClient<any, any, any> };
}

export function jsonNoStore(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

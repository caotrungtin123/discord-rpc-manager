import { createFileRoute } from "@tanstack/react-router";

type PresetRow = {
  id: string;
  name: string;
  activity_name: string;
  text_1: string;
  text_2: string;
  text_3: string;
  big_img: string;
  small_img: string;
  button_1_name: string;
  button_1_url: string;
  button_2_name: string;
  button_2_url: string;
  platform: string;
  duration: number;
  elapsed: number;
  spoof_device: boolean;
  city: string;
  city_enabled: boolean;
};

function presetPayload(p: PresetRow) {
  return {
    id: p.id,
    label: p.name,
    name: p.activity_name,
    platform: p.platform === "desktop" ? "" : p.platform,
    "text-1": p.text_1,
    "text-2": p.text_2,
    "text-3": p.text_3,
    bigimg: p.big_img,
    smallimg: p.small_img,
    "button-1": p.button_1_name ? { name: p.button_1_name, url: p.button_1_url } : null,
    "button-2": p.button_2_name ? { name: p.button_2_name, url: p.button_2_url } : null,
    options: {
      duration: p.duration,
      elapsed: p.elapsed,
      spoof_device: p.spoof_device,
    },
    city: p.city_enabled ? p.city : "",
    city_enabled: p.city_enabled,
  };
}

export const Route = createFileRoute("/api/public/runner/config")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const key =
          request.headers.get("x-runner-key") ??
          new URL(request.url).searchParams.get("key") ??
          "";
        if (key.length < 20) {
          return Response.json({ error: "missing runner key" }, { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("id, username, sync_mode, active_preset_id, rpc_running")
          .eq("runner_key", key)
          .maybeSingle();
        if (!profile) return Response.json({ error: "invalid runner key" }, { status: 401 });

        const { data: presets } = await supabaseAdmin
          .from("presets")
          .select("*")
          .eq("user_id", profile.id)
          .order("position", { ascending: true });

        const { data: tokens } = await supabaseAdmin
          .from("tokens")
          .select("id, label, enabled, preset_id")
          .eq("user_id", profile.id)
          .eq("enabled", true)
          .order("position", { ascending: true });

        const runnableTokens = profile.rpc_running ? (tokens ?? []) : [];
        const ids = runnableTokens.map((t) => t.id);
        const { data: secrets } = ids.length
          ? await supabaseAdmin.from("token_secrets").select("token_id, ciphertext").in("token_id", ids)
          : { data: [] as { token_id: string; ciphertext: string }[] };

        const { decryptToken } = await import("@/lib/crypto.server");
        const presetList = (presets ?? []) as PresetRow[];
        const byId = new Map(presetList.map((p) => [p.id, p]));
        const fallback = presetList.find((p) => p.id === profile.active_preset_id) ?? presetList[0];

        const out: {
          account: string | null;
          sync_mode: boolean;
          running: boolean;
          tokens: { label: string; token: string; config: ReturnType<typeof presetPayload> }[];
        } = { account: profile.username, sync_mode: profile.sync_mode, running: profile.rpc_running, tokens: [] };

        for (const token of runnableTokens) {
          const cipher = (secrets ?? []).find((s) => s.token_id === token.id)?.ciphertext;
          if (!cipher) continue;
          const preset = profile.sync_mode
            ? fallback
            : ((token.preset_id ? byId.get(token.preset_id) : undefined) ?? fallback);
          if (!preset) continue;
          try {
            out.tokens.push({
              label: token.label,
              token: await decryptToken(cipher),
              config: presetPayload(preset),
            });
          } catch {
            // bỏ qua token không giải mã được
          }
        }

        return new Response(JSON.stringify(out), {
          headers: { "content-type": "application/json", "cache-control": "no-store" },
        });
      },
    },
  },
});

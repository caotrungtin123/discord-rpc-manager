import { createFileRoute } from "@tanstack/react-router";
import { authenticateRunner, jsonNoStore } from "@/lib/runner-auth.server";

/**
 * GET  /api/public/runner/voice  -> danh sách phiên voice cần chạy (kèm token gốc)
 * POST /api/public/runner/voice  -> runner báo trạng thái phiên voice về web
 *
 * Xác thực: header `x-runner-key` (hoặc ?key=) = runner_key của user.
 */
export const Route = createFileRoute("/api/public/runner/voice")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await authenticateRunner(request);
        if (!auth.ok) return auth.response;
        const { admin, profile } = auth;

        const { data: sessions } = await admin
          .from("voice_sessions")
          .select(
            "id, token_id, label, guild_id, channel_id, mic_enabled, camera_enabled, screen_share_enabled, running, status",
          )
          .eq("user_id", profile.id)
          .order("created_at", { ascending: true });

        const list = (sessions ?? []) as any[];
        const tokenIds = list.map((s) => s.token_id).filter(Boolean) as string[];
        const { data: secrets } = tokenIds.length
          ? await admin.from("token_secrets").select("token_id, ciphertext").in("token_id", tokenIds)
          : { data: [] as { token_id: string; ciphertext: string }[] };

        const { decryptToken } = await import("@/lib/crypto.server");
        const out: any[] = [];
        for (const s of list) {
          const cipher = (secrets ?? []).find((x) => x.token_id === s.token_id)?.ciphertext;
          let token: string | null = null;
          if (cipher) {
            try {
              token = await decryptToken(cipher);
            } catch {
              token = null;
            }
          }
          out.push({
            id: s.id,
            label: s.label,
            token_id: s.token_id,
            token: s.running ? token : null,
            guild_id: s.guild_id,
            channel_id: s.channel_id,
            mic: s.mic_enabled,
            camera: s.camera_enabled,
            screen_share: s.screen_share_enabled,
            running: s.running,
            status: s.status,
          });
        }

        return jsonNoStore({ account: profile.username, sessions: out });
      },

      POST: async ({ request }) => {
        const auth = await authenticateRunner(request);
        if (!auth.ok) return auth.response;
        const { admin, profile } = auth;

        let body: any;
        try {
          body = await request.json();
        } catch {
          return jsonNoStore({ error: "invalid json" }, 400);
        }

        const reports: any[] = Array.isArray(body?.sessions) ? body.sessions : [body];
        const updated: string[] = [];
        for (const r of reports) {
          if (!r?.id || typeof r.id !== "string") continue;
          const patch: Record<string, unknown> = { last_seen_at: new Date().toISOString() };
          if (typeof r.status === "string") patch["status"] = r.status.slice(0, 40);
          if (typeof r.running === "boolean") patch["running"] = r.running;
          if (typeof r.mic === "boolean") patch["mic_enabled"] = r.mic;
          if (typeof r.camera === "boolean") patch["camera_enabled"] = r.camera;
          if (typeof r.screen_share === "boolean") patch["screen_share_enabled"] = r.screen_share;
          const { error } = await admin
            .from("voice_sessions")
            .update(patch)
            .eq("id", r.id)
            .eq("user_id", profile.id);
          if (!error) updated.push(r.id);
        }
        return jsonNoStore({ updated });
      },
    },
  },
});

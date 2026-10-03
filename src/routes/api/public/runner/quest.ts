import { createFileRoute } from "@tanstack/react-router";
import { authenticateRunner, jsonNoStore } from "@/lib/runner-auth.server";

/**
 * GET  /api/public/runner/quest  -> các job quest cùng cờ scan_requested / run_requested
 * POST /api/public/runner/quest  -> runner gửi kết quả quét quest hoặc kết quả làm quest
 *
 * Xác thực: Bearer token phiên đăng nhập của user (không cần khoá),
 * hoặc header `x-runner-key` (hoặc ?key=) = runner_key cho bot chạy trên host riêng.
 *
 * POST body:
 * {
 *   "job_id": "uuid",
 *   "action": "scan" | "run",
 *   "status": "scanning" | "running" | "idle" | "error",
 *   "quests": [{ "quest_id": "...", "name": "...", "game": "...", "status": "pending|completed|failed", "progress": 0-100, "expires_at": "ISO" }]
 * }
 */
export const Route = createFileRoute("/api/public/runner/quest")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await authenticateRunner(request);
        if (!auth.ok) return auth.response;
        const { admin, profile } = auth;

        const { data: jobs } = await admin
          .from("quest_jobs")
          .select("id, token_id, label, auto_run, scan_requested, run_requested, status, last_scan_at, last_run_at")
          .eq("user_id", profile.id)
          .order("created_at", { ascending: true });

        const list = (jobs ?? []) as any[];
        const tokenIds = list.map((j) => j.token_id).filter(Boolean) as string[];
        const { data: secrets } = tokenIds.length
          ? await admin.from("token_secrets").select("token_id, ciphertext").in("token_id", tokenIds)
          : { data: [] as { token_id: string; ciphertext: string }[] };

        const { data: items } = await admin
          .from("quest_items")
          .select("id, job_id, quest_id, name, game, status, progress, expires_at")
          .eq("user_id", profile.id);

        const { decryptToken } = await import("@/lib/crypto.server");
        const out: any[] = [];
        for (const j of list) {
          const cipher = (secrets ?? []).find((x) => x.token_id === j.token_id)?.ciphertext;
          let token: string | null = null;
          if (cipher) {
            try {
              token = await decryptToken(cipher);
            } catch {
              token = null;
            }
          }
          const jobItems = (items ?? []).filter((i: any) => i.job_id === j.id);
          out.push({
            id: j.id,
            label: j.label,
            token_id: j.token_id,
            token,
            auto_run: j.auto_run,
            scan_requested: j.scan_requested,
            run_requested: j.run_requested,
            status: j.status,
            last_scan_at: j.last_scan_at,
            last_run_at: j.last_run_at,
            quests: jobItems,
            pending_count: jobItems.filter((i: any) => i.status !== "completed").length,
          });
        }

        return jsonNoStore({ account: profile.username, jobs: out });
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
        const jobId = typeof body?.job_id === "string" ? body.job_id : "";
        if (!jobId) return jsonNoStore({ error: "job_id required" }, 400);

        const { data: job } = await admin
          .from("quest_jobs")
          .select("id")
          .eq("id", jobId)
          .eq("user_id", profile.id)
          .maybeSingle();
        if (!job) return jsonNoStore({ error: "job not found" }, 404);

        const now = new Date().toISOString();
        const patch: Record<string, unknown> = {};
        if (typeof body.status === "string") patch["status"] = body.status.slice(0, 40);
        if (body.action === "scan") {
          patch["scan_requested"] = false;
          patch["last_scan_at"] = now;
        }
        if (body.action === "run") {
          patch["run_requested"] = false;
          patch["last_run_at"] = now;
        }
        if (Object.keys(patch).length) {
          await admin.from("quest_jobs").update(patch).eq("id", jobId).eq("user_id", profile.id);
        }

        let saved = 0;
        if (Array.isArray(body.quests)) {
          const rows = body.quests
            .filter((q: any) => q && typeof q.quest_id === "string")
            .map((q: any) => ({
              user_id: profile.id,
              job_id: jobId,
              quest_id: String(q.quest_id).slice(0, 100),
              name: typeof q.name === "string" ? q.name.slice(0, 200) : "",
              game: typeof q.game === "string" ? q.game.slice(0, 200) : "",
              status: typeof q.status === "string" ? q.status.slice(0, 40) : "pending",
              progress: Number.isFinite(q.progress) ? Math.max(0, Math.min(100, Math.round(q.progress))) : 0,
              expires_at: typeof q.expires_at === "string" ? q.expires_at : null,
            }));
          if (rows.length) {
            const { error } = await admin
              .from("quest_items")
              .upsert(rows, { onConflict: "job_id,quest_id" });
            if (error) return jsonNoStore({ error: error.message }, 400);
            saved = rows.length;
          }
        }

        const { count } = await admin
          .from("quest_items")
          .select("id", { count: "exact", head: true })
          .eq("job_id", jobId)
          .neq("status", "completed");

        return jsonNoStore({ ok: true, saved, pending_count: count ?? 0 });
      },
    },
  },
});

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const addTokenSchema = z.object({
  label: z.string().trim().min(1).max(40),
  token: z.string().trim().min(20).max(200),
});

export const addToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => addTokenSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { count } = await context.supabase
      .from("tokens")
      .select("id", { count: "exact", head: true })
      .eq("user_id", context.userId);
    if ((count ?? 0) >= 5) throw new Error("Tối đa 5 token");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { encryptToken } = await import("@/lib/crypto.server");

    const masked = `${data.token.slice(0, 6)}••••${data.token.slice(-4)}`;
    const { data: row, error } = await supabaseAdmin
      .from("tokens")
      .insert({
        user_id: context.userId,
        label: data.label,
        masked,
        position: count ?? 0,
      })
      .select("id")
      .single();
    if (error || !row) throw new Error(error?.message ?? "Không lưu được token");

    const cipher = await encryptToken(data.token);
    const { error: secErr } = await supabaseAdmin
      .from("token_secrets")
      .insert({ token_id: row.id, ciphertext: cipher });
    if (secErr) {
      await supabaseAdmin.from("tokens").delete().eq("id", row.id);
      throw new Error("Không lưu được token");
    }
    return { id: row.id, masked };
  });

export const regenerateRunnerKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const key = Array.from(crypto.getRandomValues(new Uint8Array(24)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ runner_key: key })
      .eq("id", context.userId);
    if (error) throw new Error("Không tạo được khoá mới");
    return { runner_key: key };
  });

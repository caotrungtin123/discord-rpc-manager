import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const JOB_SELECT =
  "id, token_id, label, auto_run, scan_requested, run_requested, status, last_scan_at, last_run_at";

export const listQuestJobs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: jobs, error } = await context.supabase
      .from("quest_jobs")
      .select(JOB_SELECT)
      .eq("user_id", context.userId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    const { data: items } = await context.supabase
      .from("quest_items")
      .select("id, job_id, quest_id, name, game, status, progress, expires_at")
      .eq("user_id", context.userId);

    return (jobs ?? []).map((job) => {
      const quests = (items ?? []).filter((i) => i.job_id === job.id);
      return {
        ...job,
        quests,
        pending_count: quests.filter((q) => q.status !== "completed").length,
        completed_count: quests.filter((q) => q.status === "completed").length,
      };
    });
  });

export const createQuestJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ token_id: z.string().uuid(), label: z.string().trim().max(60).default("") })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { count } = await context.supabase
      .from("quest_jobs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", context.userId);
    if ((count ?? 0) >= 5) throw new Error("Tối đa 5 tài khoản Auto Quest");

    const { data: row, error } = await context.supabase
      .from("quest_jobs")
      .insert({ ...data, user_id: context.userId })
      .select(JOB_SELECT)
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateQuestJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        label: z.string().trim().max(60).optional(),
        token_id: z.string().uuid().nullable().optional(),
        auto_run: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { id, ...patch } = data;
    const { data: row, error } = await context.supabase
      .from("quest_jobs")
      .update(patch)
      .eq("id", id)
      .eq("user_id", context.userId)
      .select(JOB_SELECT)
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

/** Đặt cờ để runner quét quest chưa hoàn thành. */
export const requestQuestScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("quest_jobs")
      .update({ scan_requested: true, status: "scan_queued" })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Đặt cờ để runner bắt đầu làm quest. */
export const requestQuestRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), run: z.boolean().default(true) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("quest_jobs")
      .update({ run_requested: data.run, status: data.run ? "run_queued" : "idle" })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteQuestJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("quest_jobs")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

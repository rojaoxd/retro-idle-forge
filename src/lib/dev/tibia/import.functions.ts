// Server functions for the resumable Tibia.dat/.spr import.
// Heavy work lives in ./import.server.ts (loaded inside handlers via dynamic import).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BUCKET = "game-sprites";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Forbidden: admin only");
}

/** Return signed upload URLs so the browser can PUT dat/spr straight to storage. */
export const createImportUploadUrls = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({
    datFilename: z.string().min(1),
    sprFilename: z.string().min(1),
    otbFilename: z.string().optional(),
  }).parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const stamp = Date.now();
    const jobId = crypto.randomUUID();
    const prefix = `imports/${jobId}`;
    const datPath = `${prefix}/${stamp}-${data.datFilename}`;
    const sprPath = `${prefix}/${stamp}-${data.sprFilename}`;
    const otbPath = data.otbFilename ? `${prefix}/${stamp}-${data.otbFilename}` : null;

    const [dat, spr, otb] = await Promise.all([
      supabaseAdmin.storage.from(BUCKET).createSignedUploadUrl(datPath),
      supabaseAdmin.storage.from(BUCKET).createSignedUploadUrl(sprPath),
      otbPath ? supabaseAdmin.storage.from(BUCKET).createSignedUploadUrl(otbPath) : Promise.resolve({ data: null, error: null } as any),
    ]);
    if (dat.error) throw new Error(`dat: ${dat.error.message}`);
    if (spr.error) throw new Error(`spr: ${spr.error.message}`);
    if (otbPath && otb.error) throw new Error(`otb: ${otb.error.message}`);

    return {
      jobId,
      dat: { path: datPath, token: dat.data!.token },
      spr: { path: sprPath, token: spr.data!.token },
      otb: otbPath ? { path: otbPath, token: otb.data!.token } : null,
    };
  });

/** Create an import job row from previously uploaded files. */
export const createImportJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({
    jobId: z.string().uuid(),
    datPath: z.string().min(1),
    sprPath: z.string().min(1),
    otbPath: z.string().nullable().optional(),
    categories: z.object({
      item: z.boolean().default(true),
      outfit: z.boolean().default(true),
      effect: z.boolean().default(true),
      missile: z.boolean().default(true),
    }).default({ item: true, outfit: true, effect: true, missile: true }),
  }).parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("object_import_jobs")
      .insert({
        id: data.jobId,
        status: "pending",
        dat_path: data.datPath,
        spr_path: data.sprPath,
        otb_path: data.otbPath ?? null,
        categories: data.categories,
        created_by: context.userId,
      })
      .select().single();
    if (error) throw new Error(error.message);
    return { job: row };
  });

/** Run one batch. Idempotent: safe to call in a poll loop. */
export const processImportBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({
    jobId: z.string().uuid(),
    batchSize: z.number().int().min(1).max(200).default(20),
  }).parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { runImportBatch } = await import("@/lib/dev/tibia/import.server");
    return runImportBatch(data.jobId, data.batchSize);
  });

/** Pause / resume / cancel — status flip only. */
export const controlImportJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({
    jobId: z.string().uuid(),
    action: z.enum(["pause", "resume", "cancel"]),
  }).parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const newStatus =
      data.action === "pause" ? "paused" :
      data.action === "resume" ? "running" :
      "failed";
    const patch: any = { status: newStatus };
    if (data.action === "cancel") patch.error = "cancelled by user";
    if (data.action === "resume") patch.error = null;
    const { error } = await supabaseAdmin
      .from("object_import_jobs").update(patch).eq("id", data.jobId);
    if (error) throw new Error(error.message);
    return { ok: true, status: newStatus };
  });

export const getImportJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ jobId: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: job, error } = await supabaseAdmin
      .from("object_import_jobs").select("*").eq("id", data.jobId).maybeSingle();
    if (error) throw new Error(error.message);
    return { job };
  });

export const listImportJobs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("object_import_jobs").select("*")
      .order("created_at", { ascending: false }).limit(20);
    if (error) throw new Error(error.message);
    return { jobs: data ?? [] };
  });

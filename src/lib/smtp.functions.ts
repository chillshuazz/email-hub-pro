import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { autodetectSmtp, tryAuth, type DetectStep } from "./smtp.server";

const EmailSchema = z.string().trim().email().max(255);
const PasswordSchema = z.string().min(1).max(500);

/** Start an autodetect job. Returns jobId immediately; client polls smtp_detect_jobs row. */
export const startAutodetect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { email: string; password: string }) =>
    z.object({ email: EmailSchema, password: PasswordSchema }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: job, error } = await supabase
      .from("smtp_detect_jobs")
      .insert({ user_id: userId, email: data.email, status: "running", steps: [] })
      .select("id").single();
    if (error || !job) throw new Error(error?.message ?? "No se pudo crear el job");

    const jobId = job.id;
    const steps: DetectStep[] = [];

    // Run cascade in background; persist on every step.
    (async () => {
      try {
        const result = await autodetectSmtp(
          { email: data.email, password: data.password },
          async (s) => {
            steps.push(s);
            await supabase.from("smtp_detect_jobs").update({ steps, updated_at: new Date().toISOString() }).eq("id", jobId);
          },
        );

        let smtpAccountId: string | null = null;
        if (result.found && result.host && result.port !== undefined) {
          const { data: acc } = await supabase.from("smtp_accounts").insert({
            user_id: userId,
            label: data.email,
            host: result.host,
            port: result.port,
            secure: !!result.secure,
            username: data.email,
            password: data.password,
            from_email: data.email,
            status: "ok",
            last_checked: new Date().toISOString(),
          }).select("id").single();
          smtpAccountId = acc?.id ?? null;
        }

        await supabase.from("smtp_detect_jobs").update({
          status: result.found ? "found" : "failed",
          result,
          smtp_account_id: smtpAccountId,
          steps,
          updated_at: new Date().toISOString(),
        }).eq("id", jobId);
      } catch (e: any) {
        steps.push({ ts: Date.now(), level: "error", msg: `Error inesperado: ${e?.message ?? e}` });
        await supabase.from("smtp_detect_jobs").update({
          status: "failed",
          result: { found: false, error: e?.message ?? "Error desconocido" },
          steps,
        }).eq("id", jobId);
      }
    })();

    return { jobId };
  });

/** Verify an existing SMTP account by re-authenticating. */
export const verifySmtp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: acc, error } = await supabase.from("smtp_accounts")
      .select("*").eq("id", data.id).single();
    if (error || !acc) throw new Error("SMTP no encontrado");

    await supabase.from("smtp_accounts").update({ status: "checking" }).eq("id", data.id);
    const err = await tryAuth(acc.host, acc.port, acc.secure, acc.username, acc.password);
    const status = err ? "error" : "ok";
    await supabase.from("smtp_accounts").update({
      status, last_checked: new Date().toISOString(), last_error: err ?? null,
    }).eq("id", data.id);

    return { ok: !err, error: err };
  });

/** Manual create (advanced mode) with verification. */
export const createSmtpManual = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    label: z.string().trim().min(1).max(120),
    host: z.string().trim().min(1).max(255),
    port: z.number().int().min(1).max(65535),
    secure: z.boolean(),
    username: z.string().trim().min(1).max(255),
    password: z.string().min(1).max(500),
    from_email: z.string().trim().email().max(255),
    from_name: z.string().trim().max(120).optional().or(z.literal("")),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const err = await tryAuth(data.host, data.port, data.secure, data.username, data.password);
    const { data: acc, error } = await supabase.from("smtp_accounts").insert({
      user_id: userId,
      label: data.label,
      host: data.host,
      port: data.port,
      secure: data.secure,
      username: data.username,
      password: data.password,
      from_email: data.from_email,
      from_name: data.from_name || null,
      status: err ? "error" : "ok",
      last_checked: new Date().toISOString(),
      last_error: err ?? null,
    }).select("id").single();
    if (error) throw new Error(error.message);
    return { id: acc!.id, verified: !err, error: err };
  });

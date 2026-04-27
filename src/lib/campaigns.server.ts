import nodemailer from "nodemailer";
import type { SupabaseClient } from "@supabase/supabase-js";

export type SmtpAccountRow = {
  id: string; host: string; port: number; secure: boolean;
  username: string; password: string; from_email: string; from_name: string | null;
};

export function makeTransport(acc: SmtpAccountRow) {
  return nodemailer.createTransport({
    host: acc.host, port: acc.port, secure: acc.secure,
    auth: { user: acc.username, pass: acc.password },
    pool: true, maxConnections: 3, maxMessages: 100,
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 20000,
    tls: { rejectUnauthorized: false, minVersion: "TLSv1" },
  });
}

export function interpolate(template: string, vars: Record<string, string | undefined>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, k) => vars[k] ?? "");
}

export type CampaignRow = {
  id: string; user_id: string; smtp_id: string; list_id: string;
  subject: string; body: string; is_html: boolean; rate_per_minute: number;
};

/** Send a campaign with throttling. Updates DB rows as it progresses. */
export async function runCampaign(supabase: SupabaseClient, campaignId: string) {
  const { data: camp, error: cErr } = await supabase
    .from("campaigns").select("*").eq("id", campaignId).single();
  if (cErr || !camp) throw new Error("Campaign not found");
  const c = camp as CampaignRow;

  const { data: acc } = await supabase.from("smtp_accounts").select("*").eq("id", c.smtp_id).single();
  if (!acc) throw new Error("SMTP not found");

  const { data: contacts } = await supabase
    .from("contacts").select("email, name, phone, extra").eq("list_id", c.list_id);
  if (!contacts || contacts.length === 0) {
    await supabase.from("campaigns").update({ status: "failed", finished_at: new Date().toISOString() }).eq("id", c.id);
    throw new Error("Lista vacía");
  }

  await supabase.from("campaigns").update({
    status: "sending", started_at: new Date().toISOString(),
    total_recipients: contacts.length, sent_count: 0, failed_count: 0,
  }).eq("id", c.id);

  const transport = makeTransport(acc as SmtpAccountRow);
  const rate = Math.max(1, c.rate_per_minute || 60);
  const intervalMs = Math.floor(60_000 / rate);

  const fromHeader = acc.from_name ? `"${acc.from_name}" <${acc.from_email}>` : acc.from_email;
  let sent = 0, failed = 0;

  for (const contact of contacts as Array<{ email: string; name: string | null; phone: string | null; extra: any }>) {
    const vars = {
      name: contact.name ?? "",
      email: contact.email,
      phone: contact.phone ?? "",
      ...(contact.extra && typeof contact.extra === "object" ? contact.extra : {}),
    };
    const subject = interpolate(c.subject, vars);
    const bodyText = interpolate(c.body, vars);
    const t0 = Date.now();
    try {
      await transport.sendMail({
        from: fromHeader, to: contact.email, subject,
        ...(c.is_html ? { html: bodyText } : { text: bodyText }),
      });
      sent++;
      await supabase.from("campaign_sends").insert({
        campaign_id: c.id, user_id: c.user_id, email: contact.email,
        status: "sent", sent_at: new Date().toISOString(),
      });
    } catch (e: any) {
      failed++;
      await supabase.from("campaign_sends").insert({
        campaign_id: c.id, user_id: c.user_id, email: contact.email,
        status: "failed", error: e?.message ?? String(e),
      });
    }

    if ((sent + failed) % 5 === 0) {
      await supabase.from("campaigns").update({ sent_count: sent, failed_count: failed }).eq("id", c.id);
    }

    const elapsed = Date.now() - t0;
    if (elapsed < intervalMs) await new Promise((r) => setTimeout(r, intervalMs - elapsed));
  }

  transport.close();
  await supabase.from("campaigns").update({
    status: "sent", sent_count: sent, failed_count: failed, finished_at: new Date().toISOString(),
  }).eq("id", c.id);

  return { sent, failed, total: contacts.length };
}

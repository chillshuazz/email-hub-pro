import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { tryAuth } from "@/lib/smtp.server";

/** Cron-friendly endpoint: re-verifica todos los SMTPs cuyo último check sea > 5 min. */
export const Route = createFileRoute("/api/public/verify-smtps")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = request.headers.get("x-cron-secret");
        if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
          return new Response("forbidden", { status: 403 });
        }
        const fiveMinAgo = new Date(Date.now() - 5 * 60_000).toISOString();
        const { data: accounts } = await supabaseAdmin
          .from("smtp_accounts")
          .select("id, host, port, secure, username, password")
          .or(`last_checked.is.null,last_checked.lt.${fiveMinAgo}`)
          .limit(50);

        const results: Array<{ id: string; ok: boolean }> = [];
        for (const acc of accounts ?? []) {
          const err = await tryAuth(acc.host, acc.port, acc.secure, acc.username, acc.password);
          await supabaseAdmin.from("smtp_accounts").update({
            status: err ? "error" : "ok",
            last_checked: new Date().toISOString(),
            last_error: err ?? null,
          }).eq("id", acc.id);
          results.push({ id: acc.id, ok: !err });
        }
        return Response.json({ checked: results.length, results });
      },
    },
  },
});

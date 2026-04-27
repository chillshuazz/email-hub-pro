import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { runCampaign } from "./campaigns.server";

export const startCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    // Run in background, do not block the request
    (async () => {
      try { await runCampaign(supabase as any, data.id); }
      catch (e) { console.error("runCampaign error", e); }
    })();
    return { started: true };
  });

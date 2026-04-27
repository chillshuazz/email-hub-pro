import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { startCampaign } from "@/lib/campaigns.functions";
import { PageHeader } from "../components/PageHeader";
import { Send, Trash2, Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/campaigns")({ component: CampaignsPage });

function renderTpl(tpl: string, vars: Record<string, string | undefined>) {
  return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => vars[k] ?? "");
}

type Smtp = { id: string; label: string; status: string };
type DBList = { id: string; name: string };
type Campaign = { id: string; name: string; status: string; sent_count: number; failed_count: number; total_recipients: number; created_at: string };

function CampaignsPage() {
  const startFn = useServerFn(startCampaign);
  const [smtps, setSmtps] = useState<Smtp[]>([]);
  const [lists, setLists] = useState<DBList[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [previewContact, setPreviewContact] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({
    name: "", smtpId: "", listId: "", subject: "", body: "Hola {{name}},\n\n",
    is_html: false, rate_per_minute: 60,
  });

  const loadAll = async () => {
    const [s, l, c] = await Promise.all([
      supabase.from("smtp_accounts").select("id, label, status").order("created_at", { ascending: false }),
      supabase.from("contact_lists").select("id, name").order("created_at", { ascending: false }),
      supabase.from("campaigns").select("*").order("created_at", { ascending: false }),
    ]);
    setSmtps((s.data as Smtp[]) ?? []);
    setLists((l.data as DBList[]) ?? []);
    setCampaigns((c.data as Campaign[]) ?? []);
  };

  useEffect(() => {
    loadAll();
    const ch = supabase.channel("camps").on("postgres_changes",
      { event: "*", schema: "public", table: "campaigns" }, () => loadAll()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  useEffect(() => {
    if (!form.listId) { setPreviewContact(null); return; }
    supabase.from("contacts").select("email, name, phone").eq("list_id", form.listId).limit(1).single()
      .then(({ data }) => setPreviewContact(data));
  }, [form.listId]);

  const send = async () => {
    if (!form.smtpId || !form.listId || !form.subject) return;
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("No autenticado"); return; }
      const { count } = await supabase.from("contacts").select("id", { count: "exact", head: true }).eq("list_id", form.listId);
      const { data: camp, error } = await supabase.from("campaigns").insert({
        user_id: user.id,
        name: form.name || form.subject,
        smtp_id: form.smtpId, list_id: form.listId,
        subject: form.subject, body: form.body, is_html: form.is_html,
        rate_per_minute: form.rate_per_minute,
        total_recipients: count ?? 0,
      }).select("id").single();
      if (error || !camp) throw new Error(error?.message ?? "Error");
      await startFn({ data: { id: camp.id } });
      toast.success(`Campaña iniciada (${count} destinatarios)`);
      await loadAll();
    } catch (e: any) {
      toast.error(e?.message ?? "Error");
    } finally { setBusy(false); }
  };

  const remove = async (id: string) => {
    if (!confirm("Eliminar campaña?")) return;
    await supabase.from("campaigns").delete().eq("id", id);
    loadAll();
  };

  const okSmtps = smtps.filter((s) => s.status === "ok");
  const previewVars = {
    name: previewContact?.name ?? "Juan",
    email: previewContact?.email ?? "amigo@ejemplo.com",
    phone: previewContact?.phone ?? "",
  };

  return (
    <div className="p-10 max-w-7xl">
      <PageHeader title="Campañas" description="Compón un correo y envíalo a una lista usando uno de tus SMTPs verificados." />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
        <div className="glass rounded-xl border border-border p-6 space-y-4">
          <Field label="Nombre de la campaña">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Newsletter mayo" className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="SMTP">
              <select value={form.smtpId} onChange={(e) => setForm({ ...form, smtpId: e.target.value })} className={inputCls}>
                <option value="">— Selecciona —</option>
                {smtps.map((s) => (<option key={s.id} value={s.id}>{s.label} {s.status === "ok" ? "✓" : s.status === "error" ? "⚠" : ""}</option>))}
              </select>
              {smtps.length > 0 && okSmtps.length === 0 && <p className="text-xs text-warning mt-1.5">Ningún SMTP verificado.</p>}
            </Field>
            <Field label="Lista">
              <select value={form.listId} onChange={(e) => setForm({ ...form, listId: e.target.value })} className={inputCls}>
                <option value="">— Selecciona —</option>
                {lists.map((l) => (<option key={l.id} value={l.id}>{l.name}</option>))}
              </select>
            </Field>
          </div>
          <Field label="Asunto">
            <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Hola {{name}}..." className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Ritmo (correos/min)">
              <input type="number" min={1} max={600} value={form.rate_per_minute}
                onChange={(e) => setForm({ ...form, rate_per_minute: +e.target.value })} className={inputCls} />
            </Field>
            <Field label="Formato">
              <div className="flex gap-2">
                <button type="button" onClick={() => setForm({ ...form, is_html: false })}
                  className={`flex-1 py-2 rounded-md text-sm border ${!form.is_html ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary"}`}>Texto</button>
                <button type="button" onClick={() => setForm({ ...form, is_html: true })}
                  className={`flex-1 py-2 rounded-md text-sm border ${form.is_html ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary"}`}>HTML</button>
              </div>
            </Field>
          </div>
          <Field label="Mensaje">
            <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={10}
              className={inputCls + " font-mono text-xs resize-y"} />
            <p className="text-xs text-muted-foreground mt-1.5">Variables: <code className="text-primary">{"{{name}}"}</code> <code className="text-primary">{"{{email}}"}</code> <code className="text-primary">{"{{phone}}"}</code></p>
          </Field>
          <button onClick={send} disabled={busy || !form.smtpId || !form.listId || !form.subject}
            className="w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-3 rounded-lg font-medium shadow-glow disabled:opacity-40">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Enviar campaña
          </button>
        </div>

        <aside className="space-y-4">
          <div className="glass rounded-xl border border-border p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> Vista previa</div>
            <div className="text-xs text-muted-foreground mb-1">Asunto:</div>
            <div className="font-medium mb-3">{renderTpl(form.subject, previewVars) || "—"}</div>
            <div className="text-xs text-muted-foreground mb-1">Cuerpo:</div>
            <pre className="whitespace-pre-wrap text-xs font-sans bg-muted/40 p-3 rounded-md max-h-60 overflow-auto">
              {renderTpl(form.body, previewVars)}
            </pre>
          </div>

          <div className="glass rounded-xl border border-border overflow-hidden">
            <div className="p-3 text-sm font-medium border-b border-border">Historial</div>
            {campaigns.length === 0 ? (
              <div className="p-6 text-xs text-muted-foreground text-center">Sin campañas</div>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                {campaigns.map((c) => (
                  <div key={c.id} className="p-3 border-b border-border/60 last:border-0 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium truncate">{c.name}</div>
                      <button onClick={() => remove(c.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{new Date(c.created_at).toLocaleString()}</div>
                    <div className="text-xs mt-1">
                      <span className="text-success">✓ {c.sent_count}</span>{" · "}
                      <span className="text-destructive">✗ {c.failed_count}</span>{" / "}
                      <span className="text-muted-foreground">{c.total_recipients} · {c.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

const inputCls = "w-full px-3 py-2 rounded-md bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}

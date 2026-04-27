import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useSmtps, useLists, useCampaigns, uid } from "../lib/store";
import { PageHeader } from "../components/PageHeader";
import type { Campaign } from "../lib/types";
import { Send, Trash2, Mail, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/campaigns")({ component: CampaignsPage });

function renderTpl(tpl: string, vars: Record<string, string | undefined>) {
  return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => vars[k] ?? "");
}

function CampaignsPage() {
  const [smtps] = useSmtps();
  const [lists] = useLists();
  const [campaigns, setCampaigns] = useCampaigns();

  const [form, setForm] = useState({
    name: "", smtpId: "", listId: "", subject: "", body: "Hola {{name}},\n\n",
  });

  const okSmtps = smtps.filter((s) => s.status === "ok");

  const send = async () => {
    if (!form.smtpId || !form.listId || !form.subject) return;
    const list = lists.find((l) => l.id === form.listId);
    if (!list) return;

    const campaign: Campaign = {
      id: uid(), name: form.name || form.subject, smtpId: form.smtpId, listId: form.listId,
      subject: form.subject, body: form.body, createdAt: Date.now(), status: "sending", sent: 0, failed: 0,
    };
    setCampaigns((p) => [campaign, ...p]);

    // Simulación de envío en lotes
    let sent = 0, failed = 0;
    for (const c of list.contacts) {
      await new Promise((r) => setTimeout(r, 30));
      if (Math.random() > 0.05) sent++; else failed++;
      setCampaigns((p) => p.map((x) => (x.id === campaign.id ? { ...x, sent, failed } : x)));
    }
    setCampaigns((p) => p.map((x) => (x.id === campaign.id ? { ...x, status: "sent" } : x)));
    alert(`Simulación completada: ${sent} enviados, ${failed} fallidos.`);
  };

  const previewContact = lists.find((l) => l.id === form.listId)?.contacts[0];

  return (
    <div className="p-10 max-w-7xl">
      <PageHeader
        title="Campañas"
        description="Compón un correo y envíalo a una lista usando uno de tus SMTPs verificados."
      />

      <div className="mb-4 p-3 rounded-lg bg-warning/10 border border-warning/30 text-xs flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-warning" />
        <div><strong>Modo demo:</strong> los envíos son simulados. Para enviar correos reales debes activar Lovable Cloud (función serverside con nodemailer).</div>
      </div>

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
              {smtps.length > 0 && okSmtps.length === 0 && <p className="text-xs text-warning mt-1.5">Ningún SMTP verificado. Ve a SMTPs y prueba la conexión.</p>}
            </Field>
            <Field label="Lista">
              <select value={form.listId} onChange={(e) => setForm({ ...form, listId: e.target.value })} className={inputCls}>
                <option value="">— Selecciona —</option>
                {lists.map((l) => (<option key={l.id} value={l.id}>{l.name} ({l.contacts.length})</option>))}
              </select>
            </Field>
          </div>
          <Field label="Asunto">
            <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Hola {{name}}, novedades..." className={inputCls} />
          </Field>
          <Field label="Mensaje">
            <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={10} className={inputCls + " font-mono text-xs resize-y"} />
            <p className="text-xs text-muted-foreground mt-1.5">Variables disponibles: <code className="text-primary">{"{{name}}"}</code> <code className="text-primary">{"{{email}}"}</code> <code className="text-primary">{"{{phone}}"}</code></p>
          </Field>
          <button onClick={send} disabled={!form.smtpId || !form.listId || !form.subject} className="w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-3 rounded-lg font-medium shadow-glow disabled:opacity-40 disabled:cursor-not-allowed">
            <Send className="h-4 w-4" /> Enviar campaña
          </button>
        </div>

        <aside className="space-y-4">
          <div className="glass rounded-xl border border-border p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> Vista previa</div>
            <div className="text-xs text-muted-foreground mb-1">Asunto:</div>
            <div className="font-medium mb-3">{renderTpl(form.subject, { name: previewContact?.name ?? "Juan", email: previewContact?.email ?? "", phone: previewContact?.phone ?? "" }) || "—"}</div>
            <div className="text-xs text-muted-foreground mb-1">Cuerpo:</div>
            <pre className="whitespace-pre-wrap text-xs font-sans bg-muted/40 p-3 rounded-md max-h-60 overflow-auto">
              {renderTpl(form.body, { name: previewContact?.name ?? "Juan", email: previewContact?.email ?? "amigo@ejemplo.com", phone: previewContact?.phone ?? "" })}
            </pre>
          </div>

          <div className="glass rounded-xl border border-border overflow-hidden">
            <div className="p-3 text-sm font-medium border-b border-border">Historial</div>
            {campaigns.length === 0 ? (
              <div className="p-6 text-xs text-muted-foreground text-center">Sin campañas todavía</div>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                {campaigns.map((c) => (
                  <div key={c.id} className="p-3 border-b border-border/60 last:border-0 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium truncate">{c.name}</div>
                      <button onClick={() => setCampaigns((p) => p.filter((x) => x.id !== c.id))} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{new Date(c.createdAt).toLocaleString()}</div>
                    <div className="text-xs mt-1">
                      <span className="text-success">✓ {c.sent}</span>{" · "}
                      <span className="text-destructive">✗ {c.failed}</span>{" · "}
                      <span className="text-muted-foreground">{c.status}</span>
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

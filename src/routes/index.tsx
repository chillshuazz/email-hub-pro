import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "@/lib/ui";
import { Server, Users, Send, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/")({ component: Dashboard });

function Dashboard() {
  const [smtps, setSmtps] = useState<any[]>([]);
  const [lists, setLists] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [contactCount, setContactCount] = useState(0);

  useEffect(() => {
    (async () => {
      const [s, l, c, cc] = await Promise.all([
        supabase.from("smtp_accounts").select("id, label, host, port, status").order("created_at", { ascending: false }),
        supabase.from("contact_lists").select("id, name, created_at").order("created_at", { ascending: false }),
        supabase.from("campaigns").select("id, name, status, sent_count, total_recipients").order("created_at", { ascending: false }),
        supabase.from("contacts").select("id", { count: "exact", head: true }),
      ]);
      setSmtps(s.data ?? []);
      setLists(l.data ?? []);
      setCampaigns(c.data ?? []);
      setContactCount(cc.count ?? 0);
    })();
  }, []);

  const ok = smtps.filter((s) => s.status === "ok").length;
  const errs = smtps.filter((s) => s.status === "error").length;

  const stats = [
    { label: "SMTPs activos", value: ok, total: smtps.length, icon: Server, color: "var(--success)" },
    { label: "Contactos totales", value: contactCount, icon: Users, color: "var(--primary)" },
    { label: "Campañas", value: campaigns.length, icon: Send, color: "oklch(0.7 0.18 290)" },
  ];

  return (
    <div className="p-10 max-w-7xl">
      <PageHeader title="Panel de control"
        description="Resumen del estado de tus servidores SMTP, listas de contactos y campañas." />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        {stats.map((s) => (
          <div key={s.label} className="glass rounded-xl p-6 border border-border shadow-elevated">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm text-muted-foreground">{s.label}</div>
                <div className="mt-2 text-4xl font-display font-semibold">
                  {s.value}{s.total !== undefined && <span className="text-lg text-muted-foreground"> / {s.total}</span>}
                </div>
              </div>
              <div className="h-10 w-10 rounded-lg grid place-items-center"
                style={{ background: `color-mix(in oklab, ${s.color} 20%, transparent)` }}>
                <s.icon className="h-5 w-5" style={{ color: s.color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass rounded-xl p-6 border border-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Salud de SMTPs</h3>
            <Link to="/smtps" className="text-xs text-primary hover:underline">Ver todos →</Link>
          </div>
          {smtps.length === 0 ? (
            <Link to="/detect" className="block p-6 rounded-lg border border-dashed border-border text-center text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 transition">
              Auto-detecta tu primer SMTP →
            </Link>
          ) : (
            <div className="space-y-2">
              {smtps.slice(0, 5).map((s) => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{s.label}</div>
                    <div className="text-xs text-muted-foreground font-mono truncate">{s.host}:{s.port}</div>
                  </div>
                  <StatusBadge status={s.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass rounded-xl p-6 border border-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Campañas recientes</h3>
            <Link to="/campaigns" className="text-xs text-primary hover:underline">Ver todas →</Link>
          </div>
          {campaigns.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Sin campañas todavía</div>
          ) : (
            <div className="space-y-2">
              {campaigns.slice(0, 5).map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.sent_count}/{c.total_recipients} enviados</div>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded bg-secondary">{c.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {errs > 0 && (
        <div className="mt-6 p-4 rounded-xl border border-destructive/40 bg-destructive/10 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div className="text-sm">
            <strong>{errs} SMTP(s) con error.</strong> Revísalos antes de enviar campañas.
          </div>
        </div>
      )}
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useSmtps, useLists, useCampaigns } from "../lib/store";
import { PageHeader } from "../components/PageHeader";
import { Server, Users, Send, CheckCircle2, AlertCircle, Clock } from "lucide-react";

export const Route = createFileRoute("/")({ component: Dashboard });

function Dashboard() {
  const [smtps] = useSmtps();
  const [lists] = useLists();
  const [campaigns] = useCampaigns();

  const ok = smtps.filter((s) => s.status === "ok").length;
  const errs = smtps.filter((s) => s.status === "error").length;
  const totalContacts = lists.reduce((a, l) => a + l.contacts.length, 0);

  const stats = [
    { label: "SMTPs activos", value: ok, total: smtps.length, icon: Server, color: "var(--success)" },
    { label: "Contactos totales", value: totalContacts, icon: Users, color: "var(--primary)" },
    { label: "Campañas", value: campaigns.length, icon: Send, color: "oklch(0.7 0.18 290)" },
  ];

  return (
    <div className="p-10 max-w-7xl">
      <PageHeader
        title="Panel de control"
        description="Resumen del estado de tus servidores SMTP, listas de contactos y campañas."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        {stats.map((s) => (
          <div key={s.label} className="glass rounded-xl p-6 border border-border shadow-elevated">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm text-muted-foreground">{s.label}</div>
                <div className="mt-2 text-4xl font-display font-semibold">
                  {s.value}
                  {s.total !== undefined && <span className="text-lg text-muted-foreground"> / {s.total}</span>}
                </div>
              </div>
              <div className="h-10 w-10 rounded-lg grid place-items-center" style={{ background: `color-mix(in oklab, ${s.color} 20%, transparent)` }}>
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
            <EmptyHint to="/smtps" label="Agrega tu primer SMTP" />
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
            <h3 className="font-semibold">Listas recientes</h3>
            <Link to="/lists" className="text-xs text-primary hover:underline">Ver todas →</Link>
          </div>
          {lists.length === 0 ? (
            <EmptyHint to="/lists" label="Importar primera lista" />
          ) : (
            <div className="space-y-2">
              {lists.slice(0, 5).map((l) => (
                <div key={l.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
                  <div className="font-medium text-sm">{l.name}</div>
                  <div className="text-xs text-muted-foreground">{l.contacts.length} contactos</div>
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
            <strong>{errs} SMTP(s) con error.</strong> Revísalos antes de enviar campañas para evitar sorpresas.
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyHint({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className="block p-6 rounded-lg border border-dashed border-border text-center text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 transition">
      {label}
    </Link>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; Icon: typeof CheckCircle2 }> = {
    ok: { label: "Conectado", color: "var(--success)", Icon: CheckCircle2 },
    error: { label: "Error", color: "var(--destructive)", Icon: AlertCircle },
    checking: { label: "Verificando", color: "var(--warning)", Icon: Clock },
    unknown: { label: "Sin probar", color: "var(--muted-foreground)", Icon: Clock },
  };
  const m = map[status] || map.unknown;
  return (
    <div className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-md" style={{ background: `color-mix(in oklab, ${m.color} 15%, transparent)`, color: m.color }}>
      <m.Icon className="h-3 w-3" />
      {m.label}
    </div>
  );
}

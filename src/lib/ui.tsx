// Compartido entre páginas: status badge + tipos de DB.
import { CheckCircle2, AlertCircle, Clock, Loader2 } from "lucide-react";

export type SmtpStatus = "unknown" | "checking" | "ok" | "error";

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; Icon: typeof CheckCircle2 }> = {
    ok: { label: "Conectado", color: "var(--success)", Icon: CheckCircle2 },
    error: { label: "Error", color: "var(--destructive)", Icon: AlertCircle },
    checking: { label: "Verificando", color: "var(--warning)", Icon: Loader2 },
    unknown: { label: "Sin probar", color: "var(--muted-foreground)", Icon: Clock },
  };
  const m = map[status] || map.unknown;
  return (
    <div className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-md font-medium"
      style={{ background: `color-mix(in oklab, ${m.color} 15%, transparent)`, color: m.color }}>
      <m.Icon className={`h-3 w-3 ${status === "checking" ? "animate-spin" : ""}`} />
      {m.label}
    </div>
  );
}

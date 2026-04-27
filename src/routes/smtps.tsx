import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useSmtps, uid } from "../lib/store";
import { SMTP_PROVIDERS } from "../lib/providers";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "./index";
import type { SmtpAccount } from "../lib/types";
import { Plus, Trash2, RefreshCw, Eye, EyeOff, X } from "lucide-react";

export const Route = createFileRoute("/smtps")({ component: SmtpsPage });

function SmtpsPage() {
  const [smtps, setSmtps] = useSmtps();
  const [editing, setEditing] = useState<SmtpAccount | null>(null);
  const [open, setOpen] = useState(false);

  // Verificación periódica simulada cada 60s
  useEffect(() => {
    const tick = () => {
      setSmtps((prev) =>
        prev.map((s) => {
          // Marca checking, luego resuelve probabilísticamente según completitud
          const complete = s.host && s.username && s.password && s.port;
          const ok = complete && Math.random() > 0.1;
          return { ...s, status: ok ? "ok" : "error", lastChecked: Date.now(), lastError: ok ? undefined : "No se pudo conectar (simulado)" };
        }),
      );
    };
    const i = setInterval(tick, 60_000);
    return () => clearInterval(i);
  }, [setSmtps]);

  const verify = (id: string) => {
    setSmtps((prev) => prev.map((s) => (s.id === id ? { ...s, status: "checking" } : s)));
    setTimeout(() => {
      setSmtps((prev) =>
        prev.map((s) => {
          if (s.id !== id) return s;
          const complete = s.host && s.username && s.password && s.port;
          const ok = !!complete && Math.random() > 0.15;
          return { ...s, status: ok ? "ok" : "error", lastChecked: Date.now(), lastError: ok ? undefined : "Tiempo de espera agotado (simulado)" };
        }),
      );
    }, 1200);
  };

  return (
    <div className="p-10 max-w-7xl">
      <PageHeader
        title="Servidores SMTP"
        description="Administra credenciales de envío. Compatible con Office 365, Gmail, SendGrid y servidores personalizados."
        actions={
          <button onClick={() => { setEditing(null); setOpen(true); }} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium text-sm hover:opacity-90 shadow-glow">
            <Plus className="h-4 w-4" /> Nuevo SMTP
          </button>
        }
      />

      <div className="mb-4 p-3 rounded-lg bg-warning/10 border border-warning/30 text-xs text-warning-foreground">
        <strong>Modo demo:</strong> la verificación es simulada. Para probar conexión real al servidor SMTP necesitas activar Lovable Cloud (los navegadores no pueden hablar SMTP directamente).
      </div>

      {smtps.length === 0 ? (
        <div className="glass rounded-xl border border-dashed border-border p-16 text-center">
          <p className="text-muted-foreground">Aún no tienes servidores configurados.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {smtps.map((s) => (
            <div key={s.id} className="glass rounded-xl border border-border p-5 shadow-elevated">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{s.label}</div>
                  <div className="text-xs text-muted-foreground font-mono truncate">{s.fromEmail}</div>
                </div>
                <StatusBadge status={s.status} />
              </div>
              <div className="text-xs font-mono text-muted-foreground space-y-0.5 mb-4">
                <div>host: {s.host}:{s.port} {s.secure ? "(SSL)" : "(STARTTLS)"}</div>
                <div>user: {s.username}</div>
                {s.lastChecked && <div>último check: {new Date(s.lastChecked).toLocaleTimeString()}</div>}
                {s.lastError && <div className="text-destructive">⚠ {s.lastError}</div>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => verify(s.id)} className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-md bg-secondary hover:bg-accent transition">
                  <RefreshCw className="h-3.5 w-3.5" /> Verificar
                </button>
                <button onClick={() => { setEditing(s); setOpen(true); }} className="flex-1 text-xs px-3 py-2 rounded-md bg-secondary hover:bg-accent transition">Editar</button>
                <button onClick={() => setSmtps((p) => p.filter((x) => x.id !== s.id))} className="px-3 py-2 rounded-md bg-destructive/15 text-destructive hover:bg-destructive/25 transition">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && <SmtpDialog initial={editing} onClose={() => setOpen(false)} onSave={(s) => {
        setSmtps((prev) => {
          const exists = prev.find((p) => p.id === s.id);
          return exists ? prev.map((p) => (p.id === s.id ? s : p)) : [...prev, s];
        });
        setOpen(false);
      }} />}
    </div>
  );
}

function SmtpDialog({ initial, onClose, onSave }: { initial: SmtpAccount | null; onClose: () => void; onSave: (s: SmtpAccount) => void }) {
  const [form, setForm] = useState<SmtpAccount>(
    initial ?? {
      id: uid(), label: "", provider: "office365", host: "smtp.office365.com", port: 587, secure: false,
      username: "", password: "", fromEmail: "", fromName: "", status: "unknown", createdAt: Date.now(),
    },
  );
  const [showPwd, setShowPwd] = useState(false);

  const setProvider = (id: SmtpAccount["provider"]) => {
    const p = SMTP_PROVIDERS.find((x) => x.id === id)!;
    setForm((f) => ({ ...f, provider: id, host: p.host || f.host, port: p.port, secure: p.secure }));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...form, label: form.label || form.fromEmail });
  };

  const providerHint = SMTP_PROVIDERS.find((p) => p.id === form.provider)?.hint;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur-sm p-4" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit} className="bg-card border border-border rounded-2xl w-full max-w-2xl shadow-elevated max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold">{initial ? "Editar SMTP" : "Nuevo SMTP"}</h2>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-6 grid grid-cols-2 gap-4">
          <Field label="Etiqueta" className="col-span-2">
            <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Ej. Marketing principal" className={inputCls} />
          </Field>
          <Field label="Proveedor" className="col-span-2">
            <select value={form.provider} onChange={(e) => setProvider(e.target.value as SmtpAccount["provider"])} className={inputCls}>
              {SMTP_PROVIDERS.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
            </select>
            {providerHint && <p className="text-xs text-muted-foreground mt-1.5">{providerHint}</p>}
          </Field>
          <Field label="Servidor (host)"><input required value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} className={inputCls} /></Field>
          <Field label="Puerto"><input required type="number" value={form.port} onChange={(e) => setForm({ ...form, port: +e.target.value })} className={inputCls} /></Field>
          <Field label="Seguridad" className="col-span-2">
            <div className="flex gap-2">
              <button type="button" onClick={() => setForm({ ...form, secure: false })} className={`flex-1 py-2 rounded-md text-sm border ${!form.secure ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary"}`}>STARTTLS (587)</button>
              <button type="button" onClick={() => setForm({ ...form, secure: true })} className={`flex-1 py-2 rounded-md text-sm border ${form.secure ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary"}`}>SSL/TLS (465)</button>
            </div>
          </Field>
          <Field label="Usuario / correo"><input required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value, fromEmail: form.fromEmail || e.target.value })} className={inputCls} /></Field>
          <Field label="Contraseña">
            <div className="relative">
              <input required type={showPwd ? "text" : "password"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={inputCls + " pr-9"} />
              <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>
          <Field label="Nombre del remitente"><input value={form.fromName ?? ""} onChange={(e) => setForm({ ...form, fromName: e.target.value })} className={inputCls} /></Field>
          <Field label="Email remitente"><input required type="email" value={form.fromEmail} onChange={(e) => setForm({ ...form, fromEmail: e.target.value })} className={inputCls} /></Field>
        </div>
        <div className="flex justify-end gap-2 p-6 border-t border-border">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-md bg-secondary hover:bg-accent text-sm">Cancelar</button>
          <button type="submit" className="px-4 py-2 rounded-md bg-primary text-primary-foreground font-medium text-sm shadow-glow">Guardar</button>
        </div>
      </form>
    </div>
  );
}

const inputCls = "w-full px-3 py-2 rounded-md bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring";
function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="text-xs font-medium text-muted-foreground mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { verifySmtp, createSmtpManual } from "@/lib/smtp.functions";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "@/lib/ui";
import { Plus, Trash2, RefreshCw, Eye, EyeOff, X, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/smtps")({ component: SmtpsPage });

type Smtp = {
  id: string; label: string; host: string; port: number; secure: boolean;
  username: string; password: string; from_email: string; from_name: string | null;
  status: string; last_checked: string | null; last_error: string | null;
};

function SmtpsPage() {
  const [smtps, setSmtps] = useState<Smtp[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Smtp | null>(null);
  const [verifying, setVerifying] = useState<string | null>(null);
  const verifyFn = useServerFn(verifySmtp);

  const load = async () => {
    const { data } = await supabase.from("smtp_accounts").select("*").order("created_at", { ascending: false });
    setSmtps((data as Smtp[]) ?? []);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("smtps").on("postgres_changes",
      { event: "*", schema: "public", table: "smtp_accounts" }, () => load()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const verify = async (id: string) => {
    setVerifying(id);
    try {
      const res = await verifyFn({ data: { id } });
      if (res.ok) toast.success("Conexión exitosa");
      else toast.error(`Error: ${res.error}`);
    } catch (e: any) { toast.error(e?.message ?? "Error"); }
    finally { setVerifying(null); }
  };

  const remove = async (id: string) => {
    if (!confirm("¿Eliminar este SMTP?")) return;
    await supabase.from("smtp_accounts").delete().eq("id", id);
    toast.success("Eliminado");
  };

  return (
    <div className="p-10 max-w-7xl">
      <PageHeader
        title="Servidores SMTP"
        description="Gestiona tus servidores de correo. Verificación y envío reales."
        actions={
          <div className="flex gap-2">
            <Link to="/detect" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm bg-primary text-primary-foreground shadow-glow hover:opacity-90">
              <Sparkles className="h-4 w-4" /> Auto-detectar
            </Link>
            <button onClick={() => { setEditing(null); setOpen(true); }} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm bg-secondary hover:bg-accent">
              <Plus className="h-4 w-4" /> Manual
            </button>
          </div>
        }
      />

      {smtps.length === 0 ? (
        <div className="glass rounded-xl border border-dashed border-border p-16 text-center">
          <p className="text-muted-foreground mb-4">Aún no tienes servidores configurados.</p>
          <Link to="/detect" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
            <Sparkles className="h-4 w-4" /> Auto-detectar tu primer SMTP
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {smtps.map((s) => (
            <div key={s.id} className="glass rounded-xl border border-border p-5 shadow-elevated">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{s.label}</div>
                  <div className="text-xs text-muted-foreground font-mono truncate">{s.from_email}</div>
                </div>
                <StatusBadge status={verifying === s.id ? "checking" : s.status} />
              </div>
              <div className="text-xs font-mono text-muted-foreground space-y-0.5 mb-4">
                <div>host: {s.host}:{s.port} {s.secure ? "(SSL)" : "(STARTTLS)"}</div>
                <div>user: {s.username}</div>
                {s.last_checked && <div>último check: {new Date(s.last_checked).toLocaleString()}</div>}
                {s.last_error && <div className="text-destructive break-all">⚠ {s.last_error}</div>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => verify(s.id)} disabled={verifying === s.id}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-md bg-secondary hover:bg-accent transition disabled:opacity-50">
                  {verifying === s.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  Verificar
                </button>
                <button onClick={() => { setEditing(s); setOpen(true); }} className="flex-1 text-xs px-3 py-2 rounded-md bg-secondary hover:bg-accent transition">Editar</button>
                <button onClick={() => remove(s.id)} className="px-3 py-2 rounded-md bg-destructive/15 text-destructive hover:bg-destructive/25 transition">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && <SmtpDialog initial={editing} onClose={() => setOpen(false)} />}
    </div>
  );
}

function SmtpDialog({ initial, onClose }: { initial: Smtp | null; onClose: () => void }) {
  const createFn = useServerFn(createSmtpManual);
  const [form, setForm] = useState({
    label: initial?.label ?? "",
    host: initial?.host ?? "smtp.office365.com",
    port: initial?.port ?? 587,
    secure: initial?.secure ?? false,
    username: initial?.username ?? "",
    password: initial?.password ?? "",
    from_email: initial?.from_email ?? "",
    from_name: initial?.from_name ?? "",
  });
  const [showPwd, setShowPwd] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (initial) {
        const { error } = await supabase.from("smtp_accounts").update({
          label: form.label || form.from_email,
          host: form.host, port: form.port, secure: form.secure,
          username: form.username, password: form.password,
          from_email: form.from_email, from_name: form.from_name || null,
        }).eq("id", initial.id);
        if (error) throw error;
        toast.success("Actualizado");
      } else {
        const res = await createFn({ data: { ...form, label: form.label || form.from_email } });
        if (res.verified) toast.success("Creado y verificado");
        else toast.warning(`Creado pero falló verificación: ${res.error}`);
      }
      onClose();
    } catch (e: any) { toast.error(e?.message ?? "Error"); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur-sm p-4" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit}
        className="bg-card border border-border rounded-2xl w-full max-w-2xl shadow-elevated max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold">{initial ? "Editar SMTP" : "Nuevo SMTP (manual)"}</h2>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-6 grid grid-cols-2 gap-4">
          <Field label="Etiqueta" className="col-span-2">
            <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Marketing principal" className={inputCls} />
          </Field>
          <Field label="Servidor (host)"><input required value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} className={inputCls} /></Field>
          <Field label="Puerto"><input required type="number" value={form.port} onChange={(e) => setForm({ ...form, port: +e.target.value })} className={inputCls} /></Field>
          <Field label="Seguridad" className="col-span-2">
            <div className="flex gap-2">
              <button type="button" onClick={() => setForm({ ...form, secure: false })}
                className={`flex-1 py-2 rounded-md text-sm border ${!form.secure ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary"}`}>
                STARTTLS (587)
              </button>
              <button type="button" onClick={() => setForm({ ...form, secure: true })}
                className={`flex-1 py-2 rounded-md text-sm border ${form.secure ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary"}`}>
                SSL/TLS (465)
              </button>
            </div>
          </Field>
          <Field label="Usuario"><input required value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value, from_email: form.from_email || e.target.value })} className={inputCls} /></Field>
          <Field label="Contraseña">
            <div className="relative">
              <input required type={showPwd ? "text" : "password"} value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })} className={inputCls + " pr-9"} />
              <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>
          <Field label="Nombre del remitente"><input value={form.from_name}
            onChange={(e) => setForm({ ...form, from_name: e.target.value })} className={inputCls} /></Field>
          <Field label="Email remitente"><input required type="email" value={form.from_email}
            onChange={(e) => setForm({ ...form, from_email: e.target.value })} className={inputCls} /></Field>
        </div>
        <div className="flex justify-end gap-2 p-6 border-t border-border">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-md bg-secondary hover:bg-accent text-sm">Cancelar</button>
          <button type="submit" disabled={busy}
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground font-medium text-sm shadow-glow disabled:opacity-60 inline-flex items-center gap-2">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {initial ? "Guardar" : "Crear y verificar"}
          </button>
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

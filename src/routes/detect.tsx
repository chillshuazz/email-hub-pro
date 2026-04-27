import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { startAutodetect } from "@/lib/smtp.functions";
import { PageHeader } from "../components/PageHeader";
import { Loader2, CheckCircle2, AlertCircle, Search, Eye, EyeOff, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/detect")({ component: DetectPage });

type Step = { ts: number; level: "info" | "ok" | "warn" | "error"; msg: string };

function DetectPage() {
  const navigate = useNavigate();
  const startFn = useServerFn(startAutodetect);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [running, setRunning] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [result, setResult] = useState<any>(null);
  const logRef = useRef<HTMLDivElement>(null);

  // Poll job
  useEffect(() => {
    if (!jobId || !running) return;
    const i = setInterval(async () => {
      const { data } = await supabase.from("smtp_detect_jobs").select("status, steps, result").eq("id", jobId).single();
      if (!data) return;
      setSteps((data.steps as Step[]) ?? []);
      if (data.status !== "running") {
        setRunning(false);
        setResult(data.result);
        if ((data.result as any)?.found) {
          toast.success("¡SMTP detectado y guardado!");
        } else {
          toast.error((data.result as any)?.error ?? "No se pudo detectar");
        }
      }
    }, 800);
    return () => clearInterval(i);
  }, [jobId, running]);

  useEffect(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight }); }, [steps]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@") || !password) { toast.error("Email y contraseña requeridos"); return; }
    setRunning(true); setSteps([]); setResult(null); setJobId(null);
    try {
      const { jobId } = await startFn({ data: { email, password } });
      setJobId(jobId);
    } catch (err: any) {
      setRunning(false);
      toast.error(err?.message ?? "Error al iniciar");
    }
  };

  const levelColor: Record<Step["level"], string> = {
    info: "text-muted-foreground",
    ok: "text-success",
    warn: "text-warning",
    error: "text-destructive",
  };

  return (
    <div className="p-10 max-w-5xl">
      <PageHeader
        title="Auto-detección de SMTP"
        description="Solo introduce tu correo y contraseña. La app encontrará automáticamente el servidor SMTP correcto, igual que Thunderbird u Outlook."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={submit} className="glass rounded-2xl border border-border p-6 shadow-elevated h-fit">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">Configuración mágica</h2>
          </div>
          <div className="space-y-4">
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground mb-1.5 block">Correo electrónico</span>
              <input type="email" required value={email} disabled={running}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tucorreo@ejemplo.com"
                className="w-full px-3 py-2.5 rounded-md bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50" />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground mb-1.5 block">Contraseña</span>
              <div className="relative">
                <input type={showPwd ? "text" : "password"} required value={password} disabled={running}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-md bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring pr-9 disabled:opacity-50" />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5">
                Para Gmail/Yahoo necesitas una <strong>contraseña de aplicación</strong>, no la del correo.
              </p>
            </label>
            <button type="submit" disabled={running}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-md bg-primary text-primary-foreground font-medium text-sm shadow-glow disabled:opacity-60">
              {running ? <><Loader2 className="h-4 w-4 animate-spin" /> Detectando...</> : <><Search className="h-4 w-4" /> Auto-detectar</>}
            </button>
          </div>

          <div className="mt-5 p-3 rounded-lg bg-muted/40 text-xs text-muted-foreground space-y-1.5">
            <div className="font-medium text-foreground">Cómo funciona:</div>
            <div>1. Lista de proveedores conocidos (Gmail, Outlook, etc.)</div>
            <div>2. Mozilla ISPDB (Thunderbird autoconfig)</div>
            <div>3. Autoconfig del propio dominio (RFC 6186)</div>
            <div>4. Registros DNS SRV / MX</div>
            <div>5. Hosts comunes: smtp.*, mail.*, etc.</div>
            <div>6. Combinatoria de puertos (587, 465, 2525, 25)</div>
          </div>
        </form>

        <div className="glass rounded-2xl border border-border p-6 shadow-elevated">
          <h2 className="font-semibold mb-4">Progreso en vivo</h2>
          <div ref={logRef} className="bg-background/60 border border-border rounded-lg p-3 font-mono text-xs h-[400px] overflow-y-auto space-y-1">
            {steps.length === 0 && !running && (
              <div className="text-muted-foreground italic">Esperando inicio...</div>
            )}
            {steps.map((s, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-muted-foreground/60 shrink-0">{new Date(s.ts).toLocaleTimeString()}</span>
                <span className={levelColor[s.level]}>{s.msg}</span>
              </div>
            ))}
            {running && <div className="flex items-center gap-2 text-warning"><Loader2 className="h-3 w-3 animate-spin" /> Probando...</div>}
          </div>

          {result && (
            <div className={`mt-4 p-4 rounded-lg border ${result.found ? "border-success/40 bg-success/10" : "border-destructive/40 bg-destructive/10"}`}>
              <div className="flex items-start gap-3">
                {result.found ? <CheckCircle2 className="h-5 w-5 text-success shrink-0" /> : <AlertCircle className="h-5 w-5 text-destructive shrink-0" />}
                <div className="text-sm flex-1">
                  {result.found ? (
                    <>
                      <div className="font-semibold text-success">¡Configuración encontrada y guardada!</div>
                      <div className="font-mono text-xs mt-1 text-foreground/80">{result.host}:{result.port} ({result.secure ? "SSL" : "STARTTLS"})</div>
                      <button onClick={() => navigate({ to: "/smtps" })}
                        className="mt-3 text-xs px-3 py-1.5 rounded bg-primary text-primary-foreground font-medium">
                        Ir a mis SMTPs →
                      </button>
                    </>
                  ) : (
                    <div className="text-destructive">{result.error}</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

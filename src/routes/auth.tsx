import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Zap, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) nav({ to: "/" });
    });
  }, [nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || password.length < 6) { toast.error("Email válido y contraseña ≥ 6 caracteres"); return; }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) throw error;
        toast.success("Cuenta creada. Sesión iniciada.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bienvenido de vuelta");
      }
      nav({ to: "/" });
    } catch (err: any) {
      toast.error(err.message ?? "Error de autenticación");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center p-6 bg-background">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 justify-center mb-8">
          <div className="h-11 w-11 rounded-xl grid place-items-center" style={{ background: "var(--gradient-primary)" }}>
            <Zap className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <div className="font-display text-2xl font-semibold">MailPilot</div>
            <div className="text-xs text-muted-foreground">Consola SMTP & Campañas</div>
          </div>
        </div>
        <div className="glass border border-border rounded-2xl p-8 shadow-elevated">
          <h1 className="text-xl font-semibold mb-1">{mode === "login" ? "Iniciar sesión" : "Crear cuenta"}</h1>
          <p className="text-sm text-muted-foreground mb-6">
            {mode === "login" ? "Accede a tu panel" : "Empieza a gestionar tus SMTPs"}
          </p>
          <form onSubmit={submit} className="space-y-4">
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground mb-1.5 block">Email</span>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 rounded-md bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground mb-1.5 block">Contraseña</span>
              <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 rounded-md bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </label>
            <button disabled={loading} type="submit"
              className="w-full py-2.5 rounded-md bg-primary text-primary-foreground font-medium text-sm shadow-glow disabled:opacity-60 inline-flex items-center justify-center gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "login" ? "Entrar" : "Crear cuenta"}
            </button>
          </form>
          <button onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="w-full text-sm text-muted-foreground hover:text-foreground mt-5 transition">
            {mode === "login" ? "¿No tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Inicia sesión"}
          </button>
        </div>
      </div>
    </div>
  );
}

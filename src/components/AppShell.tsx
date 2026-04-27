import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, Server, Users, Send, Zap, LogOut, Loader2, Search } from "lucide-react";
import { useAuth, AuthProvider } from "@/lib/auth-context";
import { useEffect } from "react";
import { Toaster } from "sonner";

const nav = [
  { to: "/", label: "Panel", icon: LayoutDashboard },
  { to: "/smtps", label: "SMTPs", icon: Server },
  { to: "/detect", label: "Auto-detectar", icon: Search },
  { to: "/lists", label: "Listas", icon: Users },
  { to: "/campaigns", label: "Campañas", icon: Send },
];

export function AppShell() {
  return (
    <AuthProvider>
      <Toaster theme="dark" richColors position="top-right" />
      <Inner />
    </AuthProvider>
  );
}

function Inner() {
  const loc = useLocation();
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();

  useEffect(() => {
    if (!loading && !user && loc.pathname !== "/auth") {
      navigate({ to: "/auth" });
    }
  }, [loading, user, loc.pathname, navigate]);

  if (loc.pathname === "/auth") return <Outlet />;

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground flex flex-col">
        <div className="p-6 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg grid place-items-center" style={{ background: "var(--gradient-primary)" }}>
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <div className="font-display font-semibold tracking-tight">MailPilot</div>
            <div className="text-xs text-muted-foreground">Console</div>
          </div>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {nav.map((n) => {
            const active = loc.pathname === n.to || (n.to !== "/" && loc.pathname.startsWith(n.to));
            const Icon = n.icon;
            return (
              <Link key={n.to} to={n.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                  active ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-glow"
                    : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50"
                }`}>
                <Icon className="h-4 w-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-sidebar-border space-y-2">
          <div className="text-xs text-muted-foreground truncate" title={user.email ?? ""}>{user.email}</div>
          <button onClick={() => signOut()} className="w-full inline-flex items-center justify-center gap-2 text-xs px-3 py-2 rounded-md bg-secondary hover:bg-accent transition">
            <LogOut className="h-3.5 w-3.5" /> Cerrar sesión
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}

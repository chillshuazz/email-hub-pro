import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { LayoutDashboard, Server, Users, Send, Globe, Zap } from "lucide-react";

const nav = [
  { to: "/", label: "Panel", icon: LayoutDashboard },
  { to: "/smtps", label: "SMTPs", icon: Server },
  { to: "/lists", label: "Listas", icon: Users },
  { to: "/campaigns", label: "Campañas", icon: Send },
  { to: "/sources", label: "Fuentes SMTP", icon: Globe },
];

export function AppShell() {
  const loc = useLocation();
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
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-glow"
                    : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50"
                }`}
              >
                <Icon className="h-4 w-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 text-[11px] text-muted-foreground border-t border-sidebar-border">
          Datos guardados en este navegador. Para envío real activa Lovable Cloud.
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}

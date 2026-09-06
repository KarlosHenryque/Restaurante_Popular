import { Link } from "@tanstack/react-router";
import { ScanLine, UserRound, Users, Wallet, Wifi, WifiOff } from "lucide-react";
import type { ReactNode } from "react";
import logo from "@/img/logo.png";
import { useStore } from "@/lib/rp-store";

const nav = [
  { to: "/", label: "Atendimento", icon: ScanLine },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/caixa", label: "Caixa", icon: Wallet },
] as const;

export function AppShell({
  title,
  children,
  hideSidebar = false,
}: {
  title: string;
  children: ReactNode;
  hideSidebar?: boolean;
}) {
  const { config, caixa, operador, toggleCadUnico } = useStore();

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className={`sticky top-0 h-screen w-[112px] shrink-0 flex-col items-center gap-2 bg-sidebar py-5 text-sidebar-foreground shadow-soft ${hideSidebar ? "hidden" : "flex"}`}
      >
        <img src={logo} alt="Logo" className="mb-4 size-16 object-contain" />
        {nav.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="flex w-[88px] flex-col items-center gap-1 rounded-2xl px-2 py-3 text-[11px] font-bold tracking-wide opacity-80 transition-all hover:bg-[#315166] hover:opacity-100"
            activeProps={{ className: "!opacity-100 bg-sidebar-accent shadow-soft" }}
            activeOptions={{ exact: item.to === "/" }}
          >
            <item.icon className="size-6" strokeWidth={2.2} />
            {item.label}
          </Link>
        ))}
        <button
          onClick={toggleCadUnico}
          className="mt-auto flex w-[88px] flex-col items-center gap-1 rounded-2xl px-2 py-3 text-[10px] font-semibold opacity-85 hover:bg-[#315166]"
          title="Simular queda de conexão com o CadÚnico"
        >
          {config.cadUnicoOnline ? <Wifi className="size-5" /> : <WifiOff className="size-5" />}
          {config.cadUnicoOnline ? "Online" : "Offline"}
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-6 border-b border-border bg-card/90 px-8 py-4 shadow-sm">
          <div>
            <p className="text-lg font-extrabold leading-tight">{config.restaurante}</p>
            <p className="text-sm text-muted-foreground">Unidade: {config.unidade}</p>
          </div>
          <h1 className="ml-4 rounded-full bg-secondary px-4 py-1.5 text-sm font-extrabold uppercase tracking-widest text-secondary-foreground">
            {title}
          </h1>
          <div className="ml-auto flex items-center gap-3">
            <span
              className={`rounded-full px-4 py-2 text-sm font-bold ${
                caixa.aberto ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
              }`}
            >
              {caixa.aberto ? "🟢 Caixa aberto" : "🔴 Caixa fechado"}
            </span>
            <span className="flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm font-semibold">
              <UserRound className="size-4" /> {operador}
            </span>
          </div>
        </header>

        {!config.cadUnicoOnline && (
          <div className="bg-warning px-8 py-2 text-center text-sm font-extrabold uppercase tracking-wide text-warning-foreground">
            ⚠ Sem conexão com o CadÚnico — atendimentos serão registrados em modo offline
          </div>
        )}

        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}

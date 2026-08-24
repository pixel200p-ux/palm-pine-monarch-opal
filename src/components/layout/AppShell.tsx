import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  Building2,
  CandlestickChart,
  Coins,
  Landmark,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  PieChart,
  RefreshCw,
  Settings,
  Sun,
  Wallet,
  X,
} from "lucide-react";
import { useState } from "react";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { signOut } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { LoginScreen } from "@/components/LoginScreen";
import { useUiStore } from "@/lib/ui-store";
import { refreshMarketPrices } from "@/lib/api/prices";
import { useQueryClient } from "@tanstack/react-query";
import { PORTFOLIO_KEY } from "@/lib/use-portfolio";
import { toast } from "sonner";
import { TxDialog } from "@/components/forms/TxDialog";
import { CapitalDialog } from "@/components/forms/CapitalDialog";
import { BankDialog } from "@/components/forms/BankDialog";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/dcds", label: "DCDS", icon: Landmark },
  { to: "/etf", label: "ETF", icon: PieChart },
  { to: "/stock", label: "Stock", icon: CandlestickChart },
  { to: "/crypto", label: "Crypto", icon: Coins },
  { to: "/bank", label: "Bank", icon: Building2 },
  { to: "/tplus", label: "Trade T+", icon: BarChart3 },
  { to: "/reports", label: "Reports", icon: Wallet },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell() {
  const { user, isPending } = useCurrentUserState();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobile, setMobile] = useState(false);
  const theme = useUiStore((s) => s.theme);
  const currency = useUiStore((s) => s.currency);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const toggleCurrency = useUiStore((s) => s.toggleCurrency);
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  if (isPending) {
    return <LoginScreen />;
  }
  if (!user) return <RedirectToSignIn />;

  const email = user.primaryEmail ?? user.displayName ?? "Account";

  async function onRefresh() {
    setRefreshing(true);
    try {
      const res = await refreshMarketPrices();
      qc.setQueryData(PORTFOLIO_KEY, { ledger: res.ledger, state: res.state });
      toast.success(res.notes.join(" · "));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Không cập nhật được giá");
    } finally {
      setRefreshing(false);
    }
  }

  const nav = (
    <nav className="flex flex-1 flex-col gap-0.5 p-3">
      {NAV.map((item) => {
        const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={() => setMobile(false)}
            className={cn(
              "flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
              active
                ? "bg-white/12 text-white"
                : "text-sidebar-foreground/75 hover:bg-white/8 hover:text-white",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-dvh bg-background text-foreground">
      {mobile && (
        <button
          className="fixed inset-0 z-30 bg-navy-deep/50 md:hidden"
          onClick={() => setMobile(false)}
          aria-label="Đóng menu"
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-60 flex-col bg-sidebar text-sidebar-foreground transition-transform md:translate-x-0",
          mobile ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-white/10">
              <BarChart3 className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">Portfolio Manager</p>
              <p className="text-xs text-white/50">Sổ cái thuần tài sản</p>
            </div>
          </div>
          <button className="grid h-10 w-10 place-items-center md:hidden" onClick={() => setMobile(false)}>
            <X className="h-4 w-4" />
          </button>
        </div>
        {nav}
      </aside>

      <div className="md:pl-60">
        <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-2 border-b border-border bg-card/90 px-3 py-2 backdrop-blur md:px-6">
          <div className="flex items-center gap-2">
            <button
              className="grid h-10 w-10 place-items-center rounded-md hover:bg-muted md:hidden"
              onClick={() => setMobile(true)}
              aria-label="Menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="hidden text-sm font-semibold sm:inline">Portfolio Manager</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button size="sm" variant="outline" onClick={onRefresh} disabled={refreshing} className="gap-1.5">
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
              <span className="hidden sm:inline">{refreshing ? "Đang cập nhật..." : "Cập nhật giá"}</span>
            </Button>
            <Button size="sm" variant="outline" onClick={toggleCurrency} title="Chuyển VND / USD">
              <span className={currency === "VND" ? "font-semibold" : "text-muted-foreground"}>VND</span>
              <span className="text-muted-foreground">/</span>
              <span className={currency === "USD" ? "font-semibold" : "text-muted-foreground"}>USD</span>
            </Button>
            <Button size="icon" variant="outline" onClick={toggleTheme} title="Theme">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <div className="flex items-center gap-1 pl-1">
              <span className="hidden max-w-40 truncate text-xs text-muted-foreground sm:inline">{email}</span>
              <Tooltip content="Đăng xuất">
                <button
                  type="button"
                  disabled={signingOut}
                  onClick={() => {
                    setSigningOut(true);
                    void signOut().catch(() => setSigningOut(false));
                  }}
                  className="grid h-10 w-10 place-items-center rounded-md hover:bg-muted"
                  aria-label="Đăng xuất"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </Tooltip>
            </div>
          </div>
        </header>
        <main className="min-w-0 overflow-x-hidden p-3 md:p-6">
          <Outlet />
        </main>
      </div>
      <TxDialog />
      <CapitalDialog />
      <BankDialog />
    </div>
  );
}

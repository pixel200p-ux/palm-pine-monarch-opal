import { AllocChart } from "@/components/AllocChart";
import { Card, CardTitle } from "@/components/ui/card";
import { Kpi } from "@/components/Kpi";
import { displayMoney } from "@/lib/display";
import { formatPct, signedClass } from "@/engine/money";
import { usePortfolio } from "@/lib/use-portfolio";
import { useUiStore } from "@/lib/ui-store";
import { Skeleton } from "@/components/ui/skeleton";

export function ReportsPage() {
  const { data, isPending } = usePortfolio();
  const currency = useUiStore((s) => s.currency);
  if (isPending || !data) return <Skeleton className="h-64" />;
  const s = data.state;
  const usd = s.usdVnd;
  const alloc = ["DCDS", "ETF", "STOCK", "CRYPTO", "BANK"].map((k) => ({
    key: k,
    label: k === "STOCK" ? "Stock" : k === "BANK" ? "Bank" : k,
    value: s.allocation[k]?.value ?? 0,
    pct: s.allocation[k]?.pct ?? 0,
  }));

  const rows = [
    { label: "P&L giao dịch (realized)", value: s.realizedTradePnl },
    { label: "P&L chưa thực hiện", value: s.unrealizedPnl },
    { label: "Cổ tức tiền mặt", value: s.cashDividend },
    { label: "Lãi T+ (hạ giá vốn)", value: s.tplusProfit },
    { label: "Lãi Bank dồn", value: s.bankInterest },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Reports</h1>
        <p className="text-sm text-muted-foreground">Mọi số liệu đi qua Replay Engine.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi label="Original Capital" value={displayMoney(s.originalCapital, currency, usd)} />
        <Kpi label="NAV" value={displayMoney(s.nav, currency, usd)} />
        <Kpi
          label="Hiệu suất"
          value={formatPct(s.totalReturnPct)}
          hint={displayMoney(s.totalPnl, currency, usd)}
          tone={s.totalPnl > 0 ? "profit" : s.totalPnl < 0 ? "loss" : "default"}
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Phân bổ NAV</CardTitle>
          <div className="mt-3">
            <AllocChart data={alloc} />
          </div>
        </Card>
        <Card>
          <CardTitle>Cơ cấu P&L</CardTitle>
          <ul className="mt-3 space-y-2 text-sm">
            {rows.map((r) => (
              <li key={r.label} className="flex justify-between gap-2">
                <span>{r.label}</span>
                <span className={`font-mono tabular-nums ${signedClass(r.value)}`}>
                  {displayMoney(r.value, currency, usd)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

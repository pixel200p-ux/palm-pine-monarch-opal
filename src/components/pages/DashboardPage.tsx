import { AllocChart } from "@/components/AllocChart";
import { HoldingsTable } from "@/components/HoldingsTable";
import { Kpi } from "@/components/Kpi";
import { TplusOpenCard } from "@/components/TplusOpenCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDesc, CardTitle } from "@/components/ui/card";
import { formatViDate } from "@/engine/dates";
import { formatPct, signedClass } from "@/engine/money";
import { displayMoney } from "@/lib/display";
import { usePortfolio } from "@/lib/use-portfolio";
import { useUiStore } from "@/lib/ui-store";
import { confirmBankRate } from "@/lib/api/portfolio";
import { usePortfolioMutation } from "@/lib/use-portfolio";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { Link } from "@tanstack/react-router";

const CAT_ORDER = ["DCDS", "ETF", "STOCK", "CRYPTO", "BANK"] as const;
const CAT_LABEL: Record<string, string> = {
  DCDS: "DCDS",
  ETF: "ETF",
  STOCK: "Stock",
  CRYPTO: "Crypto",
  BANK: "Bank",
};

export function DashboardPage() {
  const { data, isPending } = usePortfolio();
  const currency = useUiStore((s) => s.currency);
  const stockFilter = useUiStore((s) => s.stockFilter);
  const setStockFilter = useUiStore((s) => s.setStockFilter);
  const openCapital = useUiStore((s) => s.openCapital);
  const openTx = useUiStore((s) => s.openTx);
  const openBank = useUiStore((s) => s.openBank);
  const rateMut = usePortfolioMutation((d: Parameters<typeof confirmBankRate>[0]) => confirmBankRate(d), "Đã cập nhật lãi suất");
  const [rateDraft, setRateDraft] = useState<Record<string, string>>({});

  if (isPending || !data) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  const { state, ledger } = data;
  const usd = state.usdVnd;
  const holdings = state.holdings.filter((h) => {
    if (stockFilter === "ALL") return true;
    if (h.assetType !== "STOCK") return true;
    return h.accountId === stockFilter;
  });

  const due = state.banks.filter((b) => b.remainingDays <= 5);
  const alloc = CAT_ORDER.map((k) => ({
    key: k,
    label: CAT_LABEL[k],
    value: state.allocation[k]?.value ?? 0,
    pct: state.allocation[k]?.pct ?? 0,
  }));

  const recent = [...ledger.transactions].sort((a, b) => b.txDate.localeCompare(a.txDate) || b.createdAt.localeCompare(a.createdAt)).slice(0, 8);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Sổ cái thật · Asset-Only Ledger</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => openCapital("DEPOSIT")}>Nạp vốn gốc</Button>
          <Button variant="outline" onClick={() => openCapital("WITHDRAW")}>
            Rút vốn gốc
          </Button>
          <Button variant="outline" onClick={() => openTx()}>
            Giao dịch
          </Button>
          <Button variant="outline" onClick={openBank}>
            Mở sổ Bank
          </Button>
        </div>
      </div>

      {due.map((b) => (
        <Card key={b.id} className="border-warn/40 bg-warn/5 p-4">
          {b.remainingDays <= 0 ? (
            <p className="text-sm font-medium">
              Hết hôm nay số tiền gửi ngân hàng {b.bankName} sẽ đáo hạn — {displayMoney(b.currentPrincipal, currency, usd)}.
            </p>
          ) : (
            <p className="text-sm font-medium">
              Sổ {b.bankName} còn {b.remainingDays} ngày đáo hạn. Nhập lãi suất kỳ tái tục nếu có thay đổi.
            </p>
          )}
          {b.rateUnconfirmed && (
            <p className="mt-1 text-xs text-warn">Vẫn chưa nhập lãi suất kỳ này — đang dùng tạm {b.currentRate}%.</p>
          )}
          <form
            className="mt-3 flex flex-wrap items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const r = Number(rateDraft[b.id] ?? b.currentRate);
              rateMut.mutate({ data: { depositId: b.id, periodNumber: b.rateUnconfirmed ? b.renewalCount : b.renewalCount + 1, interestRate: r } });
            }}
          >
            <Input
              className="w-28"
              value={rateDraft[b.id] ?? String(b.currentRate)}
              onChange={(e) => setRateDraft((d) => ({ ...d, [b.id]: e.target.value }))}
            />
            <span className="text-xs text-muted-foreground">%/năm</span>
            <Button size="sm" type="submit">
              Lưu lãi suất
            </Button>
          </form>
        </Card>
      ))}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Original Capital" value={displayMoney(state.originalCapital, currency, usd)} hint="SUM(Deposit) − SUM(Withdrawal)" />
        <Kpi label="NAV" value={displayMoney(state.nav, currency, usd)} hint="Tổng giá trị thị trường tài sản" />
        <Kpi
          label="Lãi / lỗ"
          value={displayMoney(state.totalPnl, currency, usd)}
          hint={formatPct(state.totalReturnPct)}
          tone={state.totalPnl > 0 ? "profit" : state.totalPnl < 0 ? "loss" : "default"}
        />
        <Kpi label="T+ đã hạ vốn" value={displayMoney(state.tplusProfit, currency, usd)} hint="Lợi nhuận T+ ròng đã COMPLETED" />
      </div>

      {state.tplusCards.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-end justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold">T+ đang mở</h2>
              <p className="text-xs text-muted-foreground">
                Qty T+ cộng vào Holdings. Lãi ròng chỉ hạ giá vốn khi Sell đã khớp COMPLETED.
              </p>
            </div>
            <Link to="/tplus" className="text-sm text-primary hover:underline">
              Trade T+
            </Link>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {state.tplusCards.map((c) => (
              <TplusOpenCard key={c.assetId} card={c} usdVnd={usd} />
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardTitle>Phân bổ</CardTitle>
          <CardDesc className="mb-3">DCDS → ETF → Stock → Crypto → Bank</CardDesc>
          <AllocChart data={alloc} />
        </Card>
        <Card className="lg:col-span-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>Holdings</CardTitle>
              <CardDesc>VPS / SSI độc lập · T+ OPEN cộng vào SL</CardDesc>
            </div>
            <div className="flex gap-1">
              {(["ALL", "vps", "ssi"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setStockFilter(f)}
                  className={`min-h-10 rounded-md border px-3 text-xs ${stockFilter === f ? "border-primary bg-primary/10" : "border-border"}`}
                >
                  {f === "ALL" ? "All" : f.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <HoldingsTable rows={holdings} usdVnd={usd} />
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Vốn gốc gần đây</CardTitle>
          <ul className="mt-3 space-y-2 text-sm">
            {ledger.capital.length === 0 && <li className="text-muted-foreground">Chưa nạp vốn. Bấm Nạp vốn gốc.</li>}
            {ledger.capital
              .slice()
              .reverse()
              .slice(0, 6)
              .map((c) => (
                <li key={c.id} className="flex justify-between gap-2">
                  <span>
                    {formatViDate(c.movementDate)} · {c.kind === "DEPOSIT" ? "Nạp" : "Rút"}
                  </span>
                  <span className={c.kind === "DEPOSIT" ? "text-profit" : "text-loss"}>
                    {c.kind === "DEPOSIT" ? "+" : "−"}
                    {displayMoney(c.amount, currency, usd)}
                  </span>
                </li>
              ))}
          </ul>
        </Card>
        <Card>
          <CardTitle>Giao dịch gần đây</CardTitle>
          <ul className="mt-3 space-y-2 text-sm">
            {recent.length === 0 && <li className="text-muted-foreground">Chưa có lệnh. Sổ cái đang trống.</li>}
            {recent.map((t) => {
              const asset = ledger.assets.find((a) => a.id === t.assetId);
              return (
                <li key={t.id} className="flex justify-between gap-2">
                  <span className="min-w-0 truncate">
                    {formatViDate(t.txDate)} · {t.txType} {asset?.symbol ?? ""} {t.tradeTplus ? <Badge tone="navy">T+</Badge> : null}
                  </span>
                  <span className={`shrink-0 font-mono tabular-nums ${signedClass(t.txType === "SELL" ? 1 : -1)}`}>
                    {t.quantity ?? ""}
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </div>
  );
}

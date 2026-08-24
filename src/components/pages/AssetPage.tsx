import { AllocChart } from "@/components/AllocChart";
import { HoldingsTable } from "@/components/HoldingsTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDesc, CardTitle } from "@/components/ui/card";
import { formatViDate } from "@/engine/dates";
import { displayMoney, displayPrice } from "@/lib/display";
import { formatQty } from "@/engine/money";
import { deleteTransaction } from "@/lib/api/portfolio";
import { usePortfolio, usePortfolioMutation } from "@/lib/use-portfolio";
import { useUiStore } from "@/lib/ui-store";
import type { AssetType } from "@/engine/types";
import { Skeleton } from "@/components/ui/skeleton";

const TITLE: Record<AssetType, { title: string; sub: string }> = {
  DCDS: { title: "DCDS", sub: "Quỹ mở · số CCQ = tiền / giá, làm tròn 4 số" },
  ETF: { title: "ETF", sub: "Quỹ ETF" },
  STOCK: { title: "Stock", sub: "VPS và SSI độc lập về holdings, giá vốn, P&L và T+" },
  CRYPTO: { title: "Crypto", sub: "Giá USD · tỷ giá VND khóa theo từng lệnh" },
};

export function AssetPage({ assetType }: { assetType: AssetType }) {
  const { data, isPending } = usePortfolio();
  const currency = useUiStore((s) => s.currency);
  const stockFilter = useUiStore((s) => s.stockFilter);
  const setStockFilter = useUiStore((s) => s.setStockFilter);
  const openTx = useUiStore((s) => s.openTx);
  const del = usePortfolioMutation((d: Parameters<typeof deleteTransaction>[0]) => deleteTransaction(d), "Đã xóa lệnh");

  if (isPending || !data) return <Skeleton className="h-64" />;
  const { state, ledger } = data;
  const usd = state.usdVnd;
  const meta = TITLE[assetType];

  let holdings = state.holdings.filter((h) => h.assetType === assetType);
  if (assetType === "STOCK" && stockFilter !== "ALL") holdings = holdings.filter((h) => h.accountId === stockFilter);

  const txs = ledger.transactions.filter((t) => {
    const a = ledger.assets.find((x) => x.id === t.assetId);
    if (!a || a.assetType !== assetType) return false;
    if (assetType === "STOCK" && stockFilter !== "ALL") return t.accountId === stockFilter;
    return true;
  });

  const pie = holdings.map((h) => ({
    key: h.assetId,
    label: `${h.symbol} (${h.accountName})`,
    value: h.marketValue,
    pct: holdings.reduce((s, x) => s + x.marketValue, 0) > 0 ? (h.marketValue / holdings.reduce((s, x) => s + x.marketValue, 0)) * 100 : 0,
  }));

  const vpsPie = holdings
    .filter((h) => h.accountId === "vps")
    .map((h) => {
      const tot = holdings.filter((x) => x.accountId === "vps").reduce((s, x) => s + x.marketValue, 0);
      return { key: h.assetId, label: h.symbol, value: h.marketValue, pct: tot ? (h.marketValue / tot) * 100 : 0 };
    });
  const ssiPie = holdings
    .filter((h) => h.accountId === "ssi")
    .map((h) => {
      const tot = holdings.filter((x) => x.accountId === "ssi").reduce((s, x) => s + x.marketValue, 0);
      return { key: h.assetId, label: h.symbol, value: h.marketValue, pct: tot ? (h.marketValue / tot) * 100 : 0 };
    });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{meta.title}</h1>
          <p className="text-sm text-muted-foreground">{meta.sub}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {assetType === "STOCK" &&
            (["ALL", "vps", "ssi"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setStockFilter(f)}
                className={`min-h-10 rounded-md border px-3 text-xs ${stockFilter === f ? "border-primary bg-primary/10" : "border-border"}`}
              >
                {f === "ALL" ? "All" : f.toUpperCase()}
              </button>
            ))}
          <Button onClick={() => openTx({ assetType, accountId: assetType === "STOCK" ? (stockFilter === "ssi" ? "ssi" : "vps") : undefined, txType: "BUY" })}>
            Buy
          </Button>
          <Button variant="outline" onClick={() => openTx({ assetType, txType: "SELL" })}>
            Sell
          </Button>
        </div>
      </div>

      {assetType === "STOCK" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardTitle>VPS</CardTitle>
            <AllocChart data={vpsPie} />
          </Card>
          <Card>
            <CardTitle>SSI</CardTitle>
            <AllocChart data={ssiPie} />
          </Card>
        </div>
      ) : (
        <Card>
          <CardTitle>Phân bổ mã</CardTitle>
          <AllocChart
            data={pie.map((p) => ({
              ...p,
              key: p.key.includes("DCDS") ? "DCDS" : p.key.includes("ETF") ? "ETF" : p.key.includes("CRYPTO") || assetType === "CRYPTO" ? "CRYPTO" : "STOCK",
            }))}
          />
        </Card>
      )}

      <Card>
        <CardTitle>Vị thế</CardTitle>
        <CardDesc className="mb-3">Giá vốn đã gồm hạ vốn T+ đã COMPLETED</CardDesc>
        <HoldingsTable rows={holdings} usdVnd={usd} />
      </Card>

      {assetType === "STOCK" && (
        <Card>
          <CardTitle>Cổ tức lũy kế</CardTitle>
          <ul className="mt-3 space-y-1 text-sm">
            {holdings.map((h) => (
              <li key={h.assetId} className="flex justify-between gap-2">
                <span>
                  {h.symbol} · {h.accountName}
                </span>
                <span>
                  Tiền mặt {displayMoney(h.cashDividend, currency, usd)}
                  {h.stockDividendQty > 0 ? ` · CP thưởng ${formatQty(h.stockDividendQty, "STOCK")}` : ""}
                </span>
              </li>
            ))}
            {holdings.length === 0 && <li className="text-muted-foreground">Chưa có cổ tức.</li>}
          </ul>
        </Card>
      )}

      <Card>
        <CardTitle>Lịch sử giao dịch</CardTitle>
        <div className="table-scroll mt-3">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr className="border-b border-border">
                <th className="px-2 py-2">Ngày</th>
                <th className="px-2 py-2">Mã</th>
                <th className="px-2 py-2">Loại</th>
                <th className="px-2 py-2 text-right">SL</th>
                <th className="px-2 py-2 text-right">Giá</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {txs
                .slice()
                .reverse()
                .map((t) => {
                  const a = ledger.assets.find((x) => x.id === t.assetId);
                  return (
                    <tr key={t.id} className="border-b border-border/70">
                      <td className="px-2 py-2">{formatViDate(t.txDate)}</td>
                      <td className="px-2 py-2 font-medium">
                        {a?.symbol} {t.tradeTplus && <Badge tone="navy">T+</Badge>}
                      </td>
                      <td className="px-2 py-2">{t.txType}</td>
                      <td className="px-2 py-2 text-right font-mono">{t.quantity != null ? formatQty(t.quantity, assetType) : "—"}</td>
                      <td className="px-2 py-2 text-right font-mono">
                        {t.price != null ? displayPrice(t.price, assetType, currency, usd) : displayMoney(t.amount, currency, usd)}
                      </td>
                      <td className="px-2 py-2 text-right">
                        <Button size="sm" variant="ghost" onClick={() => del.mutate({ data: { id: t.id } })}>
                          Xóa
                        </Button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
          {txs.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Chưa có giao dịch.</p>}
        </div>
      </Card>
    </div>
  );
}

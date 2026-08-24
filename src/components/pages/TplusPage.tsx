import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { TplusOpenCard } from "@/components/TplusOpenCard";
import { formatViDate } from "@/engine/dates";
import { displayMoney, displayPrice } from "@/lib/display";
import { signedClass } from "@/engine/money";
import { usePortfolio } from "@/lib/use-portfolio";
import { useUiStore } from "@/lib/ui-store";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";

function exportHistory(rows: ReturnType<typeof usePortfolio>["data"]) {
  if (!rows) return;
  const h = rows.state.tplusHistory;
  const headers = [
    "Code","Account","Buy Date","Sell Date","Holding before T+","Buy Quantity","Buy Price","Sell Quantity","Sell Price","Fees","Tax","Gross Profit","Net Profit","Average Cost Before","Average Cost After","Cost Reduction","Remaining Holding","Remaining Unrealized P/L","Status",
  ];
  const lines = [
    headers.join(","),
    ...h.map((c) =>
      [
        c.symbol,
        c.accountName,
        c.buyDate,
        c.sellDate,
        c.holdingBefore,
        c.buyQuantity,
        c.buyPrice,
        c.sellQuantity,
        c.sellPrice,
        c.fees,
        c.tax,
        c.grossProfit,
        c.netProfit,
        c.avgCostBefore,
        c.avgCostAfter,
        c.costReduction,
        c.remainingHolding,
        c.remainingUnrealized,
        c.status,
      ].join(","),
    ),
  ];
  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "lich-su-T+.csv";
  a.click();
}

export function TplusPage() {
  const { data, isPending } = usePortfolio();
  const currency = useUiStore((s) => s.currency);
  const [history, setHistory] = useState(false);

  if (isPending || !data) return <Skeleton className="h-64" />;
  const usd = data.state.usdVnd;
  const cards = data.state.tplusCards;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Trade T+</h1>
          <p className="text-sm text-muted-foreground">
            Chỉ hiện mã đang có lệnh T+ OPEN. Khớp bán chọn tay. Lãi COMPLETED mới hạ giá vốn gốc.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant={history ? "default" : "outline"} onClick={() => setHistory((v) => !v)}>
            Lịch sử T+
          </Button>
          <Button variant="outline" onClick={() => exportHistory(data)}>
            Xuất Excel
          </Button>
        </div>
      </div>

      {!history && cards.length === 0 && (
        <Card>
          <p className="text-sm text-muted-foreground">
            Không có lệnh T+ đang mở. Khi Buy, tick Trade T+ để đưa lệnh vào đây.
          </p>
        </Card>
      )}

      {!history && (
        <div className="grid gap-3 lg:grid-cols-2">
          {cards.map((c) => (
            <TplusOpenCard key={c.assetId} card={c} usdVnd={usd} />
          ))}
        </div>
      )}

      {history && (
        <Card>
          <CardTitle>Lịch sử T+</CardTitle>
          <div className="table-scroll mt-3">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="px-2 py-2">Mã</th>
                  <th className="px-2 py-2">Account</th>
                  <th className="px-2 py-2">Mua</th>
                  <th className="px-2 py-2">Bán</th>
                  <th className="px-2 py-2 text-right">SL</th>
                  <th className="px-2 py-2 text-right">Lãi ròng</th>
                  <th className="px-2 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.state.tplusHistory.map((c) => (
                  <tr key={c.id} className="border-b border-border/70">
                    <td className="px-2 py-2 font-medium">{c.symbol}</td>
                    <td className="px-2 py-2">{c.accountName}</td>
                    <td className="px-2 py-2">
                      {formatViDate(c.buyDate)} · {displayPrice(c.buyPrice, "STOCK", currency, usd)}
                    </td>
                    <td className="px-2 py-2">
                      {formatViDate(c.sellDate)} · {displayPrice(c.sellPrice, "STOCK", currency, usd)}
                    </td>
                    <td className="px-2 py-2 text-right font-mono">{c.sellQuantity}</td>
                    <td className={`px-2 py-2 text-right font-mono ${signedClass(c.netProfit)}`}>
                      {displayMoney(c.netProfit, currency, usd)}
                    </td>
                    <td className="px-2 py-2">
                      <Badge tone={c.status === "COMPLETED" ? "profit" : "warn"}>{c.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.state.tplusHistory.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">Chưa có cycle T+ hoàn tất.</p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

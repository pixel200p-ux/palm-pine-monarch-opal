import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RTooltip } from "recharts";

const COLORS: Record<string, string> = {
  DCDS: "var(--app-chart-dcds)",
  ETF: "var(--app-chart-etf)",
  STOCK: "var(--app-chart-stock)",
  CRYPTO: "var(--app-chart-crypto)",
  BANK: "var(--app-chart-bank)",
};

export function AllocChart({
  data,
}: {
  data: { key: string; label: string; value: number; pct: number }[];
}) {
  const rows = data.filter((d) => d.value > 0);
  if (rows.length === 0) {
    return (
      <div className="grid h-48 place-items-center text-sm text-muted-foreground">Chưa có tài sản</div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row">
      <div className="h-48 w-48 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={rows} dataKey="value" nameKey="label" innerRadius={52} outerRadius={80} paddingAngle={2}>
              {rows.map((r) => (
                <Cell key={r.key} fill={COLORS[r.key] ?? "var(--app-navy)"} />
              ))}
            </Pie>
            <RTooltip
              formatter={(v) => {
                const n = typeof v === "number" ? v : Number(v);
                return Number.isFinite(n) ? n.toLocaleString("vi-VN") : String(v ?? "");
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="w-full space-y-1.5 text-sm">
        {data.map((r) => (
          <li key={r.key} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[r.key] }} />
              {r.label}
            </span>
            <span className="font-mono tabular-nums text-muted-foreground">{r.pct.toFixed(1)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

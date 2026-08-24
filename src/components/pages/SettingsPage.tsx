import { Button } from "@/components/ui/button";
import { Card, CardDesc, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveFees, setUsdVnd } from "@/lib/api/portfolio";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { signOut } from "@/lib/auth/client";
import { usePortfolio, usePortfolioMutation } from "@/lib/use-portfolio";
import { useUiStore } from "@/lib/ui-store";
import { LogOut, Moon, Sun } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { Tooltip } from "@/components/ui/tooltip";
import type { FeeProfile } from "@/engine/types";

const PROFILES: { id: FeeProfile; label: string }[] = [
  { id: "STOCK_VPS", label: "VPS Stock" },
  { id: "STOCK_SSI", label: "SSI Stock" },
  { id: "CRYPTO", label: "Crypto" },
  { id: "DCDS", label: "DCDS" },
  { id: "ETF", label: "ETF" },
];

export function SettingsPage() {
  const user = useCurrentUser();
  const { data, isPending } = usePortfolio();
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const feeMut = usePortfolioMutation((d: Parameters<typeof saveFees>[0]) => saveFees(d), "Đã lưu phí");
  const fxMut = usePortfolioMutation((d: Parameters<typeof setUsdVnd>[0]) => setUsdVnd(d), "Đã lưu tỷ giá");
  const [fx, setFx] = useState("");
  const [draft, setDraft] = useState<Record<string, { buy: string; sell: string; tax: string }>>({});
  const [signingOut, setSigningOut] = useState(false);

  if (isPending || !data) return <Skeleton className="h-64" />;
  const email = user?.primaryEmail ?? user?.displayName ?? "Account";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Phí / thuế mặc định chỉ sửa tại đây. Form giao dịch tự nạp tỷ lệ này.</p>
      </div>

      <Card>
        <CardTitle>Hồ sơ</CardTitle>
        <div className="mt-3 flex items-center gap-2">
          <span className="text-sm">{email}</span>
          <Tooltip content="Đăng xuất">
            <button
              type="button"
              className="grid h-10 w-10 place-items-center rounded-md hover:bg-muted"
              disabled={signingOut}
              onClick={() => {
                setSigningOut(true);
                void signOut().catch(() => setSigningOut(false));
              }}
              aria-label="Đăng xuất"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </Tooltip>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Dữ liệu sổ cái dùng chung cho mọi tài khoản đã đăng nhập.</p>
      </Card>

      <Card>
        <CardTitle>Theme</CardTitle>
        <div className="mt-3 flex gap-2">
          <Button variant={theme === "light" ? "default" : "outline"} onClick={() => setTheme("light")}>
            <Sun className="h-4 w-4" /> Sáng
          </Button>
          <Button variant={theme === "dark" ? "default" : "outline"} onClick={() => setTheme("dark")}>
            <Moon className="h-4 w-4" /> Tối
          </Button>
        </div>
      </Card>

      <Card>
        <CardTitle>Tỷ giá USD/VND</CardTitle>
        <CardDesc>Dùng khi chuyển VND/USD trên header. Nút Cập nhật giá cũng ghi đè số này.</CardDesc>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const r = Number(fx || data.state.usdVnd);
            if (r > 0) fxMut.mutate({ data: { rate: r } });
          }}
        >
          <Input className="max-w-40" value={fx || String(data.state.usdVnd)} onChange={(e) => setFx(e.target.value)} />
          <Button type="submit">Lưu</Button>
        </form>
      </Card>

      <Card>
        <CardTitle>Phí & thuế mặc định</CardTitle>
        <div className="mt-4 space-y-4">
          {PROFILES.map((p) => {
            const row = data.ledger.fees.find((f) => f.profile === p.id);
            const d = draft[p.id] ?? {
              buy: String(row?.buyFeePct ?? 0),
              sell: String(row?.sellFeePct ?? 0),
              tax: String(row?.sellTaxPct ?? 0),
            };
            return (
              <form
                key={p.id}
                className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-4 sm:items-end"
                onSubmit={(e) => {
                  e.preventDefault();
                  feeMut.mutate({
                    data: {
                      profile: p.id,
                      buyFeePct: Number(d.buy),
                      sellFeePct: Number(d.sell),
                      sellTaxPct: Number(d.tax),
                    },
                  });
                }}
              >
                <p className="text-sm font-medium sm:col-span-4">{p.label}</p>
                <div>
                  <Label>Phí mua %</Label>
                  <Input value={d.buy} onChange={(e) => setDraft((x) => ({ ...x, [p.id]: { ...d, buy: e.target.value } }))} />
                </div>
                <div>
                  <Label>Phí bán %</Label>
                  <Input value={d.sell} onChange={(e) => setDraft((x) => ({ ...x, [p.id]: { ...d, sell: e.target.value } }))} />
                </div>
                <div>
                  <Label>Thuế bán %</Label>
                  <Input value={d.tax} onChange={(e) => setDraft((x) => ({ ...x, [p.id]: { ...d, tax: e.target.value } }))} />
                </div>
                <Button type="submit">Lưu</Button>
              </form>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

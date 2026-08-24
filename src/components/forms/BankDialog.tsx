import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useUiStore } from "@/lib/ui-store";
import { usePortfolioMutation } from "@/lib/use-portfolio";
import { saveBank } from "@/lib/api/portfolio";
import { parseDecimal, parseVndAmount } from "@/engine/money";
import { todayYmd } from "@/engine/dates";
import { useState } from "react";

const BANKS = ["VietinBank", "Vietcombank", "MB", "Techcombank", "BIDV", "Agribank", "ACB", "VPBank", "TPBank", "Khác"];

export function BankDialog() {
  const open = useUiStore((s) => s.bankOpen);
  const close = useUiStore((s) => s.closeBank);
  const [bankName, setBankName] = useState("VietinBank");
  const [custom, setCustom] = useState("");
  const [principal, setPrincipal] = useState("");
  const [startDate, setStartDate] = useState(todayYmd());
  const [term, setTerm] = useState("6");
  const [rate, setRate] = useState("5.5");
  const [rollover, setRollover] = useState(true);
  const mut = usePortfolioMutation((d: Parameters<typeof saveBank>[0]) => saveBank(d), "Đã mở sổ tiết kiệm");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const name = bankName === "Khác" ? custom.trim() : bankName;
    const p = parseVndAmount(principal);
    if (!name || p <= 0) return;
    mut.mutate(
      {
        data: {
          bankName: name,
          principal: p,
          startDate,
          termMonths: Number(term) || 1,
          interestRate: parseDecimal(rate),
          autoRollover: rollover,
        },
      },
      {
        onSuccess: () => {
          close();
          setPrincipal("");
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent title="Mở sổ tiết kiệm">
        <form className="space-y-3" onSubmit={submit}>
          <p className="text-sm text-muted-foreground">
            Mô hình thuần tài sản: mở sổ không trừ tiền mặt. NAV cộng giá trị sổ đang hiệu lực.
          </p>
          <div className="space-y-1">
            <Label>Ngân hàng</Label>
            <div className="flex flex-wrap gap-1.5">
              {BANKS.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setBankName(b)}
                  className={`min-h-10 rounded-full border px-3 text-xs ${bankName === b ? "border-primary bg-primary/10 text-primary" : "border-border"}`}
                >
                  {b}
                </button>
              ))}
            </div>
            {bankName === "Khác" && (
              <Input className="mt-2" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Tên ngân hàng" />
            )}
          </div>
          <div className="space-y-1">
            <Label>Số tiền gửi (VND)</Label>
            <Input value={principal} onChange={(e) => setPrincipal(e.target.value)} placeholder="100,000,000" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Ngày gửi</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label>Kỳ hạn (tháng)</Label>
              <Input value={term} onChange={(e) => setTerm(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Lãi suất (%/năm)</Label>
            <Input value={rate} onChange={(e) => setRate(e.target.value)} />
          </div>
          <div className="flex items-center justify-between gap-3">
            <Label>Tự động tái tục</Label>
            <Switch checked={rollover} onCheckedChange={setRollover} />
          </div>
          <Button type="submit" className="w-full" disabled={mut.isPending}>
            {mut.isPending ? "Đang lưu..." : "Lưu sổ"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

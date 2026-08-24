import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select } from "@/components/ui/select";
import { useUiStore } from "@/lib/ui-store";
import { usePortfolio, usePortfolioMutation } from "@/lib/use-portfolio";
import { saveTransaction } from "@/lib/api/portfolio";
import { dcdsQty } from "@/engine/replay";
import { parseBrokerPrice, parseDecimal, parseVndAmount, formatQty } from "@/engine/money";
import { todayYmd, formatViDate } from "@/engine/dates";
import { displayPrice } from "@/lib/display";
import type { AssetType, FeeProfile, TxType } from "@/engine/types";
import { useEffect, useMemo, useState } from "react";

const TYPES: { value: AssetType; label: string }[] = [
  { value: "DCDS", label: "DCDS" },
  { value: "ETF", label: "ETF" },
  { value: "STOCK", label: "Stock" },
  { value: "CRYPTO", label: "Crypto" },
];

function accountFor(type: AssetType, stockAccount: string): { id: string; currency: string; profile: FeeProfile } {
  if (type === "STOCK") return { id: stockAccount, currency: "VND", profile: stockAccount === "ssi" ? "STOCK_SSI" : "STOCK_VPS" };
  if (type === "CRYPTO") return { id: "crypto", currency: "USD", profile: "CRYPTO" };
  if (type === "ETF") return { id: "etf", currency: "VND", profile: "ETF" };
  return { id: "dcds", currency: "VND", profile: "DCDS" };
}

export function TxDialog() {
  const prefill = useUiStore((s) => s.txOpen);
  const close = useUiStore((s) => s.closeTx);
  const currency = useUiStore((s) => s.currency);
  const { data } = usePortfolio();
  const mut = usePortfolioMutation((d: Parameters<typeof saveTransaction>[0]) => saveTransaction(d), "Đã ghi giao dịch");

  const [assetType, setAssetType] = useState<AssetType>("STOCK");
  const [stockAccount, setStockAccount] = useState("vps");
  const [txType, setTxType] = useState<TxType>("BUY");
  const [symbol, setSymbol] = useState("");
  const [name, setName] = useState("");
  const [date, setDate] = useState(todayYmd());
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");
  const [amount, setAmount] = useState("");
  const [tplus, setTplus] = useState(false);
  const [fx, setFx] = useState("");
  const [divTotal, setDivTotal] = useState("");
  const [stockDivQty, setStockDivQty] = useState("");
  const [feeOverride, setFeeOverride] = useState("");
  const [taxOverride, setTaxOverride] = useState("");
  const [matchQty, setMatchQty] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!prefill) return;
    setAssetType(prefill.assetType ?? "STOCK");
    setStockAccount(prefill.accountId === "ssi" ? "ssi" : "vps");
    setTxType(prefill.txType ?? "BUY");
    setSymbol(prefill.symbol ?? "");
    setName(prefill.name ?? "");
    setTplus(prefill.tradeTplus ?? false);
    setDate(todayYmd());
    setQty("");
    setPrice(prefill.price != null ? String(prefill.assetType === "CRYPTO" ? prefill.price : prefill.price / 1000) : "");
    setAmount("");
    setDivTotal("");
    setStockDivQty("");
    setFeeOverride("");
    setTaxOverride("");
    setMatchQty({});
    setFx(data?.state.usdVnd ? String(data.state.usdVnd) : "25000");
  }, [prefill, data?.state.usdVnd]);

  const acc = accountFor(assetType, stockAccount);
  const feeRow = data?.ledger.fees.find((f) => f.profile === acc.profile);
  const usdVnd = data?.state.usdVnd ?? 25000;

  const parsedPrice = useMemo(() => {
    if (assetType === "CRYPTO") return parseDecimal(price);
    if (assetType === "DCDS") return parseVndAmount(price);
    return parseBrokerPrice(price);
  }, [price, assetType]);

  const parsedQty = parseDecimal(qty);
  const parsedAmount = assetType === "DCDS" && txType === "BUY" ? parseVndAmount(amount) : parsedQty * parsedPrice;
  const computedQty = assetType === "DCDS" && txType === "BUY" ? dcdsQty(parsedAmount, parsedPrice) : parsedQty;

  const notional = assetType === "DCDS" && txType === "BUY" ? parsedAmount : computedQty * parsedPrice;
  const defaultFeePct = txType === "SELL" ? (feeRow?.sellFeePct ?? 0) : (feeRow?.buyFeePct ?? 0);
  const defaultTaxPct = txType === "SELL" ? (feeRow?.sellTaxPct ?? 0) : 0;
  const autoFee = (notional * defaultFeePct) / 100;
  const autoTax = (notional * defaultTaxPct) / 100;
  const fee = feeOverride === "" ? autoFee : parseDecimal(feeOverride);
  const tax = taxOverride === "" ? autoTax : parseDecimal(taxOverride);

  const openLots =
    data?.state.holdings.find((h) => h.accountId === acc.id && h.symbol === symbol.trim().toUpperCase())?.openLots ?? [];

  useEffect(() => {
    if (!prefill?.matchAllOpen || openLots.length === 0) return;
    const next: Record<string, string> = {};
    for (const l of openLots) next[l.buyTxId] = String(l.qtyRemaining);
    setMatchQty(next);
    const sum = openLots.reduce((s, l) => s + l.qtyRemaining, 0);
    setQty(String(sum));
  }, [prefill?.matchAllOpen, openLots.length]);

  const canTplus = (assetType === "STOCK" || assetType === "CRYPTO") && txType === "BUY";
  const canMatch = (assetType === "STOCK" || assetType === "CRYPTO") && txType === "SELL" && openLots.length > 0;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const sym = symbol.trim().toUpperCase();
    if (!sym) return;
    const matches = Object.entries(matchQty)
      .map(([buyTxId, q]) => ({ buyTxId, quantity: parseDecimal(q) }))
      .filter((m) => m.quantity > 0);

    mut.mutate(
      {
        data: {
          accountId: acc.id,
          symbol: sym,
          name: name || sym,
          assetType,
          currency: acc.currency,
          txType,
          txDate: date,
          quantity: txType === "CASH_DIVIDEND" ? null : computedQty,
          price: txType === "CASH_DIVIDEND" || txType === "STOCK_DIVIDEND" ? null : parsedPrice,
          amount: txType === "CASH_DIVIDEND" ? parseVndAmount(divTotal) : notional,
          fee,
          tax,
          tradeTplus: canTplus && tplus,
          fxRate: assetType === "CRYPTO" ? parseDecimal(fx) || usdVnd : null,
          dividendPerShare: null,
          stockDivQty: txType === "STOCK_DIVIDEND" ? parseDecimal(stockDivQty) : null,
          currentPrice: parsedPrice || undefined,
          matches: txType === "SELL" ? matches : undefined,
        },
      },
      { onSuccess: () => close() },
    );
  }

  const txOptions =
    assetType === "STOCK"
      ? [
          { value: "BUY", label: "Buy" },
          { value: "SELL", label: "Sell" },
          { value: "CASH_DIVIDEND", label: "Cổ tức tiền mặt" },
          { value: "STOCK_DIVIDEND", label: "Cổ tức cổ phiếu" },
        ]
      : [
          { value: "BUY", label: "Buy" },
          { value: "SELL", label: "Sell" },
        ];

  return (
    <Dialog open={!!prefill} onOpenChange={(o) => !o && close()}>
      <DialogContent title="Giao dịch" className="max-w-xl">
        <form className="space-y-3" onSubmit={submit}>
          <div className="flex flex-wrap gap-1">
            {TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => {
                  setAssetType(t.value);
                  if (t.value !== "STOCK" && (txType === "CASH_DIVIDEND" || txType === "STOCK_DIVIDEND")) setTxType("BUY");
                  if (t.value !== "STOCK" && t.value !== "CRYPTO") setTplus(false);
                }}
                className={`min-h-10 rounded-full border px-3 text-xs font-medium ${assetType === t.value ? "border-primary bg-primary/10 text-primary" : "border-border"}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {assetType === "STOCK" && (
            <div className="flex gap-2">
              {(["vps", "ssi"] as const).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setStockAccount(id)}
                  className={`min-h-10 flex-1 rounded-md border text-sm ${stockAccount === id ? "border-primary bg-primary/10" : "border-border"}`}
                >
                  {id.toUpperCase()}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Loại</Label>
              <Select value={txType} onValueChange={(v) => setTxType(v as TxType)} options={txOptions} />
            </div>
            <div className="space-y-1">
              <Label>Ngày</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Mã</Label>
              <Input value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder={assetType === "CRYPTO" ? "BTC" : "MBB"} required />
            </div>
            <div className="space-y-1">
              <Label>Tên</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tùy chọn" />
            </div>
          </div>

          {txType === "CASH_DIVIDEND" && (
            <div className="space-y-1">
              <Label>Tổng tiền thực nhận (VND)</Label>
              <Input value={divTotal} onChange={(e) => setDivTotal(e.target.value)} placeholder="1,000,000" />
            </div>
          )}

          {txType === "STOCK_DIVIDEND" && (
            <div className="space-y-1">
              <Label>Số lượng CP thưởng thực nhận</Label>
              <Input value={stockDivQty} onChange={(e) => setStockDivQty(e.target.value)} />
              <p className="text-xs text-muted-foreground">Tăng holdings, pha loãng giá vốn trung bình.</p>
            </div>
          )}

          {txType === "BUY" || txType === "SELL" ? (
            <>
              {assetType === "DCDS" && txType === "BUY" ? (
                <>
                  <div className="space-y-1">
                    <Label>Số tiền mua (VND)</Label>
                    <Input value={amount} onChange={(e) => setAmount(e.target.value)} required />
                  </div>
                  <div className="space-y-1">
                    <Label>Giá CCQ (VND)</Label>
                    <Input value={price} onChange={(e) => setPrice(e.target.value)} required />
                  </div>
                  <div className="space-y-1">
                    <Label>Số CCQ (tự tính, 4 số thập phân)</Label>
                    <Input readOnly value={computedQty ? formatQty(computedQty, "DCDS") : ""} className="bg-muted" />
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Khối lượng</Label>
                    <Input value={qty} onChange={(e) => setQty(e.target.value)} placeholder="1000" required />
                  </div>
                  <div className="space-y-1">
                    <Label>Giá {assetType === "CRYPTO" ? "(USD)" : assetType === "DCDS" ? "(VND)" : "(13.5 = 13.500 ₫)"}</Label>
                    <Input value={price} onChange={(e) => setPrice(e.target.value)} placeholder={assetType === "CRYPTO" ? "65000" : "13.5"} required />
                  </div>
                </div>
              )}

              {assetType === "CRYPTO" && (
                <div className="space-y-1">
                  <Label>Tỷ giá USD/VND khóa theo lệnh</Label>
                  <Input value={fx} onChange={(e) => setFx(e.target.value)} />
                </div>
              )}

              {canTplus && (
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={tplus} onCheckedChange={(v) => setTplus(v === true)} />
                  Trade T+ — lệnh này vào phân tích T+, không cộng vào giá vốn gốc
                </label>
              )}

              {canMatch && (
                <div className="space-y-2 rounded-lg border border-border p-3">
                  <p className="text-sm font-medium">Khớp T+ thủ công</p>
                  <p className="text-xs text-muted-foreground">Chọn lệnh BUY T+ đang OPEN để khớp. Phần không khớp trừ vị thế gốc.</p>
                  {openLots.map((l) => (
                    <div key={l.buyTxId} className="flex items-center gap-2 text-sm">
                      <div className="min-w-0 flex-1">
                        <p className="truncate">
                          {formatViDate(l.buyDate)} · {l.qtyRemaining}/{l.qtyOriginal} @ {displayPrice(l.buyPrice, assetType, currency, usdVnd)}
                        </p>
                      </div>
                      <Input
                        className="w-24"
                        value={matchQty[l.buyTxId] ?? ""}
                        onChange={(e) => setMatchQty((m) => ({ ...m, [l.buyTxId]: e.target.value }))}
                        placeholder="0"
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="space-y-1">
                  <Label>Phí (mặc định {defaultFeePct}%)</Label>
                  <Input value={feeOverride} onChange={(e) => setFeeOverride(e.target.value)} placeholder={String(Math.round(autoFee * 100) / 100)} />
                </div>
                <div className="space-y-1">
                  <Label>Thuế (mặc định {defaultTaxPct}%)</Label>
                  <Input value={taxOverride} onChange={(e) => setTaxOverride(e.target.value)} placeholder={String(Math.round(autoTax * 100) / 100)} />
                </div>
              </div>
            </>
          ) : null}

          <Button type="submit" className="w-full" disabled={mut.isPending}>
            {mut.isPending ? "Đang lưu..." : "Ghi sổ"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

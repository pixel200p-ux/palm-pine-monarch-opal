/** Round CCQ to 4 decimal places. */
export function roundTo4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function roundMoney(n: number, digits = 0): number {
  const f = 10 ** digits;
  return Math.round((n + Number.EPSILON) * f) / f;
}

export function num(v: unknown): number {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Parse a VN broker-style *price*.
 * 13.5 → 13_500, 100 → 100_000, 13,500 → 13_500, 13500 → 13_500.
 */
export function parseBrokerPrice(input: string): number {
  const t = input.trim().replace(/\s/g, "");
  if (!t) return 0;
  const lastComma = t.lastIndexOf(",");
  const lastDot = t.lastIndexOf(".");
  let normalized = t;
  if (lastComma >= 0 && lastDot >= 0) {
    if (lastComma > lastDot) {
      normalized = t.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = t.replace(/,/g, "");
    }
  } else if (lastComma >= 0) {
    const frac = t.slice(lastComma + 1);
    if (frac.length === 3) normalized = t.replace(/,/g, "");
    else normalized = t.replace(",", ".");
  } else if (lastDot >= 0) {
    const frac = t.slice(lastDot + 1);
    if (frac.length === 3) normalized = t.replace(/\./g, "");
  }
  const n = Number(normalized);
  if (!Number.isFinite(n) || n < 0) return 0;
  if (n < 1000) return Math.round(n * 1000);
  return Math.round(n);
}

/** Parse a full VND amount (capital, bank principal, cash dividend total). */
export function parseVndAmount(input: string): number {
  const t = input.trim().replace(/\s/g, "");
  if (!t) return 0;
  const lastComma = t.lastIndexOf(",");
  const lastDot = t.lastIndexOf(".");
  let normalized = t;
  if (lastComma >= 0 && lastDot >= 0) {
    if (lastComma > lastDot) normalized = t.replace(/\./g, "").replace(",", ".");
    else normalized = t.replace(/,/g, "");
  } else if (lastComma >= 0) {
    const frac = t.slice(lastComma + 1);
    if (frac.length === 3) normalized = t.replace(/,/g, "");
    else normalized = t.replace(",", ".");
  } else if (lastDot >= 0) {
    const frac = t.slice(lastDot + 1);
    if (frac.length === 3) normalized = t.replace(/\./g, "");
  }
  const n = Number(normalized);
  if (!Number.isFinite(n) || n < 0) return 0;
  return roundMoney(n, 0);
}

export function parseDecimal(input: string): number {
  const t = input.trim().replace(/\s/g, "").replace(",", ".");
  if (!t) return 0;
  const n = Number(t);
  return Number.isFinite(n) ? n : 0;
}

/** Display stored VND price as broker board (13500 → "13.50"). */
export function formatBrokerPrice(vnd: number, digits = 2): string {
  if (!Number.isFinite(vnd)) return "—";
  return (vnd / 1000).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatVnd(amount: number): string {
  if (!Number.isFinite(amount)) return "—";
  return Math.round(amount).toLocaleString("vi-VN") + " ₫";
}

export function formatUsd(amount: number, digits = 2): string {
  if (!Number.isFinite(amount)) return "—";
  return (
    amount.toLocaleString("en-US", {
      minimumFractionDigits: digits,
      maximumFractionDigits: Math.max(digits, amount < 1 ? 6 : 2),
    }) + " $"
  );
}

export function formatQty(qty: number, assetType: string): string {
  if (!Number.isFinite(qty)) return "—";
  if (assetType === "DCDS" || assetType === "ETF") return roundTo4(qty).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 4 });
  if (assetType === "CRYPTO") {
    return qty.toLocaleString("en-US", { maximumFractionDigits: 8 });
  }
  return qty.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

export function formatPct(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return sign + n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits }) + "%";
}

export function signedClass(n: number): "text-profit" | "text-loss" | "text-muted-foreground" {
  if (n > 0.0000001) return "text-profit";
  if (n < -0.0000001) return "text-loss";
  return "text-muted-foreground";
}

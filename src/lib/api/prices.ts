import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { replayPortfolio } from "@/engine/replay";
import { n } from "./map";
import { mapAccount, mapAsset, mapBank, mapBankRate, mapCapital, mapFee, mapMatch, mapTx } from "./map";
import type { LedgerSnapshot } from "@/engine/types";

const COINGECKO: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  BNB: "binancecoin",
  XRP: "ripple",
  ADA: "cardano",
  DOGE: "dogecoin",
  TON: "the-open-network",
  AVAX: "avalanche-2",
  DOT: "polkadot",
  LINK: "chainlink",
  MATIC: "matic-network",
  POL: "matic-network",
  UNI: "uniswap",
  ATOM: "cosmos",
  LTC: "litecoin",
  NEAR: "near",
  APT: "aptos",
  SUI: "sui",
  PEPE: "pepe",
  SHIB: "shiba-inu",
  TRX: "tron",
  USDT: "tether",
  USDC: "usd-coin",
};

async function loadSnapshot(): Promise<LedgerSnapshot> {
  const sql = await getSql();
  const [accounts, assets, capital, transactions, matches, banks, bankRates, fees, meta] =
    await Promise.all([
      sql`select * from accounts order by id`,
      sql`select * from assets order by symbol`,
      sql`select * from capital_movements where deleted_at is null order by movement_date, created_at`,
      sql`select * from transactions where deleted_at is null order by tx_date, created_at`,
      sql`select * from tplus_matches`,
      sql`select * from bank_deposits where deleted_at is null order by start_date`,
      sql`select * from bank_rate_updates`,
      sql`select * from fee_settings`,
      sql`select value from app_meta where key = 'usd_vnd'`,
    ]);
  return {
    accounts: accounts.map(mapAccount),
    assets: assets.map(mapAsset),
    capital: capital.map(mapCapital),
    transactions: transactions.map(mapTx),
    matches: matches.map(mapMatch),
    banks: banks.map(mapBank),
    bankRates: bankRates.map(mapBankRate),
    fees: fees.map(mapFee),
    usdVnd: meta[0] ? n((meta[0] as { value: string }).value) || 25000 : 25000,
  };
}

async function fetchUsdVnd(): Promise<number | null> {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const json = (await res.json()) as { rates?: { VND?: number } };
    return json.rates?.VND ?? null;
  } catch {
    return null;
  }
}

async function fetchCrypto(symbols: string[]): Promise<Record<string, number>> {
  const ids = [...new Set(symbols.map((s) => COINGECKO[s]).filter(Boolean))];
  if (ids.length === 0) return {};
  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(",")}&vs_currencies=usd`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return {};
    const json = (await res.json()) as Record<string, { usd?: number }>;
    const out: Record<string, number> = {};
    for (const [sym, id] of Object.entries(COINGECKO)) {
      const px = json[id]?.usd;
      if (px) out[sym] = px;
    }
    return out;
  } catch {
    return {};
  }
}

async function fetchVnStocks(symbols: string[]): Promise<Record<string, number>> {
  if (symbols.length === 0) return {};
  try {
    const url = `https://bgapidatafeed.vps.com.vn/getliststockdata/${symbols.join(",")}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return {};
    const json = (await res.json()) as Array<{ stock_code?: string; code?: string; lastPrice?: number; last_price?: number; price?: number }>;
    const out: Record<string, number> = {};
    if (!Array.isArray(json)) return out;
    for (const row of json) {
      const code = String(row.stock_code || row.code || "").toUpperCase();
      const raw = n(row.lastPrice ?? row.last_price ?? row.price);
      if (!code || !raw) continue;
      // VPS feed is typically in thousands (13.5) or full. If < 1000 treat as broker.
      out[code] = raw < 1000 ? Math.round(raw * 1000) : Math.round(raw);
    }
    return out;
  } catch {
    return {};
  }
}

export const refreshMarketPrices = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async () => {
    const sql = await getSql();
    const ledger = await loadSnapshot();
    const notes: string[] = [];

    const usd = await fetchUsdVnd();
    if (usd && usd > 0) {
      await sql`
        insert into app_meta (key, value, updated_at) values ('usd_vnd', ${String(usd)}, now())
        on conflict (key) do update set value = excluded.value, updated_at = now()
      `;
      notes.push(`USD/VND ${usd.toLocaleString("vi-VN")}`);
    } else {
      notes.push("Không lấy được tỷ giá USD/VND");
    }

    const cryptoSyms = ledger.assets.filter((a) => a.assetType === "CRYPTO").map((a) => a.symbol);
    const stockSyms = ledger.assets
      .filter((a) => a.assetType === "STOCK" || a.assetType === "ETF")
      .map((a) => a.symbol);

    const [cryptoPx, stockPx] = await Promise.all([fetchCrypto(cryptoSyms), fetchVnStocks(stockSyms)]);
    let updated = 0;
    for (const a of ledger.assets) {
      let px: number | undefined;
      if (a.assetType === "CRYPTO") px = cryptoPx[a.symbol];
      else if (a.assetType === "STOCK" || a.assetType === "ETF") px = stockPx[a.symbol];
      if (px && px > 0) {
        await sql`update assets set current_price = ${px}, price_updated_at = now() where id = ${a.id}`;
        updated += 1;
      }
    }
    notes.push(`Đã cập nhật ${updated} mã`);
    const next = await loadSnapshot();
    return { ledger: next, state: replayPortfolio(next), notes };
  });

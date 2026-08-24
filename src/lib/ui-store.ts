import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AssetType, TxType } from "@/engine/types";

export type ThemeMode = "light" | "dark";
export type DisplayCurrency = "VND" | "USD";

export type TxPrefill = {
  accountId?: string;
  symbol?: string;
  name?: string;
  assetType?: AssetType;
  txType?: TxType;
  tradeTplus?: boolean;
  price?: number;
  matchAllOpen?: boolean;
};

type UiState = {
  theme: ThemeMode;
  currency: DisplayCurrency;
  stockFilter: "ALL" | "vps" | "ssi";
  txOpen: TxPrefill | null;
  capitalOpen: "DEPOSIT" | "WITHDRAW" | null;
  bankOpen: boolean;
  setTheme: (t: ThemeMode) => void;
  toggleTheme: () => void;
  toggleCurrency: () => void;
  setStockFilter: (f: UiState["stockFilter"]) => void;
  openTx: (p?: TxPrefill) => void;
  closeTx: () => void;
  openCapital: (k: "DEPOSIT" | "WITHDRAW") => void;
  closeCapital: () => void;
  openBank: () => void;
  closeBank: () => void;
};

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      theme: "light",
      currency: "VND",
      stockFilter: "ALL",
      txOpen: null,
      capitalOpen: null,
      bankOpen: false,
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set({ theme: get().theme === "light" ? "dark" : "light" }),
      toggleCurrency: () => set({ currency: get().currency === "VND" ? "USD" : "VND" }),
      setStockFilter: (stockFilter) => set({ stockFilter }),
      openTx: (p) => set({ txOpen: p ?? {} }),
      closeTx: () => set({ txOpen: null }),
      openCapital: (capitalOpen) => set({ capitalOpen }),
      closeCapital: () => set({ capitalOpen: null }),
      openBank: () => set({ bankOpen: true }),
      closeBank: () => set({ bankOpen: false }),
    }),
    {
      name: "pm-ui",
      partialize: (s) => ({ theme: s.theme, currency: s.currency, stockFilter: s.stockFilter }),
    },
  ),
);

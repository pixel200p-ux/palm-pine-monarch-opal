import { createFileRoute } from "@tanstack/react-router";
import { AssetPage } from "@/components/pages/AssetPage";

export const Route = createFileRoute("/_app/etf")({
  component: () => <AssetPage assetType="ETF" />,
});

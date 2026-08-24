import { createFileRoute } from "@tanstack/react-router";
import { AssetPage } from "@/components/pages/AssetPage";

export const Route = createFileRoute("/_app/stock")({
  component: () => <AssetPage assetType="STOCK" />,
});

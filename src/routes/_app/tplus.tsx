import { createFileRoute } from "@tanstack/react-router";
import { TplusPage } from "@/components/pages/TplusPage";

export const Route = createFileRoute("/_app/tplus")({
  component: TplusPage,
});

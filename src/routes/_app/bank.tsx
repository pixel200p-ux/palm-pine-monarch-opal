import { createFileRoute } from "@tanstack/react-router";
import { BankPage } from "@/components/pages/BankPage";

export const Route = createFileRoute("/_app/bank")({
  component: BankPage,
});

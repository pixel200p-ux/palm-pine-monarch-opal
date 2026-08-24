import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function Badge({
  className,
  tone = "muted",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: "muted" | "profit" | "loss" | "warn" | "navy" }) {
  const tones = {
    muted: "bg-muted text-muted-foreground",
    profit: "bg-profit/15 text-profit",
    loss: "bg-loss/15 text-loss",
    warn: "bg-warn/15 text-warn",
    navy: "bg-primary/10 text-primary",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}

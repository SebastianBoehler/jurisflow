import { PropsWithChildren } from "react";

import { cn } from "@/lib/utils";

type BadgeProps = PropsWithChildren<{
  className?: string;
  variant?: "default" | "secondary" | "outline" | "success";
}>;

const VARIANT_STYLES = {
  default: "border border-charcoal/10 bg-charcoal/5 text-ink/72",
  secondary: "border border-charcoal/8 bg-paper text-ink/68",
  outline: "border border-charcoal/12 bg-white/70 text-ink/72",
  success: "border border-moss/15 bg-moss text-white"
};

export function Badge({ children, className, variant = "default" }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]",
        VARIANT_STYLES[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border border-border bg-background text-foreground/70",
        secondary: "border border-border/50 bg-secondary text-secondary-foreground",
        outline: "border border-border bg-white/70 text-foreground/70",
        success: "border border-moss/20 bg-moss text-white",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        ember: "bg-ember text-white border-transparent",
        dark: "bg-charcoal text-paper border-transparent"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };

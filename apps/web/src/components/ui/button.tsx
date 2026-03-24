import { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "outline";
  size?: "sm" | "md" | "icon";
};

const VARIANT_STYLES = {
  primary: "border border-charcoal bg-charcoal text-paper shadow-[0_14px_32px_rgba(21,23,27,0.18)] hover:bg-charcoal/92",
  secondary: "border border-ember bg-ember text-paper shadow-[0_14px_32px_rgba(185,101,59,0.18)] hover:bg-ember/92",
  ghost: "border border-transparent bg-transparent text-ink hover:bg-charcoal/5",
  outline: "border border-charcoal/12 bg-paper/70 text-ink hover:bg-paper"
};

const SIZE_STYLES = {
  sm: "h-10 px-4 py-2 text-sm",
  md: "h-12 px-5 py-2.5 text-sm",
  icon: "h-10 w-10 p-0"
};

export function Button({ className, size = "md", variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-full font-medium tracking-[0.01em] transition duration-200 disabled:cursor-not-allowed disabled:opacity-60",
        VARIANT_STYLES[variant],
        SIZE_STYLES[size],
        className
      )}
      {...props}
    />
  );
}

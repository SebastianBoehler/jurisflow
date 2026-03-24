import { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type ShimmerButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function ShimmerButton({ className, children, ...props }: ShimmerButtonProps) {
  return (
    <button
      className={cn(
        "relative inline-flex h-12 items-center justify-center overflow-hidden rounded-full border border-white/14 bg-ember px-5 text-sm font-medium tracking-[0.01em] text-white shadow-[0_18px_40px_rgba(185,101,59,0.28)] transition hover:bg-[#d87c4f] disabled:cursor-not-allowed disabled:opacity-60",
        "before:absolute before:inset-y-0 before:left-[-30%] before:w-1/2 before:skew-x-[-24deg] before:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.32),transparent)] before:content-[''] before:[animation:shimmer_2.4s_linear_infinite]",
        className
      )}
      {...props}
    >
      <span className="relative z-10">{children}</span>
    </button>
  );
}

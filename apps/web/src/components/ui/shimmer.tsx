import { CSSProperties, PropsWithChildren } from "react";

import { cn } from "@/lib/utils";

type ShimmerProps = PropsWithChildren<{
  className?: string;
  duration?: number;
}>;

export function Shimmer({ children, className, duration = 1.5 }: ShimmerProps) {
  return (
    <span
      className={cn(
        "inline-block bg-[length:200%_100%] bg-clip-text text-transparent [background-image:linear-gradient(90deg,rgba(21,23,27,0.28),rgba(201,115,69,0.95),rgba(21,23,27,0.28))]",
        className
      )}
      style={{ animation: `shimmer ${duration}s linear infinite` } as CSSProperties}
    >
      {children}
    </span>
  );
}

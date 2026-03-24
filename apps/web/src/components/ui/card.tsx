import { PropsWithChildren } from "react";

import { cn } from "@/lib/utils";

export function Card({ children, className }: PropsWithChildren<{ className?: string }>) {
  return <div className={cn("surface-panel rounded-[30px] p-6", className)}>{children}</div>;
}

"use client";

import { ButtonHTMLAttributes } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Actions({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center gap-1", className)} {...props} />;
}

type ActionProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
};

export function Action({ className, children, label, ...props }: ActionProps) {
  return (
    <Button
      aria-label={label}
      className={cn("text-ink/60 hover:text-ink", className)}
      size="icon"
      title={label}
      variant="ghost"
      {...props}
    >
      {children}
    </Button>
  );
}

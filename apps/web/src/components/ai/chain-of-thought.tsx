"use client";

import { ChevronDownIcon, CircleDashedIcon, CircleIcon, SearchIcon, SparklesIcon } from "lucide-react";
import { createContext, PropsWithChildren, useContext, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type ChainContextValue = {
  isOpen: boolean;
  setIsOpen: (next: boolean) => void;
};

const ChainContext = createContext<ChainContextValue | null>(null);

function useChain() {
  const context = useContext(ChainContext);
  if (!context) {
    throw new Error("Chain of thought components must be nested.");
  }
  return context;
}

export function ChainOfThought({
  children,
  className,
  defaultOpen = true
}: PropsWithChildren<{ className?: string; defaultOpen?: boolean }>) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const value = useMemo(() => ({ isOpen, setIsOpen }), [isOpen]);

  return (
    <ChainContext.Provider value={value}>
      <div className={cn("space-y-3", className)}>{children}</div>
    </ChainContext.Provider>
  );
}

export function ChainOfThoughtHeader({ children, className }: PropsWithChildren<{ className?: string }>) {
  const { isOpen, setIsOpen } = useChain();

  return (
    <button
      className={cn("flex w-full items-center gap-2 text-sm text-ink/58 hover:text-ink", className)}
      onClick={() => setIsOpen(!isOpen)}
      type="button"
    >
      <SparklesIcon className="h-4 w-4 text-ember" />
      <span className="flex-1 text-left">{children}</span>
      <ChevronDownIcon className={cn("h-4 w-4 transition", isOpen && "rotate-180")} />
    </button>
  );
}

export function ChainOfThoughtContent({ children, className }: PropsWithChildren<{ className?: string }>) {
  const { isOpen } = useChain();
  if (!isOpen) {
    return null;
  }
  return <div className={cn("space-y-3", className)}>{children}</div>;
}

export function ChainOfThoughtStep({
  children,
  className,
  description,
  label,
  status = "complete"
}: PropsWithChildren<{ className?: string; description?: string | null; label: string; status?: string }>) {
  const Icon = status === "failed" ? CircleDashedIcon : status === "pending" ? CircleDashedIcon : CircleIcon;

  return (
    <div className={cn("flex gap-3 rounded-[22px] border border-charcoal/10 bg-white/74 p-3 text-sm", className)}>
      <div className="mt-0.5">
        <Icon className={cn("h-4 w-4", status === "complete" ? "text-moss" : status === "failed" ? "text-red-700" : "text-ember")} />
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="font-medium text-ink">{label}</div>
        {description ? <p className="text-sm text-ink/68">{description}</p> : null}
        {children}
      </div>
    </div>
  );
}

export function ChainOfThoughtSearchResults({ children, className }: PropsWithChildren<{ className?: string }>) {
  return <div className={cn("flex flex-wrap gap-2", className)}>{children}</div>;
}

export function ChainOfThoughtSearchResult({ children }: PropsWithChildren) {
  return (
    <Badge className="gap-1" variant="outline">
      <SearchIcon className="h-3 w-3" />
      {children}
    </Badge>
  );
}

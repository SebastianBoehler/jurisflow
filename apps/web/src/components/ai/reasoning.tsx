"use client";

import { BrainIcon, ChevronDownIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { Shimmer } from "@/components/ui/shimmer";
import { cn } from "@/lib/utils";

type ReasoningProps = {
  children: string;
  className?: string;
  duration?: number;
  isStreaming?: boolean;
};

export function Reasoning({ children, className, duration, isStreaming = false }: ReasoningProps) {
  const [isOpen, setIsOpen] = useState(isStreaming);
  const [liveDuration, setLiveDuration] = useState(duration ?? 0);

  useEffect(() => {
    if (!isStreaming) {
      return;
    }
    setIsOpen(true);
    const startedAt = Date.now();
    const intervalId = window.setInterval(() => {
      setLiveDuration(Math.max(1, Math.round((Date.now() - startedAt) / 1000)));
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [isStreaming]);

  return (
    <div className={cn("rounded-[22px] border border-charcoal/10 bg-charcoal/4 p-3", className)}>
      <button className="flex w-full items-center gap-2 text-sm text-ink/58" onClick={() => setIsOpen((current) => !current)} type="button">
        <BrainIcon className="h-4 w-4 text-ember" />
        <span className="flex-1 text-left">
          {isStreaming ? <Shimmer>Denke nach...</Shimmer> : `Begruendung in ${Math.max(duration ?? liveDuration, 1)}s`}
        </span>
        <ChevronDownIcon className={cn("h-4 w-4 transition", isOpen && "rotate-180")} />
      </button>
      {isOpen ? <p className="mt-3 whitespace-pre-wrap text-sm text-ink/72">{children}</p> : null}
    </div>
  );
}

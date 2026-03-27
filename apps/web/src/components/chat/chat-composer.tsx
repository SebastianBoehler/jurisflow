"use client";

import { FormEvent, useState } from "react";
import { ArrowUp, Loader2, Microscope } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type ChatComposerProps = {
  disabled?: boolean;
  onSubmit: (value: string, deepResearch: boolean) => Promise<void> | void;
};

export function ChatComposer({ disabled = false, onSubmit }: ChatComposerProps) {
  const [value, setValue] = useState("");
  const [deepResearch, setDeepResearch] = useState(false);

  async function handleSubmit(event?: FormEvent) {
    event?.preventDefault();
    const nextValue = value.trim();
    if (!nextValue || disabled) return;
    setValue("");
    await onSubmit(nextValue, deepResearch);
  }

  return (
    <form
      className="rounded-[28px] border border-border bg-background shadow-[0_20px_60px_rgba(15,23,42,0.06)]"
      onSubmit={(event) => void handleSubmit(event)}
    >
      <div className="px-5 pb-3 pt-4">
        <Textarea
          className="min-h-[80px] border-0 bg-transparent px-0 py-0 text-base leading-7 shadow-none focus-visible:ring-0"
          disabled={disabled}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void handleSubmit();
            }
          }}
          placeholder="Stelle eine juristische Frage oder beschreibe deinen Fall…"
          value={value}
        />
      </div>
      <div className="flex items-center justify-between border-t border-border px-4 py-3">
        <button
          className={cn(
            "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition",
            deepResearch
              ? "border-foreground bg-foreground text-background"
              : "border-border text-muted-foreground hover:border-foreground/20 hover:text-foreground"
          )}
          onClick={() => setDeepResearch((v) => !v)}
          type="button"
        >
          <Microscope className="h-3.5 w-3.5" />
          Deep Research
        </button>
        <Button className="h-9 rounded-full px-4" disabled={disabled || !value.trim()} size="sm" type="submit">
          {disabled ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
          Senden
        </Button>
      </div>
    </form>
  );
}

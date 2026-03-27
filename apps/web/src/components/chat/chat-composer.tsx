"use client";

import { FormEvent, useState } from "react";
import { ArrowUp, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type ChatComposerProps = {
  disabled?: boolean;
  onSubmit: (value: string) => Promise<void> | void;
};

export function ChatComposer({ disabled = false, onSubmit }: ChatComposerProps) {
  const [value, setValue] = useState("");

  async function handleSubmit(event?: FormEvent) {
    event?.preventDefault();
    const nextValue = value.trim();

    if (!nextValue || disabled) {
      return;
    }

    setValue("");
    await onSubmit(nextValue);
  }

  return (
    <form
      className="rounded-[28px] border border-border bg-background shadow-[0_20px_60px_rgba(15,23,42,0.06)]"
      onSubmit={(event) => void handleSubmit(event)}
    >
      <div className="px-5 pb-3 pt-4">
        <Textarea
          className="min-h-[104px] border-0 bg-transparent px-0 py-0 text-base leading-7 shadow-none focus-visible:ring-0"
          disabled={disabled}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Stelle eine juristische Frage oder beschreibe deinen Fall…"
          value={value}
        />
      </div>
      <div className="flex items-center justify-between border-t border-border px-4 py-3">
        <p className="text-sm text-muted-foreground">
          Automatische Deep Research über Bundesrecht, Landesrecht, Rechtsprechung und Web-Recherche.
        </p>
        <Button className="h-11 rounded-full px-4" disabled={disabled || !value.trim()} size="lg" type="submit">
          {disabled ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
          Senden
        </Button>
      </div>
    </form>
  );
}

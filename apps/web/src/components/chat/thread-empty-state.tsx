"use client";

import { useThreadRuntime } from "@assistant-ui/react";
import { STARTER_PROMPTS } from "@/components/chat/starter-prompts";

export function ThreadEmptyState() {
  const thread = useThreadRuntime();

  function handlePrompt(prompt: string) {
    void thread.append({ role: "user", content: [{ type: "text", text: prompt }] });
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center pb-40 pt-12 text-center">
      <div className="max-w-2xl">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-muted-foreground">
          Ein Fenster. Eine Frage.
        </p>
        <h2 className="mt-5 text-5xl font-semibold tracking-[-0.06em] text-foreground">
          Rechtliche Recherche ohne Dashboard.
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-muted-foreground">
          Die Unterhaltung startet mit deiner ersten Frage und verschwindet beim Neuladen.
        </p>
      </div>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        {STARTER_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            className="rounded-full border border-border bg-card px-4 py-2.5 text-sm text-foreground transition hover:border-foreground/20 hover:bg-muted"
            onClick={() => handlePrompt(prompt)}
            type="button"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useThreadRuntime } from "@assistant-ui/react";
import { STARTER_PROMPTS } from "@/components/chat/starter-prompts";
import { useThreadUi } from "@/components/chat/thread-ui";

type ThreadEmptyStateProps = {
  matterTitle?: string | null;
  mode?: "existing" | "new";
};

export function ThreadEmptyState({
  matterTitle,
  mode = "new",
}: ThreadEmptyStateProps) {
  const thread = useThreadRuntime();
  const { setError } = useThreadUi();
  const title =
    mode === "existing"
      ? matterTitle
        ? `Neue Nachricht in ${matterTitle}`
        : "Neue Nachricht in der geladenen Akte"
      : "Starte im Chat, nicht im Dashboard";
  const description =
    mode === "existing"
      ? "Der Matter-Kontext ist bereits geladen. Stelle die nächste Frage, lade Unterlagen hoch oder aktiviere Deep Research."
      : "Schreibe die erste juristische Frage, lade ein Dokument hoch oder nutze einen Starter-Prompt. Die Akte wird automatisch angelegt.";

  async function handlePrompt(prompt: string) {
    setError(null);
    try {
      await thread.append({ role: "user", content: [{ type: "text", text: prompt }] });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Die Nachricht konnte nicht gesendet werden.");
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 pb-32 pt-12 text-center">
      <div className="max-w-3xl">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-muted-foreground">
          Jurisflow Assistant
        </p>
        <h2 className="mt-5 text-4xl font-semibold tracking-[-0.06em] text-foreground sm:text-5xl">
          {title}
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
          {description}
        </p>
      </div>

      <div className="mt-10 grid w-full max-w-5xl gap-3 md:grid-cols-3">
        {STARTER_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            className="rounded-[1.35rem] border border-border/70 bg-background px-4 py-4 text-left text-sm leading-6 text-foreground transition hover:border-foreground/20 hover:bg-muted"
            onClick={() => void handlePrompt(prompt)}
            type="button"
          >
            {prompt}
          </button>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
        {["PDF / DOCX / TXT / EML", "Deep Research", "Quellen inline", "Matter-Kontext rechts"].map((item) => (
          <span key={item} className="rounded-full border border-border bg-background px-3 py-1.5">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

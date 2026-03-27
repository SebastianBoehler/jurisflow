"use client";

import { Loader2 } from "lucide-react";

import { ChatMarkdown } from "@/components/chat/chat-markdown";
import { ChatMessage as ChatMessageType } from "@/components/chat/chat-types";
import { Citation } from "@/components/tool-ui/citation";
import { cn } from "@/lib/utils";

type ChatMessageProps = {
  message: ChatMessageType;
};

export function ChatMessage({ message }: ChatMessageProps) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-3xl rounded-[26px] rounded-br-md bg-foreground px-5 py-4 text-[15px] leading-7 text-background">
          {message.content}
        </div>
      </div>
    );
  }

  const isRunning = message.status === "queued" || message.status === "processing";

  return (
    <div className="flex justify-start">
      <div className="max-w-4xl space-y-4 rounded-[28px] rounded-bl-md border border-border bg-card px-5 py-5 shadow-sm">
        {isRunning ? (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Recherche läuft…</span>
          </div>
        ) : null}

        {message.trace.length ? (
          <div className="flex flex-wrap gap-2">
            {message.trace.map((step) => (
              <span
                key={step.key}
                className={cn(
                  "inline-flex items-center rounded-full border px-3 py-1 text-xs",
                  step.status === "failed" && "border-destructive/20 bg-destructive/5 text-destructive",
                  step.status === "skipped" && "border-border bg-muted text-muted-foreground",
                  (step.status === "complete" || step.status === "ready") && "border-border bg-muted text-foreground",
                  (step.status === "queued" || step.status === "processing") && "border-border bg-background text-muted-foreground"
                )}
                title={step.detail ?? undefined}
              >
                {step.label}
              </span>
            ))}
          </div>
        ) : null}

        {message.error ? (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm leading-7 text-destructive">
            {message.error}
          </div>
        ) : null}

        {message.content ? (
          <ChatMarkdown content={message.content} />
        ) : message.summary ? (
          <p className="text-[15px] leading-7 text-foreground">{message.summary}</p>
        ) : !isRunning ? (
          <p className="text-[15px] leading-7 text-muted-foreground">
            Kein Bericht verfügbar. Die Pipeline hat keine belastbare Antwort erzeugt.
          </p>
        ) : null}

        {message.results.length ? (
          <div className="space-y-3 border-t border-border pt-4">
            <p className="text-sm font-medium text-foreground">Quellen</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {message.results.map((result) => (
                <Citation
                  key={result.id}
                  domain={getDomain(result.url)}
                  href={result.url ?? "#"}
                  id={result.id}
                  snippet={result.excerpt}
                  title={result.title}
                  type="document"
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function getDomain(url: string | null) {
  if (!url) {
    return undefined;
  }

  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

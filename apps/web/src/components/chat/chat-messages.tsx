"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Globe, Loader2, Scale } from "lucide-react";
import {
  MessagePrimitive,
  useMessage,
  type SourceMessagePart,
} from "@assistant-ui/react";
import { ChatMarkdown } from "@/components/chat/chat-markdown";
import { getToolResultText } from "@/components/chat/tool-result";

function ToolCallBlock({
  toolName,
  args,
  result,
  messageIsRunning,
}: {
  toolName: string;
  args: Record<string, unknown>;
  result?: unknown;
  messageIsRunning: boolean;
}) {
  const [open, setOpen] = useState(false);
  const label = (args.query as string) || (args.agent as string) || toolName;
  const isResolved = typeof result !== "undefined";
  const isRunning = messageIsRunning && !isResolved;
  const resultText = getToolResultText(result);
  const hasExpandableResult = resultText.trim().length > 0;

  return (
    <div className="rounded-[1.1rem] border border-border/70 bg-muted/35 px-3 py-2.5 text-sm">
      <button
        className="flex w-full items-center gap-2 text-left"
        onClick={() => hasExpandableResult && setOpen((value) => !value)}
        type="button"
      >
        {isRunning ? (
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
        ) : (
          <Globe className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}
        <span className="flex-1 truncate text-foreground">{label}</span>
        {isRunning && <span className="text-xs text-muted-foreground">läuft…</span>}
        {hasExpandableResult && !isRunning && (
          open ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          )
        )}
      </button>
      {open && hasExpandableResult && (
        <div className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-lg border border-border bg-background p-3 text-xs leading-6 text-muted-foreground">
          {resultText}
        </div>
      )}
    </div>
  );
}

function SourcesList({ sources }: { sources: readonly SourceMessagePart[] }) {
  return (
    <div className="rounded-[1.15rem] border border-border/70 bg-muted/25 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        Quellen
      </p>
      <div className="mt-3 space-y-3">
        {sources.map((source) => (
          <a
            key={source.id}
            className="block rounded-lg border border-border bg-background px-3 py-2 transition hover:border-foreground/20"
            href={source.url}
            rel="noreferrer"
            target="_blank"
          >
            <span className="block text-sm font-medium text-foreground">
              {source.title || source.url}
            </span>
            <span className="mt-1 block break-all text-xs text-muted-foreground">
              {source.url}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}

export function UserMessage() {
  return (
    <MessagePrimitive.Root className="flex justify-end">
      <div className="max-w-[82%] rounded-[1.5rem] rounded-br-md bg-foreground px-5 py-4 text-[15px] leading-7 text-background shadow-[0_18px_45px_rgba(15,23,42,0.14)]">
        <MessagePrimitive.Content />
      </div>
    </MessagePrimitive.Root>
  );
}

function AssistantMessageContent() {
  const msg = useMessage();
  const messageIsRunning = msg.status?.type === "running";
  const sources = msg.content.filter(
    (part): part is SourceMessagePart => part.type === "source",
  );

  return (
    <div className="space-y-3">
      {messageIsRunning && msg.content.length === 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Wird verarbeitet…</span>
        </div>
      )}
      {msg.content.map((part, index) => {
        if (part.type === "text") {
          return (
            <div key={index} className="prose prose-sm max-w-none dark:prose-invert">
              <ChatMarkdown content={part.text} />
            </div>
          );
        }

        if (part.type === "tool-call") {
          return (
            <ToolCallBlock
              key={part.toolCallId}
              toolName={part.toolName}
              args={part.args as Record<string, unknown>}
              result={part.result}
              messageIsRunning={messageIsRunning}
            />
          );
        }

        return null;
      })}
      {sources.length > 0 && <SourcesList sources={sources} />}
    </div>
  );
}

export function AssistantMessage() {
  return (
    <MessagePrimitive.Root className="flex justify-start gap-3">
      <div className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-[1rem] border border-border/70 bg-background text-foreground shadow-sm">
        <Scale className="size-4" />
      </div>
      <div className="max-w-4xl flex-1 space-y-3 rounded-[1.65rem] rounded-bl-md border border-border/70 bg-card px-5 py-5 shadow-[0_12px_35px_rgba(15,23,42,0.06)]">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Jurisflow</p>
        <AssistantMessageContent />
      </div>
    </MessagePrimitive.Root>
  );
}

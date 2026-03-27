"use client";

import { DataMessagePartProps, MessagePrimitive, useMessage } from "@assistant-ui/react";
import { MarkdownTextPrimitive } from "@assistant-ui/react-markdown";
import { ChevronDown, RotateCcw, Sparkles, User, Zap } from "lucide-react";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";

import {
  getResearchRequestMeta,
  getResearchResponseMeta,
  extractMessageText,
  type ResearchResponseMeta,
} from "@/components/research/research-thread-data";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { formatRelativeRunTime, formatResearchSource, formatStatusLabel } from "@/lib/formatting";
import type { ResearchRequest, ResearchResult, ResearchTraceStep } from "@/lib/types";
import { cn } from "@/lib/utils";

type ResearchUserMessageProps = {
  onSelectRun: (runId: string) => void;
  selectedRunId: string | null;
};

type ResearchAssistantMessageProps = ResearchUserMessageProps & {
  onReplay: (payload: ResearchRequest) => void;
};

export function ResearchUserMessage({ onSelectRun, selectedRunId }: ResearchUserMessageProps) {
  const message = useMessage();
  const meta = getResearchRequestMeta(message);
  const isSelected = meta?.runId === selectedRunId;
  const query =
    message.role === "user"
      ? extractMessageText(message.content)
      : "";

  if (!meta) {
    return null;
  }

  return (
    <div className="flex justify-end gap-3">
      <button className="max-w-3xl text-left" onClick={() => onSelectRun(meta.runId)} type="button">
        <div
          className={cn(
            "rounded-[24px] rounded-tr-md bg-[#17181c] px-5 py-4 text-paper shadow-sm transition-shadow",
            isSelected && "ring-1 ring-primary/40"
          )}
        >
          <p className="text-sm leading-7">{query}</p>
          {meta.focus ? <p className="mt-2 text-xs text-white/55">Fokus: {meta.focus}</p> : null}
          <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
            {meta.deepResearch ? <Badge variant="ember">Deep Research</Badge> : <Badge variant="secondary">Chat</Badge>}
            {meta.sources.map((source) => (
              <Badge key={source} variant="secondary">
                {formatResearchSource(source)}
              </Badge>
            ))}
            <span className="text-xs text-white/45">{formatRelativeRunTime(meta.createdAt)}</span>
          </div>
        </div>
      </button>
      <Avatar className="size-9">
        <AvatarFallback className="bg-[#17181c] text-paper">
          <User className="size-4" />
        </AvatarFallback>
      </Avatar>
    </div>
  );
}

export function ResearchAssistantMessage({ onReplay, onSelectRun, selectedRunId }: ResearchAssistantMessageProps) {
  const message = useMessage();
  const meta = getResearchResponseMeta(message);
  const isSelected = meta?.runId === selectedRunId;
  const hasTextPart =
    message.role === "assistant" &&
    message.content.some((part: (typeof message.content)[number]) => part.type === "text");

  if (!meta) {
    return null;
  }

  return (
    <div className="flex gap-3">
      <Avatar className="size-9">
        <AvatarFallback className="bg-primary text-primary-foreground">
          <Zap className="size-4" />
        </AvatarFallback>
      </Avatar>
      <div
        className="min-w-0 flex-1 cursor-pointer text-left"
        onClick={() => onSelectRun(meta.runId)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelectRun(meta.runId);
          }
        }}
        role="button"
        tabIndex={0}
      >
        <div
          className={cn(
            "min-w-0 rounded-[28px] border border-border/80 bg-card px-5 py-5 shadow-sm transition-shadow",
            isSelected && "border-primary/40 shadow-[0_10px_30px_rgba(201,115,69,0.12)]"
          )}
        >
          <ResearchAssistantHeader meta={meta} onReplay={onReplay} />
          <MessagePrimitive.Unstable_PartsGrouped
            components={{
              Empty: () => null,
              Text: () => (
                <MarkdownTextPrimitive
                  className="report-markdown text-sm"
                  rehypePlugins={[rehypeHighlight]}
                  remarkPlugins={[remarkGfm]}
                  smooth={false}
                />
              ),
              data: {
                by_name: {
                  "research-empty": ResearchEmptyPart,
                  "research-sources": ResearchSourcesPart,
                  "research-trace": ResearchTracePart,
                },
              },
            }}
            groupingFunction={(parts) => parts.map((_, index) => ({ groupKey: undefined, indices: [index] }))}
          />
          {!hasTextPart && meta.summary ? <ResearchSnapshot text={meta.summary} /> : null}
          {!meta.hasReport && !meta.summary && meta.status === "ready" ? (
            <div className="mt-4 rounded-2xl border border-border bg-muted/35 px-4 py-4 text-sm text-muted-foreground">
              Kein Report verfuegbar. Die Pipeline hat keinen finalen Bericht geschrieben.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ResearchAssistantHeader({
  meta,
  onReplay,
}: {
  meta: ResearchResponseMeta;
  onReplay: (payload: ResearchRequest) => void;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={meta.status === "ready" ? "success" : meta.status === "failed" ? "dark" : "secondary"}>
          {formatStatusLabel(meta.status)}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {meta.resultCount} {meta.resultCount === 1 ? "Quelle" : "Quellen"}
        </span>
        <span className="text-xs text-muted-foreground">{formatRelativeRunTime(meta.createdAt)}</span>
      </div>
      <Button
        onClick={(event) => {
          event.stopPropagation();
          onReplay(meta.replayRequest);
        }}
        size="sm"
        type="button"
        variant="outline"
      >
        <RotateCcw data-icon="inline-start" />
        Erneut ausfuehren
      </Button>
    </div>
  );
}

function ResearchTracePart({ data }: DataMessagePartProps<{ steps: ResearchTraceStep[] }>) {
  if (!data.steps.length) {
    return null;
  }

  return (
    <Collapsible className="mb-4 rounded-[22px] border border-border bg-muted/30">
      <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 text-left">
        <span className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
          <Sparkles className="size-4 text-primary" />
          Pipeline
        </span>
        <ChevronDown className="size-4 text-muted-foreground" />
      </CollapsibleTrigger>
      <CollapsibleContent className="border-t border-border/70 px-4 py-4">
        <div className="flex flex-col gap-3">
          {data.steps.map((step: ResearchTraceStep) => (
            <div key={step.key} className="rounded-2xl border border-border bg-background px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground">{step.label}</p>
                <Badge variant={step.status === "complete" ? "success" : step.status === "failed" ? "dark" : "secondary"}>
                  {formatStatusLabel(step.status)}
                </Badge>
              </div>
              {step.detail ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.detail}</p> : null}
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>{step.agent}</span>
                {step.source ? <span>{formatResearchSource(step.source)}</span> : null}
              </div>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function ResearchSourcesPart({ data }: DataMessagePartProps<{ results: ResearchResult[] }>) {
  if (!data.results.length) {
    return null;
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      <p className="text-xs uppercase tracking-[0.18em] text-foreground/35">Quellen</p>
      <div className="flex flex-col gap-3">
        {data.results.slice(0, 8).map((result: ResearchResult, index: number) => (
          <a
            className="rounded-[22px] border border-border bg-background px-4 py-3 transition-colors hover:border-primary/30"
            href={result.url ?? undefined}
            key={result.id}
            rel="noreferrer"
            target={result.url ? "_blank" : undefined}
          >
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>S{index + 1}</span>
              <span>{formatResearchSource(result.source)}</span>
            </div>
            <p className="mt-2 text-sm font-medium text-foreground">{result.citation ?? result.title}</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{result.excerpt}</p>
          </a>
        ))}
      </div>
    </div>
  );
}

function ResearchEmptyPart({ data }: DataMessagePartProps<{ message: string }>) {
  return (
    <div className="rounded-2xl border border-border bg-muted/35 px-4 py-4 text-sm text-muted-foreground">
      {data.message}
    </div>
  );
}

function ResearchSnapshot({ text }: { text: string }) {
  return (
    <div className="mt-4 rounded-2xl bg-muted/35 px-4 py-3 text-sm text-foreground/70">
      <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-foreground/35">
        <Sparkles className="size-3.5" />
        Snapshot
      </div>
      {text}
    </div>
  );
}

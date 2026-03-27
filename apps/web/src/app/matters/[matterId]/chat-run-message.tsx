"use client";

import { useState } from "react";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  RotateCcw,
  Sparkles,
  User,
  Zap
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { formatRelativeRunTime, formatResearchSource, formatStatusLabel } from "@/lib/formatting";
import { Document, ResearchResult, ResearchRun } from "@/lib/types";
import { cn } from "@/lib/utils";

type ChatRunMessageProps = {
  documents: Document[];
  onReplay: (run: ResearchRun) => void;
  results: ResearchResult[];
  run: ResearchRun;
};

export function ChatRunMessage({ documents, onReplay, results, run }: ChatRunMessageProps) {
  const isPending = run.status === "queued" || run.status === "processing";
  const isReady = run.status === "ready";

  const memoArtifact = run.artifacts.find((a) => a.kind === "memo");
  const reasoningArtifact = run.artifacts.find((a) => a.kind === "reasoning");
  const featuredResults = results.slice(0, 3);
  const extraResults = results.slice(3);

  const userAttachments =
    run.sources.includes("internal_docs") && documents.length
      ? documents.slice(0, 4)
      : [];

  return (
    <div className="space-y-4">
      {/* User message */}
      <div className="flex items-start gap-3 justify-end">
        <div className="max-w-[80%] space-y-1.5">
          <div className="rounded-2xl rounded-tr-sm bg-charcoal px-4 py-3 text-sm leading-7 text-paper">
            {run.query}
            {run.focus && (
              <p className="mt-1.5 text-xs text-white/50">Fokus: {run.focus}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            {run.deep_research && (
              <Badge variant="ember" className="text-[10px]">
                <Sparkles className="mr-1 h-2.5 w-2.5" />
                Deep Research
              </Badge>
            )}
            {run.sources.map((s) => (
              <Badge key={s} variant="secondary" className="text-[10px]">
                {formatResearchSource(s)}
              </Badge>
            ))}
            <span className="text-[10px] text-muted-foreground">{formatRelativeRunTime(run.created_at)}</span>
          </div>
          {userAttachments.length > 0 && (
            <div className="flex flex-wrap justify-end gap-1.5 mt-1">
              {userAttachments.map((doc) => (
                <span
                  key={doc.id}
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground"
                >
                  <BookOpen className="h-3 w-3" />
                  {doc.title.length > 28 ? doc.title.slice(0, 28) + "…" : doc.title}
                </span>
              ))}
            </div>
          )}
        </div>
        <Avatar className="mt-0.5 size-7 shrink-0">
          <AvatarFallback className="bg-charcoal text-paper text-xs">
            <User className="size-3.5" />
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Inline tool calls (trace steps) — shown while processing */}
      {(isPending || run.trace.length > 0) && (
        <div className="ml-10 space-y-1">
          <TraceSteps run={run} />
        </div>
      )}

      {/* AI response */}
      <div className="flex items-start gap-3">
        <Avatar className="mt-0.5 size-7 shrink-0">
          <AvatarFallback className="bg-ember text-white text-xs">
            <Zap className="size-3.5" />
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1 space-y-3">
          {/* Main answer */}
          <div className="rounded-2xl rounded-tl-sm border border-border bg-card px-5 py-4">
            {isPending ? (
              <div className="space-y-2.5">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : (
              <>
                <h3 className="mb-3 font-serif text-xl leading-snug tracking-[-0.02em] text-foreground">
                  {formatRunHeading(memoArtifact?.title)}
                </h3>
                <p className="text-sm leading-7 text-foreground/75">
                  {run.summary
                    ? truncate(run.summary.replace(/\s+/g, " ").trim(), 600)
                    : "Noch keine Zusammenfassung vorhanden."}
                </p>
              </>
            )}
          </div>

          {/* Featured citations — inline like ChatGPT sources */}
          {featuredResults.length > 0 && (
            <div className="grid gap-2 sm:grid-cols-3">
              {featuredResults.map((result, i) => (
                <CitationCard key={result.id} result={result} index={i + 1} />
              ))}
            </div>
          )}

          {/* Artifacts */}
          {run.artifacts.filter((a) => a.kind !== "reasoning").map((artifact) => (
            <ArtifactCard key={artifact.key} artifact={artifact} />
          ))}

          {/* Expandable: reasoning + trace + extra results */}
          {isReady && (
            <DetailsSection
              run={run}
              reasoningArtifact={reasoningArtifact}
              extraResults={extraResults}
              onReplay={onReplay}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ---- Trace steps (tool calls inline) ---- */
function TraceSteps({ run }: { run: ResearchRun }) {
  const isPending = run.status === "queued" || run.status === "processing";
  const steps = run.trace;

  if (!steps.length && !isPending) return null;

  return (
    <div className="rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-xs">
      <div className="mb-2 flex items-center gap-1.5 text-muted-foreground">
        <Zap className="h-3 w-3 text-ember" />
        <span className="font-medium uppercase tracking-wider">
          {isPending ? "Recherche laeuft..." : `${steps.length} Rechercheschritte`}
        </span>
        {isPending && (
          <span className="ml-1 inline-flex gap-0.5">
            <span className="animate-bounce delay-0 h-1 w-1 rounded-full bg-ember" />
            <span className="animate-bounce delay-75 h-1 w-1 rounded-full bg-ember" />
            <span className="animate-bounce delay-150 h-1 w-1 rounded-full bg-ember" />
          </span>
        )}
      </div>
      <div className="space-y-1">
        {steps.map((step) => (
          <div key={step.key} className="flex items-center gap-2 text-muted-foreground">
            <StepStatusDot status={step.status} />
            <span className="font-medium text-foreground/70">{step.label}</span>
            {step.agent && step.agent !== "—" && (
              <span className="text-muted-foreground/60">· {step.agent}</span>
            )}
            {step.detail && (
              <span className="ml-auto truncate max-w-[40%] text-muted-foreground/60">{step.detail}</span>
            )}
          </div>
        ))}
        {isPending && steps.length === 0 && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <StepStatusDot status="processing" />
            <span>Agenten werden initialisiert...</span>
          </div>
        )}
      </div>
    </div>
  );
}

function StepStatusDot({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-block h-1.5 w-1.5 rounded-full shrink-0",
        status === "done" && "bg-moss",
        status === "processing" && "bg-ember animate-pulse",
        status === "pending" && "bg-border"
      )}
    />
  );
}

/* ---- Citation card ---- */
function CitationCard({ result, index }: { result: ResearchResult; index: number }) {
  return (
    <div className="rounded-xl border border-border bg-background px-3 py-3 text-xs">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <Badge variant="secondary" className="text-[9px]">
          {formatResearchSource(result.source)}
        </Badge>
        <span className="shrink-0 text-muted-foreground/50">{index}</span>
      </div>
      <p className="font-medium leading-snug text-foreground line-clamp-2">{result.title}</p>
      {result.citation && (
        <p className="mt-1 text-muted-foreground/70 line-clamp-1">{result.citation}</p>
      )}
      <p className="mt-1.5 text-muted-foreground line-clamp-3 leading-5">{result.excerpt}</p>
      {result.url && (
        <a
          href={result.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-0.5 text-[10px] text-ember hover:underline"
        >
          Quelle <ExternalLink className="h-2.5 w-2.5" />
        </a>
      )}
    </div>
  );
}

/* ---- Artifact card ---- */
function ArtifactCard({ artifact }: { artifact: ResearchRun["artifacts"][number] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-border bg-background overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{artifact.kind}</p>
          <p className="mt-0.5 text-sm font-medium text-foreground truncate">{artifact.title}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => void navigator.clipboard.writeText(artifact.content)}
            title="Kopieren"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => {
              const blob = new Blob([artifact.content], { type: "text/markdown;charset=utf-8" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `${artifact.key}.md`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            title="Herunterladen"
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setOpen((v) => !v)}
          >
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
          </Button>
        </div>
      </div>
      {open && (
        <>
          <Separator />
          <div className="max-h-96 overflow-y-auto px-4 py-3">
            <pre className="whitespace-pre-wrap text-xs leading-6 text-foreground/70">{artifact.content}</pre>
          </div>
        </>
      )}
    </div>
  );
}

/* ---- Details section ---- */
function DetailsSection({
  run,
  reasoningArtifact,
  extraResults,
  onReplay
}: {
  run: ResearchRun;
  reasoningArtifact?: ResearchRun["artifacts"][number];
  extraResults: ResearchResult[];
  onReplay: (run: ResearchRun) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="flex items-center gap-2">
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-muted-foreground">
            <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-90")} />
            {open ? "Protokoll ausblenden" : "Protokoll & Quellen anzeigen"}
          </Button>
        </CollapsibleTrigger>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 text-xs text-muted-foreground ml-auto"
          onClick={() => onReplay(run)}
        >
          <RotateCcw className="h-3 w-3" />
          Wiederholen
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 text-xs text-muted-foreground"
          onClick={() => {
            if (run.summary) void navigator.clipboard.writeText(run.summary);
          }}
        >
          <Copy className="h-3 w-3" />
          Kopieren
        </Button>
      </div>

      <CollapsibleContent className="space-y-3 pt-2">
        {/* Reasoning */}
        {reasoningArtifact?.content && (
          <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reasoning</p>
            <p className="text-xs leading-6 text-muted-foreground">{truncate(reasoningArtifact.content, 800)}</p>
          </div>
        )}

        {/* Full trace */}
        {run.trace.length > 0 && (
          <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recherchepfad</p>
            <div className="space-y-2">
              {run.trace.map((step) => (
                <div key={step.key} className="text-xs">
                  <div className="flex items-center gap-2">
                    <StepStatusDot status={step.status} />
                    <span className="font-medium text-foreground/80">{step.label}</span>
                    <span className="text-muted-foreground/60">· {step.agent}</span>
                  </div>
                  {step.detail && (
                    <p className="ml-3.5 mt-0.5 text-muted-foreground/70">{step.detail}</p>
                  )}
                  {step.metadata.queries && Array.isArray(step.metadata.queries) && (
                    <div className="ml-3.5 mt-1 flex flex-wrap gap-1">
                      {(step.metadata.queries as string[]).map((q) => (
                        <span key={q} className="rounded-md border border-border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          {q}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Extra results */}
        {extraResults.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Weitere Fundstellen</p>
            {extraResults.map((result) => (
              <div key={result.id} className="rounded-xl border border-border bg-background px-3 py-2.5 text-xs">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <Badge variant="secondary" className="text-[9px]">{formatResearchSource(result.source)}</Badge>
                  <span className="font-medium text-foreground/80">{result.title}</span>
                </div>
                {result.citation && <p className="text-muted-foreground/60 mb-1">{result.citation}</p>}
                <p className="text-muted-foreground leading-5">{result.excerpt}</p>
              </div>
            ))}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 3)}...`;
}

function formatRunHeading(value?: string) {
  if (!value || value === "Research Memo") return "Juristische Einordnung";
  return value;
}

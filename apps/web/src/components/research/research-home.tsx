"use client";

import {
  AssistantRuntimeProvider,
  AuiIf,
  ThreadPrimitive,
  useExternalStoreRuntime,
  type AppendMessage,
  type ThreadUserMessagePart,
} from "@assistant-ui/react";
import { FileStack, Scale, Search, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ComponentType } from "react";

import { useResearchWorkspace } from "@/app/matters/[matterId]/use-research-workspace";
import {
  DEFAULT_RESEARCH_SOURCES,
  ResearchComposer,
  type ResearchComposerOptions,
} from "@/components/research/research-composer";
import { ResearchInspector } from "@/components/research/research-inspector";
import { ResearchAssistantMessage, ResearchUserMessage } from "@/components/research/research-message";
import {
  buildResearchThreadMessages,
  extractMessageText,
  type ResearchDraftRun,
} from "@/components/research/research-thread-data";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatRelativeRunTime, formatStatusLabel } from "@/lib/formatting";
import type { Deadline, Document, Draft, EvidenceItem, Matter, ResearchRequest, ResearchResult, ResearchRun } from "@/lib/types";

type ResearchHomeProps = {
  deadlines: Deadline[];
  documents: Document[];
  drafts: Draft[];
  evidence: EvidenceItem[];
  initialResultsByRun: Record<string, ResearchResult[]>;
  initialRuns: ResearchRun[];
  matter: Matter;
};

const DEFAULT_COMPOSER_OPTIONS: ResearchComposerOptions = {
  deepResearch: true,
  focus: "",
  maxResults: 8,
  sources: DEFAULT_RESEARCH_SOURCES,
};

export function ResearchHome({
  deadlines,
  documents,
  drafts,
  evidence,
  initialResultsByRun,
  initialRuns,
  matter,
}: ResearchHomeProps) {
  const { error, hasPendingRun, isSubmitting, resultsByRun, runs, submitResearch } = useResearchWorkspace({
    initialResultsByRun,
    initialRuns,
    matterId: matter.id,
  });
  const orderedRuns = useMemo(
    () => [...runs].sort((left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime()),
    [runs]
  );
  const latestRun = orderedRuns.at(-1) ?? null;
  const [composerOptions, setComposerOptions] = useState(DEFAULT_COMPOSER_OPTIONS);
  const [draftRun, setDraftRun] = useState<ResearchDraftRun | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(latestRun?.id ?? null);

  useEffect(() => {
    if (draftRun) {
      setSelectedRunId(draftRun.id);
      return;
    }
    setSelectedRunId(latestRun?.id ?? null);
  }, [draftRun, latestRun?.id, orderedRuns.length]);

  const selectedRun = orderedRuns.find((run) => run.id === selectedRunId) ?? latestRun;
  const selectedResults = selectedRun ? resultsByRun[selectedRun.id] ?? [] : [];
  const suggestions = useMemo(() => buildPromptSuggestions(matter.title, deadlines, documents), [deadlines, documents, matter.title]);

  const runResearch = useCallback(
    async (payload: ResearchRequest) => {
      const nextDraft: ResearchDraftRun = {
        createdAt: new Date().toISOString(),
        id: `draft-${Date.now()}`,
        request: payload,
      };
      setDraftRun(nextDraft);
      setSelectedRunId(nextDraft.id);
      const run = await submitResearch(payload);
      setDraftRun(null);
      if (run) {
        setSelectedRunId(run.id);
      }
    },
    [submitResearch]
  );

  const handleNewMessage = useCallback(
    async (message: AppendMessage) => {
      if (message.role !== "user") {
        return;
      }
      const query = extractMessageText(message.content as ThreadUserMessagePart[]);
      if (!query) {
        return;
      }
      await runResearch({
        deep_research: composerOptions.deepResearch,
        focus: composerOptions.focus.trim() || null,
        max_results: composerOptions.maxResults,
        query,
        sources: composerOptions.sources,
      });
    },
    [composerOptions, runResearch]
  );

  const messages = useMemo(
    () => buildResearchThreadMessages(orderedRuns, resultsByRun, draftRun),
    [draftRun, orderedRuns, resultsByRun]
  );
  const runtime = useExternalStoreRuntime({
    isRunning: hasPendingRun || Boolean(draftRun),
    messages,
    onNew: handleNewMessage,
  });
  const messageComponents = useMemo(
    () => ({
      AssistantMessage: () => (
        <ResearchAssistantMessage onReplay={runResearch} onSelectRun={setSelectedRunId} selectedRunId={selectedRunId} />
      ),
      UserMessage: () => <ResearchUserMessage onSelectRun={setSelectedRunId} selectedRunId={selectedRunId} />,
    }),
    [runResearch, selectedRunId]
  );

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(201,115,69,0.12),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(23,24,28,0.09),transparent_28%)] px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1600px] flex-col overflow-hidden rounded-[32px] border border-border/70 bg-background/88 shadow-[0_24px_80px_rgba(23,24,28,0.08)] backdrop-blur">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-border/70 px-6 py-5">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant="dark">MVP</Badge>
              <Badge variant="secondary">assistant-ui</Badge>
              {hasPendingRun || draftRun ? <Badge variant="ember">Pipeline aktiv</Badge> : null}
            </div>
            <h1 className="font-serif text-4xl tracking-[-0.04em] text-foreground sm:text-5xl">Jurisflow</h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
              Eine assistant-ui Konsole fuer juristische Deep Research, belastbare Quellen und finalen Bericht mit Zitaten.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <HeaderStat icon={Scale} label="Akte" value={matter.title} />
            <HeaderStat icon={Search} label="Runs" value={String(runs.length)} />
            <HeaderStat icon={FileStack} label="Dokumente" value={String(documents.length)} />
            <HeaderStat icon={ShieldCheck} label="Status" value={formatStatusLabel(matter.status)} />
          </div>
        </header>

        <div className="grid min-h-0 flex-1 gap-0 xl:grid-cols-[280px_minmax(0,1fr)_340px]">
          <aside className="hidden border-r border-border/70 bg-muted/20 xl:flex xl:flex-col">
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-foreground/35">Research History</p>
                <p className="mt-1 font-serif text-2xl text-foreground">Runs</p>
              </div>
              <Badge variant="secondary">{runs.length}</Badge>
            </div>
            <ScrollArea className="flex-1 px-4 pb-4">
              <div className="flex flex-col gap-3">
                {orderedRuns.length ? (
                  [...orderedRuns].reverse().map((run) => (
                    <button
                      className={`rounded-[24px] border p-4 text-left transition-colors ${
                        selectedRunId === run.id
                          ? "border-primary/30 bg-primary/10"
                          : "border-border bg-background hover:border-primary/20"
                      }`}
                      key={run.id}
                      onClick={() => setSelectedRunId(run.id)}
                      type="button"
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <Badge variant={run.status === "ready" ? "success" : "secondary"}>{formatStatusLabel(run.status)}</Badge>
                        <span className="text-xs text-muted-foreground">{formatRelativeRunTime(run.created_at)}</span>
                      </div>
                      <p className="line-clamp-3 text-sm leading-6 text-foreground">{run.query}</p>
                    </button>
                  ))
                ) : (
                  <p className="rounded-[24px] border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
                    Noch keine Research-Laeufe. Starte unten die erste Anfrage.
                  </p>
                )}
              </div>
            </ScrollArea>
          </aside>

          <AssistantRuntimeProvider runtime={runtime}>
            <section className="flex min-h-0 flex-col">
              <ThreadPrimitive.Root className="flex min-h-0 flex-1 flex-col">
                <ThreadPrimitive.Viewport className="flex-1 px-4 py-5 sm:px-6">
                  <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 pb-6">
                    <AuiIf condition={(state) => state.thread.messages.length === 0}>
                      <EmptyState matter={matter} drafts={drafts} evidence={evidence} />
                    </AuiIf>
                    <ThreadPrimitive.Messages components={messageComponents} />
                  </div>
                </ThreadPrimitive.Viewport>

                <div className="border-t border-border/70 px-4 py-4 sm:px-6">
                  <div className="mx-auto w-full max-w-4xl">
                    <ResearchComposer
                      error={error}
                      isSubmitting={isSubmitting}
                      onOptionsChange={setComposerOptions}
                      options={composerOptions}
                      suggestions={suggestions}
                    />
                  </div>
                </div>
              </ThreadPrimitive.Root>
            </section>
          </AssistantRuntimeProvider>

          <aside className="hidden border-l border-border/70 bg-muted/20 p-4 xl:block">
            <ResearchInspector deadlines={deadlines} documents={documents} results={selectedResults} run={selectedRun} />
          </aside>
        </div>
      </div>
    </main>
  );
}

function HeaderStat({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[22px] border border-border bg-background px-4 py-3">
      <div className="mb-2 inline-flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="size-4" />
      </div>
      <p className="text-xs uppercase tracking-[0.18em] text-foreground/35">{label}</p>
      <p className="mt-1 line-clamp-2 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function EmptyState({ drafts, evidence, matter }: { drafts: Draft[]; evidence: EvidenceItem[]; matter: Matter }) {
  return (
    <div className="surface-panel rounded-[32px] p-8">
      <p className="text-xs uppercase tracking-[0.2em] text-foreground/35">Research Console</p>
      <h2 className="mt-2 font-serif text-4xl tracking-[-0.04em] text-foreground">{matter.title}</h2>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
        Stelle eine Rechtsfrage, aktiviere Deep Research und lass die Pipeline parallel ueber Gesetz, Rechtsprechung,
        Akte und Web laufen. Der finale Report landet direkt im Chatverlauf.
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-[24px] border border-border bg-background p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-foreground/35">Vorhandene Entwuerfe</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{drafts.length}</p>
        </div>
        <div className="rounded-[24px] border border-border bg-background p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-foreground/35">Anlagen / Evidence</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{evidence.length}</p>
        </div>
      </div>
    </div>
  );
}

function buildPromptSuggestions(title: string, deadlines: Deadline[], documents: Document[]) {
  const prompts = [
    `Pruefe die Erfolgsaussichten und erstelle einen finalen Report mit Quellen fuer ${title}.`,
    "Welche Anspruchsgrundlagen, Normen und Gegenargumente sind am staerksten?",
    "Welche offenen Risiken, Fristen und Beweisluecken bleiben nach der Aktenlage?",
  ];
  if (deadlines[0]) {
    prompts.push(`Beruecksichtige besonders die Frist ${deadlines[0].label} und priorisiere die noetigen Schritte.`);
  }
  if (documents[0]) {
    prompts.push(`Nutze ${documents[0].title} als primaeren Aktenanker und gleiche ihn mit Gesetz und Rechtsprechung ab.`);
  }
  return prompts.slice(0, 5);
}

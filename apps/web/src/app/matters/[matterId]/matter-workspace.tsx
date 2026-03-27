"use client";

import { startTransition, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Clock3,
  FileStack,
  MessagesSquare,
  Scale
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { ChatInputBar } from "@/app/matters/[matterId]/chat-input-bar";
import { ChatRunMessage } from "@/app/matters/[matterId]/chat-run-message";
import { useResearchWorkspace } from "@/app/matters/[matterId]/use-research-workspace";
import { formatDeadlineKind, formatRelativeRunTime, formatStatusLabel } from "@/lib/formatting";
import {
  Deadline,
  Document,
  Draft,
  EvidenceItem,
  Matter,
  ResearchRequest,
  ResearchResult,
  ResearchRun
} from "@/lib/types";
import { cn } from "@/lib/utils";

type MatterWorkspaceProps = {
  deadlines: Deadline[];
  documents: Document[];
  drafts: Draft[];
  evidence: EvidenceItem[];
  initialResultsByRun: Record<string, ResearchResult[]>;
  initialRuns: ResearchRun[];
  matter: Matter;
  matterId: string;
};

export function MatterWorkspace({
  deadlines,
  documents,
  drafts,
  evidence,
  initialResultsByRun,
  initialRuns,
  matter,
  matterId
}: MatterWorkspaceProps) {
  const { error, hasPendingRun, isSubmitting, resultsByRun, runs, submitResearch } =
    useResearchWorkspace({ initialResultsByRun, initialRuns, matterId });

  const nextDeadline = [...deadlines]
    .filter((d) => d.due_date)
    .sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)))[0] ?? null;

  const promptSuggestions = buildPromptSuggestions(matter.title, documents, deadlines);
  const chronologicalRuns = [...runs];

  function replayRun(run: ResearchRun) {
    const payload: ResearchRequest = {
      deep_research: run.deep_research,
      filters: run.filters,
      focus: run.focus ?? null,
      max_results: run.max_results,
      query: run.query,
      sources: run.sources
    };
    startTransition(() => { void submitResearch(payload); });
  }

  // Auto-scroll chat to bottom when new runs arrive
  const chatEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [runs.length]);

  return (
    <div className="flex h-[calc(100svh-3rem)] flex-col overflow-hidden">
      {/* Header */}
      <header className="shrink-0 border-b border-border bg-background/80 backdrop-blur-sm px-4 py-3">
        <div className="flex flex-wrap items-start gap-4 lg:flex-nowrap lg:items-center">
          <div className="min-w-0 flex-1 space-y-1">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3 w-3" />
              Akten
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              <Scale className="h-4 w-4 text-ember shrink-0" />
              <h1 className="font-serif text-xl leading-tight tracking-[-0.02em] text-foreground truncate">
                {matter.title}
              </h1>
              <Badge variant={matter.status === "active" ? "success" : "secondary"} className="shrink-0">
                {formatStatusLabel(matter.status)}
              </Badge>
              {hasPendingRun && (
                <Badge variant="ember" className="shrink-0 animate-pulse">Recherche aktiv</Badge>
              )}
            </div>
            {matter.description && (
              <p className="text-xs text-muted-foreground line-clamp-1 max-w-2xl">{matter.description}</p>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <HeaderStat icon={FileStack} label="Dokumente" value={documents.length} />
            <HeaderStat icon={Clock3} label="Fristen" value={deadlines.length} />
            <HeaderStat icon={MessagesSquare} label="Anfragen" value={runs.length} />
          </div>
        </div>
      </header>

      {/* Three-column body */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Left panel — matter info */}
        <aside className="hidden w-64 shrink-0 flex-col gap-3 overflow-y-auto border-r border-border bg-muted/20 p-3 xl:flex">
          <MatterInfoPanel
            deadlines={deadlines}
            documents={documents}
            nextDeadline={nextDeadline}
            runs={runs}
          />
        </aside>

        {/* Center — chat */}
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <ScrollArea className="flex-1 px-4 py-4">
            {chronologicalRuns.length === 0 ? (
              <ChatEmptyState
                matterTitle={matter.title}
                suggestions={promptSuggestions}
                documentCount={documents.length}
                nextDeadline={nextDeadline}
              />
            ) : (
              <div className="mx-auto max-w-3xl space-y-8 pb-4">
                {chronologicalRuns.map((run, index) => (
                  <div key={run.id}>
                    {index > 0 && <Separator className="my-6" />}
                    <ChatRunMessage
                      documents={documents}
                      onReplay={replayRun}
                      results={resultsByRun[run.id] ?? []}
                      run={run}
                    />
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
            )}
          </ScrollArea>

          <ChatInputBar
            documents={documents}
            error={error}
            isSubmitting={isSubmitting}
            matterTitle={matter.title}
            onSubmit={submitResearch}
            suggestions={chronologicalRuns.length === 0 ? promptSuggestions : []}
          />
        </main>

        {/* Right panel — context */}
        <aside className="hidden w-72 shrink-0 flex-col overflow-y-auto border-l border-border bg-muted/20 p-3 lg:flex">
          <MatterContextTabs
            deadlines={deadlines}
            documents={documents}
            drafts={drafts}
            evidence={evidence}
          />
        </aside>
      </div>
    </div>
  );
}

/* ---- Header stat ---- */
function HeaderStat({
  icon: Icon,
  label,
  value
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-sm">
      <Icon className="h-3.5 w-3.5 text-ember" />
      <span className="font-semibold text-foreground">{value}</span>
      <span className="text-xs text-muted-foreground hidden sm:inline">{label}</span>
    </div>
  );
}

/* ---- Left info panel ---- */
function MatterInfoPanel({
  deadlines,
  documents,
  nextDeadline,
  runs
}: {
  deadlines: Deadline[];
  documents: Document[];
  nextDeadline: Deadline | null;
  runs: ResearchRun[];
}) {
  return (
    <div className="space-y-3">
      {/* Quick stats */}
      <Card className="p-0">
        <CardContent className="p-3 space-y-2">
          <p className="section-label text-foreground/40">Uebersicht</p>
          <InfoRow label="Dokumente" value={String(documents.length)} />
          <InfoRow label="Fristen" value={String(deadlines.length)} />
          <InfoRow label="Anfragen" value={String(runs.length)} />
        </CardContent>
      </Card>

      {/* Next deadline */}
      {nextDeadline && (
        <Card className="p-0">
          <CardContent className="p-3">
            <p className="section-label text-foreground/40 mb-2">Naechste Frist</p>
            <p className="text-sm font-medium text-foreground">{nextDeadline.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatDeadlineKind(nextDeadline.kind)} · {nextDeadline.due_date ?? "kein Datum"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Recent runs */}
      {runs.length > 0 && (
        <Card className="p-0">
          <CardContent className="p-3">
            <p className="section-label text-foreground/40 mb-2">Letzte Anfragen</p>
            <div className="space-y-2">
              {[...runs].reverse().slice(0, 4).map((run) => (
                <div key={run.id} className="text-xs">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <Badge
                      variant={run.status === "ready" ? "success" : "secondary"}
                      className="text-[9px]"
                    >
                      {formatStatusLabel(run.status)}
                    </Badge>
                    <span className="text-muted-foreground/60 shrink-0">{formatRelativeRunTime(run.created_at)}</span>
                  </div>
                  <p className="text-muted-foreground line-clamp-2 leading-5">
                    {run.query.length > 80 ? run.query.slice(0, 80) + "…" : run.query}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  );
}

/* ---- Right context tabs ---- */
function MatterContextTabs({
  deadlines,
  documents,
  drafts,
  evidence
}: {
  deadlines: Deadline[];
  documents: Document[];
  drafts: Draft[];
  evidence: EvidenceItem[];
}) {
  return (
    <Tabs defaultValue="docs" className="flex flex-col gap-2">
      <TabsList className="w-full grid grid-cols-4 h-8 text-[10px]">
        <TabsTrigger value="docs" className="text-[10px]">Dok.</TabsTrigger>
        <TabsTrigger value="deadlines" className="text-[10px]">Fristen</TabsTrigger>
        <TabsTrigger value="drafts" className="text-[10px]">Entw.</TabsTrigger>
        <TabsTrigger value="evidence" className="text-[10px]">Anl.</TabsTrigger>
      </TabsList>

      <TabsContent value="docs" className="mt-0 space-y-2">
        <p className="section-label text-foreground/40">Dokumente</p>
        {documents.length ? documents.map((doc) => (
          <Card key={doc.id} className="p-0">
            <CardContent className="p-2.5">
              <p className="text-xs font-medium text-foreground line-clamp-2">{doc.title}</p>
              {doc.summary && (
                <p className="mt-1 text-[10px] text-muted-foreground line-clamp-3 leading-4">{doc.summary}</p>
              )}
              <Badge variant="secondary" className="mt-1.5 text-[9px]">
                {formatStatusLabel(doc.processing_status)}
              </Badge>
            </CardContent>
          </Card>
        )) : <EmptyContext text="Keine Dokumente." />}
      </TabsContent>

      <TabsContent value="deadlines" className="mt-0 space-y-2">
        <p className="section-label text-foreground/40">Fristen</p>
        {deadlines.length ? deadlines.map((d) => (
          <Card key={d.id} className="p-0">
            <CardContent className="p-2.5">
              <p className="text-xs font-medium text-foreground">{d.label}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {formatDeadlineKind(d.kind)}{d.due_date ? ` · ${d.due_date}` : ""}
              </p>
            </CardContent>
          </Card>
        )) : <EmptyContext text="Keine Fristen erkannt." />}
      </TabsContent>

      <TabsContent value="drafts" className="mt-0 space-y-2">
        <p className="section-label text-foreground/40">Entwuerfe</p>
        {drafts.length ? drafts.map((draft) => (
          <Card key={draft.id} className="p-0">
            <CardContent className="p-2.5">
              <p className="text-xs font-medium text-foreground">{draft.title}</p>
              <p className="mt-1 text-[10px] text-muted-foreground line-clamp-3 leading-4">
                {draft.content.slice(0, 120)}
              </p>
            </CardContent>
          </Card>
        )) : <EmptyContext text="Noch keine Entwuerfe." />}
      </TabsContent>

      <TabsContent value="evidence" className="mt-0 space-y-2">
        <p className="section-label text-foreground/40">Anlagen</p>
        {evidence.length ? evidence.map((item) => (
          <Card key={item.id} className="p-0">
            <CardContent className="p-2.5">
              <p className="text-xs font-medium text-foreground">{item.label} / {item.title}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Position {item.position}</p>
            </CardContent>
          </Card>
        )) : <EmptyContext text="Kein Anlagenverzeichnis." />}
      </TabsContent>
    </Tabs>
  );
}

function EmptyContext({ text }: { text: string }) {
  return <p className="text-xs text-muted-foreground py-2">{text}</p>;
}

/* ---- Empty state ---- */
function ChatEmptyState({
  matterTitle,
  suggestions,
  documentCount,
  nextDeadline
}: {
  matterTitle: string;
  suggestions: string[];
  documentCount: number;
  nextDeadline: Deadline | null;
}) {
  return (
    <div className="mx-auto max-w-2xl py-12 text-center space-y-6">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-ember/10">
        <Scale className="h-7 w-7 text-ember" />
      </div>
      <div>
        <h2 className="font-serif text-2xl text-foreground tracking-[-0.02em]">{matterTitle}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Stellen Sie eine Frage zur Akte, zu Anspruchsgrundlagen, Fristen oder Belegen.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 text-left">
        <QuickInfoCard
          label="Aktenquellen"
          value={`${documentCount} Dokumente`}
        />
        <QuickInfoCard
          label="Naechste Frist"
          value={nextDeadline ? `${nextDeadline.label} · ${nextDeadline.due_date ?? "kein Datum"}` : "Keine Fristen"}
        />
        <QuickInfoCard
          label="Recherche"
          value="Bundesrecht, Rechtsprechung, EU-Recht, Akte"
        />
      </div>

      {suggestions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vorschlaege</p>
          <div className="flex flex-wrap justify-center gap-2">
            {suggestions.map((s) => (
              <div
                key={s}
                className="rounded-full border border-border bg-background px-4 py-2 text-xs text-muted-foreground"
              >
                {s.length > 72 ? s.slice(0, 72) + "…" : s}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function QuickInfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <p className="section-label text-foreground/38 mb-1">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  );
}

function buildPromptSuggestions(title: string, documents: Document[], deadlines: Deadline[]) {
  const firstDoc = documents[0]?.title ?? "die wichtigste Vertragsunterlage";
  const nextDeadline = deadlines.find((d) => d.due_date)?.label ?? "die naechste Frist";
  return [
    `Kurzer Ueberblick ueber die Akte ${title}.`,
    `Anspruchsgrundlagen und Einwendungen fuer ${firstDoc}.`,
    `Welche Unterlagen fehlen noch fuer ${nextDeadline}?`
  ];
}

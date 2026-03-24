"use client";

import Link from "next/link";
import { startTransition } from "react";
import { ArrowLeft, Clock3, FileStack, MessagesSquare, Sparkles } from "lucide-react";

import { MatterContextPanel } from "@/app/matters/[matterId]/matter-context-panel";
import { MatterOverviewSidebar } from "@/app/matters/[matterId]/matter-overview-sidebar";
import { ResearchComposer } from "@/app/matters/[matterId]/research-composer";
import { ResearchRunThread } from "@/app/matters/[matterId]/research-run-thread";
import { useResearchWorkspace } from "@/app/matters/[matterId]/use-research-workspace";
import { Badge } from "@/components/ui/badge";
import { formatStatusLabel } from "@/lib/formatting";
import { Matter, Deadline, Document, Draft, EvidenceItem, ResearchRequest, ResearchResult, ResearchRun } from "@/lib/types";

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
  const { error, hasPendingRun, isSubmitting, resultsByRun, runs, submitResearch } = useResearchWorkspace({
    initialResultsByRun,
    initialRuns,
    matterId
  });
  const latestReadyRun = [...runs].reverse().find((run) => run.status === "ready") ?? null;
  const latestReadyResults = latestReadyRun ? resultsByRun[latestReadyRun.id] ?? [] : [];
  const nextDeadline = [...deadlines]
    .filter((deadline) => deadline.due_date)
    .sort((left, right) => String(left.due_date).localeCompare(String(right.due_date)))[0] ?? null;
  const promptSuggestions = buildPromptSuggestions(matter.title, documents, deadlines);
  const visibleRuns = [...runs].reverse().slice(0, 4);

  function replayRun(run: ResearchRun) {
    const payload: ResearchRequest = {
      deep_research: run.deep_research,
      filters: run.filters,
      focus: run.focus ?? null,
      max_results: run.max_results,
      query: run.query,
      sources: run.sources
    };
    startTransition(() => {
      void submitResearch(payload);
    });
  }

  return (
    <main className="page-shell py-4">
      <section className="surface-panel overflow-hidden rounded-[38px]">
        <div className="overflow-hidden rounded-[36px] border-b border-charcoal/10 bg-paper px-6 py-6 sm:px-8">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div className="space-y-4">
              <Link className="inline-flex items-center gap-2 text-sm text-ink/58 hover:text-charcoal" href="/">
                <ArrowLeft className="h-4 w-4" />
                Zurueck zur Aktenliste
              </Link>
              <div className="flex flex-wrap items-center gap-3">
                <p className="section-label text-ink/42">Aktenarbeitsraum</p>
                <Badge className="bg-charcoal text-paper">{formatStatusLabel(matter.status)}</Badge>
                {hasPendingRun ? <Badge className="bg-ember text-paper">Recherche aktiv</Badge> : null}
              </div>
              <div className="space-y-3">
                <h1 className="max-w-4xl font-serif text-4xl leading-tight tracking-[-0.04em] text-charcoal sm:text-5xl">{matter.title}</h1>
                <p className="max-w-3xl text-sm leading-7 text-ink/66">
                  {matter.description ?? "Keine Beschreibung hinterlegt. Nutzen Sie die Akte als Ausgangspunkt fuer Recherche, Argumentationsaufbau und Entwurfsarbeit."}
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <HeaderMetric icon={FileStack} label="Dokumente" value={String(documents.length).padStart(2, "0")} />
              <HeaderMetric icon={Clock3} label="Fristen" value={String(deadlines.length).padStart(2, "0")} />
              <HeaderMetric icon={MessagesSquare} label="Anfragen" value={String(runs.length).padStart(2, "0")} />
            </div>
          </div>
        </div>

        <div className="grid gap-4 p-4 xl:grid-cols-[290px_minmax(0,1fr)_360px]">
          <MatterOverviewSidebar deadlines={deadlines} documents={documents} matter={matter} nextDeadline={nextDeadline} runs={runs} />

          <section className="min-w-0 space-y-5">
            <WorkspaceOverview
              documentCount={documents.length}
              latestReadyResultsCount={latestReadyResults.length}
              latestReadyRun={latestReadyRun}
              nextDeadline={nextDeadline}
            />

            <ResearchComposer
              documents={documents}
              error={error}
              isSubmitting={isSubmitting}
              matterTitle={matter.title}
              onSubmit={submitResearch}
              suggestions={promptSuggestions}
            />

            <div className="surface-panel rounded-[34px] p-5 sm:p-6">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-charcoal/10 pb-4">
                <div>
                  <p className="section-label text-ink/42">Bearbeitung</p>
                  <p className="mt-2 text-sm text-ink/62">
                    Die Mitte ist jetzt die eigentliche Arbeitsflaeche der Akte: Frage stellen, Antwort lesen, Fundstellen pruefen und nur bei Bedarf ins Protokoll gehen.
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 text-sm text-ink/52">
                  <Sparkles className="h-4 w-4 text-ember" />
                  Chat mit Aktenkontext
                </div>
              </div>

              <div className="space-y-8">
                {visibleRuns.length ? (
                  visibleRuns.map((run, index) => (
                    <ResearchRunThread
                      documents={documents}
                      key={run.id}
                      onReplay={replayRun}
                      results={resultsByRun[run.id] ?? []}
                      run={run}
                      showDivider={index > 0}
                    />
                  ))
                ) : (
                  <div className="rounded-[28px] border border-charcoal/10 bg-white/58 px-6 py-10 text-sm leading-7 text-ink/62">
                    Noch keine Anfrage vorhanden. Stellen Sie oben eine Frage zur Akte, zu Anspruchsgrundlagen, Fristen oder Belegen. Der eigentliche Deep-Research-Lauf wird bei Bedarf ueber das Prompt-Tag aktiviert.
                  </div>
                )}
                {runs.length > visibleRuns.length ? (
                  <p className="text-sm text-ink/48">
                    Es werden die neuesten {visibleRuns.length} Antworten gezeigt. Aeltere Recherchelaeufe bleiben im Datenbestand erhalten, stehen aber nicht mehr im Vordergrund.
                  </p>
                ) : null}
              </div>
            </div>
          </section>

          <MatterContextPanel deadlines={deadlines} documents={documents} drafts={drafts} evidence={evidence} latestReadyRun={latestReadyRun} />
        </div>
      </section>
    </main>
  );
}

function HeaderMetric({
  icon: Icon,
  label,
  value
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-[140px] rounded-[24px] border border-charcoal/10 bg-white/62 px-4 py-4">
      <div className="flex items-center gap-2 text-ink/46">
        <Icon className="h-4 w-4 text-ember" />
        <p className="section-label text-ink/34">{label}</p>
      </div>
      <p className="mt-3 font-serif text-3xl text-charcoal">{value}</p>
    </div>
  );
}

function WorkspaceOverview({
  documentCount,
  latestReadyResultsCount,
  latestReadyRun,
  nextDeadline
}: {
  documentCount: number;
  latestReadyResultsCount: number;
  latestReadyRun: ResearchRun | null;
  nextDeadline: Deadline | null;
}) {
  return (
    <div className="surface-panel rounded-[34px] p-5 sm:p-6">
      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="section-label text-ink/42">Arbeitsstand</p>
          <h2 className="mt-3 font-serif text-3xl leading-tight tracking-[-0.03em] text-charcoal">Akte im Blick</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-ink/68">
            {latestReadyRun?.summary
              ? truncate(latestReadyRun.summary, 240)
              : "Die Akte ist bereit fuer Fragen zu Anspruchslage, Belegen, Schriftsatzstruktur oder naechsten Schritten."}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
          <OverviewTile label="Aktenquellen" value={`${documentCount}`} />
          <OverviewTile label="Fundstellen" value={`${latestReadyResultsCount}`} />
          <OverviewTile label="Naechste Frist" value={nextDeadline?.due_date ?? "Offen"} />
        </div>
      </div>
    </div>
  );
}

function OverviewTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-charcoal/10 bg-white/56 px-4 py-4">
      <p className="section-label text-ink/34">{label}</p>
      <p className="mt-3 text-sm font-medium leading-6 text-charcoal">{value}</p>
    </div>
  );
}

function buildPromptSuggestions(title: string, documents: Document[], deadlines: Deadline[]) {
  const firstDocument = documents[0]?.title ?? "die wichtigste Vertragsunterlage";
  const nextDeadline = deadlines.find((deadline) => deadline.due_date)?.label ?? "die naechste Frist";

  return [
    `Gib mir einen kurzen Ueberblick ueber die Akte ${title}.`,
    `Welche Anspruchsgrundlagen und Einwendungen sind aktuell fuer ${firstDocument} relevant?`,
    `Welche Unterlagen oder offenen Punkte fehlen noch fuer ${nextDeadline}?`
  ];
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength - 3)}...`;
}

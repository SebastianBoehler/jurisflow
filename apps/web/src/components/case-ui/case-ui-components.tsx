"use client";

import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { formatWorkspaceDate, StatusBadge } from "@/components/workspace/workspace-chrome";
import { useCaseUiData } from "@/components/case-ui/case-ui-data-context";

function EmptyText({ children }: { children: string }) {
  return <p className="text-sm leading-6 text-muted-foreground">{children}</p>;
}

function Panel({
  children,
  eyebrow,
  title,
}: {
  children: ReactNode;
  eyebrow?: string;
  title: string;
}) {
  return (
    <section className="h-full rounded-[1.4rem] border border-border/70 bg-background p-5 shadow-sm">
      {eyebrow ? <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{eyebrow}</p> : null}
      <h3 className="mt-1 text-lg font-semibold tracking-[-0.03em] text-foreground">{title}</h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function CaseBrief({ variant = "compact" }: { variant?: "compact" | "full" }) {
  const { deadlines, documents, drafts, evidence, matter, researchRuns } = useCaseUiData();

  return (
    <Panel eyebrow="Aktive Fallakte" title={matter?.title ?? "Neue Fallakte"}>
      <div className="space-y-4">
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
          {matter?.description ?? "Noch keine aktive Akte geladen. Wähle eine Akte oder erstelle eine neue Fallakte."}
        </p>
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={matter?.status} />
          <Badge variant="outline">{documents.length} Dokumente</Badge>
          <Badge variant="outline">{researchRuns.length} Recherchen</Badge>
          <Badge variant="outline">{deadlines.length} Fristen</Badge>
          {variant === "full" ? <Badge variant="outline">{evidence.length + drafts.length} Belege/Entwürfe</Badge> : null}
        </div>
      </div>
    </Panel>
  );
}

export function DocumentBoard({ variant = "compact" }: { variant?: "compact" | "detailed" }) {
  const { documents, isLoading } = useCaseUiData();

  return (
    <Panel eyebrow="Dokumente" title="Akteninhalt">
      {isLoading && documents.length === 0 ? <EmptyText>Lade Dokumente...</EmptyText> : null}
      {!isLoading && documents.length === 0 ? <EmptyText>Noch keine Dokumente in dieser Akte.</EmptyText> : null}
      <div className="space-y-3">
        {documents.slice(0, variant === "detailed" ? 8 : 4).map((document) => (
          <div key={document.id} className="rounded-[1rem] border border-border/60 bg-muted/20 px-3 py-3">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium text-foreground">{document.title}</p>
              <StatusBadge status={document.processing_status} />
            </div>
            {variant === "detailed" || document.summary ? (
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {document.summary ?? "Zusammenfassung folgt nach der Verarbeitung."}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </Panel>
  );
}

export function ResearchTimeline({ limit = 4 }: { limit?: number }) {
  const { researchRuns } = useCaseUiData();

  return (
    <Panel eyebrow="Recherche" title="Research Timeline">
      {researchRuns.length === 0 ? <EmptyText>Noch keine Research-Läufe für diese Akte.</EmptyText> : null}
      <div className="space-y-3">
        {researchRuns.slice(0, limit).map((run) => (
          <div key={run.id} className="rounded-[1rem] border border-border/60 bg-background px-3 py-3">
            <div className="flex items-center justify-between gap-3">
              <StatusBadge status={run.status} />
              <span className="text-xs text-muted-foreground">{formatWorkspaceDate(run.created_at)}</span>
            </div>
            <p className="mt-3 text-sm font-medium leading-6 text-foreground">{run.query}</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{run.summary ?? "Zusammenfassung folgt nach Abschluss."}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

export function DeadlineBoard() {
  const { deadlines } = useCaseUiData();

  return (
    <Panel eyebrow="Fristen" title="Deadline Board">
      {deadlines.length === 0 ? <EmptyText>Noch keine Fristen erkannt.</EmptyText> : null}
      <div className="space-y-3">
        {deadlines.slice(0, 5).map((deadline) => (
          <div key={deadline.id} className="rounded-[1rem] border border-border/60 px-3 py-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-foreground">{deadline.label}</p>
              <Badge variant="outline">{deadline.kind}</Badge>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{deadline.due_date ?? "Kein Datum hinterlegt"}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

export function DraftQueue() {
  const { drafts } = useCaseUiData();

  return (
    <Panel eyebrow="Entwürfe" title="Draft Queue">
      {drafts.length === 0 ? <EmptyText>Noch keine Entwürfe in dieser Akte.</EmptyText> : null}
      <div className="space-y-3">
        {drafts.slice(0, 5).map((draft) => (
          <div key={draft.id} className="rounded-[1rem] border border-border/60 px-3 py-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-foreground">{draft.title}</p>
              <StatusBadge status={draft.status} />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{draft.kind}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

export function EvidenceMap() {
  const { evidence } = useCaseUiData();

  return (
    <Panel eyebrow="Belege" title="Evidence Map">
      {evidence.length === 0 ? <EmptyText>Noch keine Belegstellen extrahiert.</EmptyText> : null}
      <div className="space-y-2">
        {evidence.slice(0, 8).map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-3 rounded-[0.9rem] bg-muted/30 px-3 py-2 text-sm">
            <span className="font-medium text-foreground">{item.label}</span>
            <span className="truncate text-muted-foreground">{item.title}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

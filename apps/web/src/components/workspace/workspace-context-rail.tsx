"use client";

import { BookOpenText, Clock3, FileStack, Files, Microscope, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatWorkspaceDate,
  StatusBadge,
  WorkspaceSection,
} from "@/components/workspace/workspace-chrome";
import type { Deadline, Document, Draft, EvidenceItem, Matter, ResearchRun } from "@/lib/types";

type WorkspaceContextRailProps = {
  deadlines: Deadline[];
  documents: Document[];
  drafts: Draft[];
  error: string | null;
  evidence: EvidenceItem[];
  isLoading: boolean;
  matter: Matter | null;
  researchRuns: ResearchRun[];
};

function CompactMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1rem] border border-border/70 bg-background px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-foreground">{value}</p>
    </div>
  );
}

function EmptyRailState() {
  return (
    <div className="flex flex-col gap-4">
      <WorkspaceSection icon={Sparkles} id="start-mode" title="Startmodus">
        <div className="space-y-3 text-sm leading-6 text-muted-foreground">
          <p>Die erste Nachricht erzeugt die Akte automatisch und bindet den Chat direkt an diesen Vorgang.</p>
          <p>Deep Research, Quellen und Dokument-Uploads bleiben inline im selben Gespräch sichtbar.</p>
        </div>
      </WorkspaceSection>

      <WorkspaceSection icon={Microscope} id="source-lanes" title="Recherche-Lanes">
        <div className="flex flex-wrap gap-2">
          {["Bundesrecht", "Landesrecht", "Rechtsprechung", "EU-Recht", "Web"].map((source) => (
            <Badge key={source} variant="outline">
              {source}
            </Badge>
          ))}
        </div>
      </WorkspaceSection>

      <WorkspaceSection icon={Files} id="uploads" title="Upload direkt im Composer">
        <div className="space-y-3 text-sm leading-6 text-muted-foreground">
          <p>Unterstützt: PDF, DOCX, TXT und E-Mail-Dateien.</p>
          <p>Nach dem Upload werden Dokumente verarbeitet und erscheinen rechts als Matter-Kontext.</p>
        </div>
      </WorkspaceSection>
    </div>
  );
}

export function WorkspaceContextRail({
  deadlines,
  documents,
  drafts,
  error,
  evidence,
  isLoading,
  matter,
  researchRuns,
}: WorkspaceContextRailProps) {
  if (!matter) {
    return (
      <aside className="flex min-h-0 flex-col gap-4 xl:overflow-auto">
        {error ? (
          <div className="rounded-[1.4rem] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}
        <EmptyRailState />
      </aside>
    );
  }

  const readyDocuments = documents.filter((document) => document.processing_status === "ready").length;
  const readyResearchRuns = researchRuns.filter((run) => run.status === "ready").length;
  const readyDrafts = drafts.filter((draft) => draft.status === "ready").length;

  return (
    <aside className="flex min-h-0 flex-col gap-4 xl:overflow-auto">
      {error ? (
        <div className="rounded-[1.4rem] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <WorkspaceSection icon={BookOpenText} id="matter-snapshot" title="Matter Snapshot">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <StatusBadge status={matter.status} />
            <span className="text-xs text-muted-foreground">{formatWorkspaceDate(matter.updated_at)}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <CompactMetric label="Dokumente" value={String(documents.length)} />
            <CompactMetric label="Research" value={String(researchRuns.length)} />
            <CompactMetric label="Bereit" value={String(readyDocuments + readyResearchRuns)} />
            <CompactMetric label="Entwürfe" value={String(readyDrafts)} />
          </div>
        </div>
      </WorkspaceSection>

      <WorkspaceSection icon={Microscope} id="research" title="Research-Läufe">
        {isLoading && researchRuns.length === 0 ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-20 rounded-[1.15rem]" />
            <Skeleton className="h-20 rounded-[1.15rem]" />
          </div>
        ) : researchRuns.length ? (
          <div className="flex flex-col gap-3">
            {researchRuns.slice(0, 4).map((run) => (
              <div key={run.id} className="rounded-[1.15rem] border border-border/70 bg-background px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <StatusBadge status={run.status} />
                  <span className="text-xs text-muted-foreground">{formatWorkspaceDate(run.created_at)}</span>
                </div>
                <p className="mt-3 text-sm font-medium leading-6 text-foreground">{run.query}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {run.summary ?? "Zusammenfassung folgt nach Abschluss des Laufs."}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm leading-6 text-muted-foreground">
            Noch kein Deep-Research-Lauf. Aktiviere Deep Research im Composer, um Quellen und Traces in die Matter zu schreiben.
          </p>
        )}
      </WorkspaceSection>

      <WorkspaceSection icon={FileStack} id="evidence" title="Dokumente & Belege">
        {isLoading && documents.length === 0 ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-16 rounded-[1.15rem]" />
            <Skeleton className="h-16 rounded-[1.15rem]" />
          </div>
        ) : documents.length ? (
          <div className="flex flex-col gap-4">
            {documents.slice(0, 4).map((document) => (
              <div key={document.id} className="rounded-[1.15rem] border border-border/70 bg-background px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-foreground">{document.title}</p>
                  <StatusBadge status={document.processing_status} />
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {document.summary ?? "Wird nach der Verarbeitung in der Matter einsortiert."}
                </p>
              </div>
            ))}

            {evidence.length ? (
              <>
                <Separator />
                <div className="space-y-2">
                  {evidence.slice(0, 4).map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium text-foreground">{item.label}</span>
                      <span className="truncate text-muted-foreground">{item.title}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        ) : (
          <p className="text-sm leading-6 text-muted-foreground">
            Lade Schriftsätze, E-Mails oder PDFs direkt im Composer hoch. Sie werden automatisch der aktiven Matter zugeordnet.
          </p>
        )}
      </WorkspaceSection>

      <WorkspaceSection icon={Clock3} id="deadlines" title="Fristen & Entwürfe">
        <div className="flex flex-col gap-4">
          {deadlines.length ? (
            deadlines.slice(0, 4).map((deadline) => (
              <div key={deadline.id} className="rounded-[1.15rem] border border-border/70 bg-background px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-foreground">{deadline.label}</p>
                  <Badge variant="outline">{deadline.kind}</Badge>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {deadline.due_date ?? "Termin folgt aus der Dokumentauswertung."}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm leading-6 text-muted-foreground">
              Noch keine Fristen erkannt. Sobald Dokumente verarbeitet sind, erscheinen Fristen hier.
            </p>
          )}

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-foreground">Entwurfswarteschlange</p>
              <Badge variant="outline">{drafts.length}</Badge>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              Entwürfe bleiben Teil der Matter und verschwinden nicht als einzelne Chat-Nachrichten.
            </p>
          </div>
        </div>
      </WorkspaceSection>
    </aside>
  );
}

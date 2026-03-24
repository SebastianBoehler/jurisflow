import { Clock3Icon, FileTextIcon, GavelIcon, ScaleIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { formatRelativeRunTime, formatStatusLabel } from "@/lib/formatting";
import { Deadline, Document, Matter, ResearchRun } from "@/lib/types";

type MatterOverviewSidebarProps = {
  deadlines: Deadline[];
  documents: Document[];
  matter: Matter;
  nextDeadline: Deadline | null;
  runs: ResearchRun[];
};

export function MatterOverviewSidebar({ deadlines, documents, matter, nextDeadline, runs }: MatterOverviewSidebarProps) {
  return (
    <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
      <section className="surface-panel rounded-[32px] p-5">
        <div className="space-y-5">
          <div className="space-y-3">
            <p className="section-label text-ink/42">Navigation</p>
            <Badge className="bg-charcoal text-paper">{formatStatusLabel(matter.status)}</Badge>
            <p className="text-sm leading-7 text-ink/68">
              Die linke Spalte ordnet die Akte, bevor Sie in der Mitte arbeiten. Der Schwerpunkt liegt bewusst nicht auf Agent-Interna, sondern auf Orientierung.
            </p>
          </div>

          <div className="space-y-3">
            <Metric icon={FileTextIcon} label="Dokumente" value={documents.length} />
            <Metric icon={GavelIcon} label="Fristen" value={deadlines.length} />
            <Metric icon={ScaleIcon} label="Anfragen" value={runs.length} />
          </div>
        </div>
      </section>

      <section className="surface-panel rounded-[32px] p-5">
        <div className="space-y-4">
          <p className="section-label text-ink/42">Naechster Fokus</p>
          {nextDeadline ? (
            <div className="rounded-[24px] border border-charcoal/10 bg-white/58 px-4 py-4">
              <div className="flex items-center gap-2 text-sm font-medium text-charcoal">
                <Clock3Icon className="h-4 w-4 text-ember" />
                {nextDeadline.label}
              </div>
              <p className="mt-2 text-sm leading-7 text-ink/66">
                Fällig: {nextDeadline.due_date ?? "ohne Datum"}.
              </p>
            </div>
          ) : (
            <p className="text-sm leading-7 text-ink/62">Aktuell ist keine konkrete Frist als naechster Fokus markiert.</p>
          )}
        </div>
      </section>

      <section className="surface-panel rounded-[32px] p-5">
        <div className="space-y-4">
          <p className="section-label text-ink/42">Letzte Antworten</p>
          {runs.length ? (
            runs.slice(0, 3).map((run, index) => (
              <div key={run.id} className={`${index > 0 ? "border-t border-charcoal/10 pt-4" : ""}`}>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-charcoal">{formatStatusLabel(run.status)}</span>
                  <span className="text-xs text-ink/46">{formatRelativeRunTime(run.created_at)}</span>
                </div>
                <p className="mt-2 text-sm leading-7 text-ink/68">{truncate(run.query, 110)}</p>
              </div>
            ))
          ) : (
            <p className="text-sm leading-7 text-ink/62">Sobald ein Run gestartet wird, erscheint hier die letzte Arbeitslinie.</p>
          )}
        </div>
      </section>

      <section className="surface-panel rounded-[32px] p-5">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-charcoal">
            <Clock3Icon className="h-4 w-4 text-ember" />
            Arbeitsweise
          </div>
          <p className="text-sm leading-7 text-ink/68">
            Juristische Arbeit gewinnt hier ueber Lesbarkeit: zuerst Orientierung, dann gezielte Frage an die Akte, danach erst Protokoll und tiefe Recherche.
          </p>
        </div>
      </section>
    </aside>
  );
}

function Metric({
  icon: Icon,
  label,
  value
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between rounded-[24px] border border-charcoal/10 bg-white/58 px-4 py-3">
      <div className="flex items-center gap-3">
        <Icon className="h-4 w-4 text-ember" />
        <span className="text-sm text-ink/70">{label}</span>
      </div>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength - 3)}...`;
}

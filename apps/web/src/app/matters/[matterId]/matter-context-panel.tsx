import { Badge } from "@/components/ui/badge";
import { formatDeadlineKind, formatStatusLabel } from "@/lib/formatting";
import { Deadline, Document, Draft, EvidenceItem, ResearchRun } from "@/lib/types";

type MatterContextPanelProps = {
  deadlines: Deadline[];
  documents: Document[];
  drafts: Draft[];
  evidence: EvidenceItem[];
  latestReadyRun: ResearchRun | null;
};

export function MatterContextPanel({ deadlines, documents, drafts, evidence, latestReadyRun }: MatterContextPanelProps) {
  return (
    <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
      <section className="surface-panel rounded-[32px] p-5">
        <div className="mb-5">
          <p className="section-label text-ink/42">Aktenkontext</p>
          <p className="mt-2 text-sm leading-7 text-ink/62">
            Dokumente, Fristen, Entwuerfe und Anlagen bleiben rechts immer sichtbar, damit die Unterhaltung in der Mitte nicht vom juristischen Material getrennt wird.
          </p>
        </div>
        {latestReadyRun?.summary ? (
          <div className="rounded-[24px] border border-charcoal/10 bg-white/56 px-4 py-4">
            <p className="section-label text-ink/34">Letzte Kurzantwort</p>
            <p className="mt-3 text-sm leading-7 text-ink/68">{preview(latestReadyRun.summary, 160)}</p>
          </div>
        ) : null}
      </section>

      <Section title="Dokumente">
        {documents.length ? (
          documents.map((document) => (
            <ListCard key={document.id} subtitle={preview(document.summary ?? "Wartet auf Verarbeitung.")} title={document.title}>
              <Badge variant="outline">{formatStatusLabel(document.processing_status)}</Badge>
            </ListCard>
          ))
        ) : (
          <EmptyState text="Noch keine Dokumente vorhanden." />
        )}
      </Section>

      <Section title="Fristen">
        {deadlines.length ? (
          deadlines.map((deadline) => (
            <ListCard
              key={deadline.id}
              subtitle={deadline.due_date ? `${formatDeadlineKind(deadline.kind)} / ${deadline.due_date}` : formatDeadlineKind(deadline.kind)}
              title={deadline.label}
            />
          ))
        ) : (
          <EmptyState text="Es wurden noch keine Fristen erkannt." />
        )}
      </Section>

      <Section title="Entwuerfe">
        {drafts.length ? (
          drafts.map((draft) => <ListCard key={draft.id} subtitle={preview(draft.content)} title={draft.title} />)
        ) : (
          <EmptyState text="Noch keine Entwuerfe erzeugt." />
        )}
      </Section>

      <Section title="Anlagen">
        {evidence.length ? (
          evidence.map((item) => <ListCard key={item.id} subtitle={`Position ${item.position}`} title={`${item.label} / ${item.title}`} />)
        ) : (
          <EmptyState text="Noch keine Eintraege im Anlagenverzeichnis." />
        )}
      </Section>
    </aside>
  );
}

function Section({ children, title }: React.PropsWithChildren<{ title: string }>) {
  return (
    <section className="surface-panel rounded-[32px] p-5">
      <div className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-ink/42">{title}</div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function ListCard({ children, subtitle, title }: React.PropsWithChildren<{ subtitle: string; title: string }>) {
  return (
    <div className="rounded-[24px] border border-charcoal/10 bg-white/56 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-medium text-sm">{title}</div>
          <p className="mt-1 whitespace-pre-wrap text-sm text-ink/68">{subtitle}</p>
        </div>
        {children}
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="text-sm text-ink/58">{text}</p>;
}

function preview(value: string, maxLength = 190) {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength - 3)}...`;
}

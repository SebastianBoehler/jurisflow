"use client";

import type { ComponentType } from "react";
import { Clock3, FileStack, Search, ShieldCheck } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatDeadlineKind, formatResearchSource, formatStatusLabel } from "@/lib/formatting";
import { Deadline, Document, ResearchResult, ResearchRun } from "@/lib/types";

type ResearchInspectorProps = {
  deadlines: Deadline[];
  documents: Document[];
  results: ResearchResult[];
  run: ResearchRun | null;
};

export function ResearchInspector({ deadlines, documents, results, run }: ResearchInspectorProps) {
  return (
    <div className="flex flex-col gap-4">
      <Card className="rounded-[24px]">
        <CardHeader className="pb-3">
          <CardTitle className="font-serif text-2xl">Run Inspector</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <InspectorStat icon={Search} label="Status" value={run ? formatStatusLabel(run.status) : "Kein Lauf"} />
          <InspectorStat icon={ShieldCheck} label="Quellen" value={String(results.length)} />
          <InspectorStat icon={FileStack} label="Dokumente" value={String(documents.length)} />
          <InspectorStat icon={Clock3} label="Fristen" value={String(deadlines.length)} />
        </CardContent>
      </Card>

      <Card className="rounded-[24px]">
        <CardHeader className="pb-3">
          <CardTitle className="font-serif text-2xl">Sources</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {results.length ? (
            results.map((result, index) => (
              <div key={result.id} className="flex flex-col gap-1 rounded-2xl border border-border bg-background p-3">
                <span className="text-xs uppercase tracking-[0.18em] text-foreground/35">
                  S{index + 1} · {formatResearchSource(result.source)}
                </span>
                <p className="text-sm font-medium text-foreground">{result.title}</p>
                {result.citation ? <p className="text-xs text-muted-foreground">{result.citation}</p> : null}
                <p className="text-xs leading-5 text-muted-foreground">{result.excerpt}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Noch keine Quellen geladen.</p>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-[24px]">
        <CardHeader className="pb-3">
          <CardTitle className="font-serif text-2xl">Context</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <p className="text-xs uppercase tracking-[0.18em] text-foreground/35">Dokumente</p>
            {documents.slice(0, 4).map((document) => (
              <div key={document.id} className="rounded-2xl border border-border bg-background p-3">
                <p className="text-sm font-medium text-foreground">{document.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{document.summary ?? formatStatusLabel(document.processing_status)}</p>
              </div>
            ))}
          </div>

          <Separator />

          <div className="flex flex-col gap-2">
            <p className="text-xs uppercase tracking-[0.18em] text-foreground/35">Fristen</p>
            {deadlines.slice(0, 4).map((deadline) => (
              <div key={deadline.id} className="rounded-2xl border border-border bg-background p-3">
                <p className="text-sm font-medium text-foreground">{deadline.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDeadlineKind(deadline.kind)}
                  {deadline.due_date ? ` · ${deadline.due_date}` : ""}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function InspectorStat({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-border bg-background px-3 py-2">
      <span className="inline-flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4" />
        {label}
      </span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

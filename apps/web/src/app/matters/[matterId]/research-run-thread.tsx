"use client";

import { CopyIcon, RotateCcwIcon } from "lucide-react";

import { Action, Actions } from "@/components/ai/actions";
import { Agent, AgentContent, AgentHeader, AgentInstructions, AgentOutput, AgentTool, AgentTools } from "@/components/ai/agent";
import { Artifact, ArtifactAction, ArtifactActions, ArtifactContent, ArtifactDescription, ArtifactHeader, ArtifactTitle } from "@/components/ai/artifact";
import { Attachments } from "@/components/ai/attachments";
import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
  ChainOfThoughtSearchResult,
  ChainOfThoughtSearchResults,
  ChainOfThoughtStep
} from "@/components/ai/chain-of-thought";
import { Reasoning } from "@/components/ai/reasoning";
import { Badge } from "@/components/ui/badge";
import { Shimmer } from "@/components/ui/shimmer";
import { formatRelativeRunTime, formatResearchSource, formatStatusLabel } from "@/lib/formatting";
import { Document, ResearchResult, ResearchRun } from "@/lib/types";

type ResearchRunThreadProps = {
  documents: Document[];
  onReplay: (run: ResearchRun) => void;
  results: ResearchResult[];
  run: ResearchRun;
  showDivider?: boolean;
};

export function ResearchRunThread({ documents, onReplay, results, run, showDivider = false }: ResearchRunThreadProps) {
  const reasoningArtifact = run.artifacts.find((artifact) => artifact.kind === "reasoning");
  const memoArtifact = run.artifacts.find((artifact) => artifact.kind === "memo");
  const userAttachments =
    run.sources.includes("internal_docs") && documents.length
      ? documents.slice(0, 3).map((document) => ({
          id: document.id,
          filename: document.title,
          mediaType: document.kind === "email" ? "message/rfc822" : "text/plain",
          type: "file" as const
        }))
      : [];

  const featuredResults = results.slice(0, 3);

  return (
    <article className={`space-y-4 ${showDivider ? "border-t border-charcoal/10 pt-8" : ""}`}>
      <div className="rounded-[28px] border border-charcoal/10 bg-white/70 px-5 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">Frage</Badge>
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/40">{formatRelativeRunTime(run.created_at)}</span>
            </div>
            <p className="text-base leading-8 text-charcoal">{run.query}</p>
            {run.focus ? <p className="text-sm leading-7 text-ink/62">Fokus: {run.focus}</p> : null}
            {userAttachments.length ? <Attachments items={userAttachments} /> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={run.status === "ready" ? "success" : "outline"}>{formatStatusLabel(run.status)}</Badge>
            {run.deep_research ? <Badge className="bg-ember text-paper">Deep Research</Badge> : null}
          </div>
        </div>
      </div>

      <div className="rounded-[30px] border border-charcoal/10 bg-paper px-5 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="section-label text-ink/34">Antwort</p>
            <h3 className="mt-3 font-serif text-3xl leading-tight tracking-[-0.03em] text-charcoal">
              {formatRunHeading(memoArtifact?.title)}
            </h3>
          </div>
          <Actions className="gap-2">
            <Action
              label="Zusammenfassung kopieren"
              onClick={() => {
                if (run.summary) {
                  void navigator.clipboard.writeText(run.summary);
                }
              }}
            >
              <CopyIcon className="h-4 w-4" />
            </Action>
            <Action label="Recherche erneut starten" onClick={() => onReplay(run)}>
              <RotateCcwIcon className="h-4 w-4" />
            </Action>
          </Actions>
        </div>

        <div className="mt-5 space-y-5">
          <div className="text-sm leading-8 text-ink/76">
            {run.summary ? (
              getAnswerPreview(run.summary)
            ) : run.status === "processing" || run.status === "queued" ? (
              <Shimmer>Antwort wird vorbereitet...</Shimmer>
            ) : (
              "Noch keine Zusammenfassung vorhanden."
            )}
          </div>

          {featuredResults.length ? (
            <div className="space-y-3">
              <p className="section-label text-ink/34">Wichtigste Fundstellen</p>
              <div className="grid gap-3 lg:grid-cols-3">
                {featuredResults.map((result) => (
                  <div key={result.id} className="rounded-[22px] border border-charcoal/10 bg-white/72 px-4 py-4">
                    <Badge variant="outline">{formatResearchSource(result.source)}</Badge>
                    <p className="mt-3 text-sm font-medium leading-6 text-charcoal">{result.title}</p>
                    {result.citation ? <p className="mt-2 text-xs leading-5 text-ink/48">{result.citation}</p> : null}
                    <p className="mt-3 text-sm leading-6 text-ink/66">{truncate(result.excerpt, 180)}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <details className="rounded-[24px] border border-charcoal/10 bg-white/60 p-4">
            <summary className="cursor-pointer list-none text-sm font-medium text-charcoal">
              Rechercheprotokoll und ADK-Details
            </summary>
            <div className="mt-4 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                {run.sources.map((source) => (
                  <Badge key={source} variant="outline">
                    {formatResearchSource(source)}
                  </Badge>
                ))}
              </div>

              {reasoningArtifact?.content ? <Reasoning isStreaming={run.status !== "ready"}>{reasoningArtifact.content}</Reasoning> : null}

              {run.trace.length ? (
                <ChainOfThought defaultOpen={run.status !== "ready"}>
                  <ChainOfThoughtHeader>Recherchepfad</ChainOfThoughtHeader>
                  <ChainOfThoughtContent>
                    {run.trace.map((step) => (
                      <ChainOfThoughtStep
                        key={step.key}
                        description={step.detail}
                        label={`${step.label} / ${step.agent}`}
                        status={step.status}
                      >
                        {step.metadata.queries && Array.isArray(step.metadata.queries) ? (
                          <ChainOfThoughtSearchResults>
                            {step.metadata.queries.map((query) => (
                              <ChainOfThoughtSearchResult key={query}>{query}</ChainOfThoughtSearchResult>
                            ))}
                          </ChainOfThoughtSearchResults>
                        ) : null}
                      </ChainOfThoughtStep>
                    ))}
                  </ChainOfThoughtContent>
                </ChainOfThought>
              ) : null}

              <Agent>
                <AgentHeader model={run.deep_research ? "google-adk" : "standard"} name="Jurisflow Research Agent" />
                <AgentContent>
                  <AgentInstructions>
                    Plane den Rechtsforschungsweg, durchsuche die aktivierten Quellen, erkenne Luecken und formuliere daraus ein belastbares Memo.
                  </AgentInstructions>
                  <AgentTools title="Aktivierte Quellen">
                    {run.sources.map((source) => (
                      <AgentTool
                        key={source}
                        description={`Quelle ${formatResearchSource(source)} wird fuer den aktuellen Aktenkontext durchsucht.`}
                        schema={JSON.stringify({ source, max_results: run.max_results }, null, 2)}
                        title={formatResearchSource(source)}
                      />
                    ))}
                  </AgentTools>
                  <AgentOutput schema={`ResearchMemo { summary: string; artifacts: ${run.artifacts.length}; results: ${results.length}; }`} />
                </AgentContent>
              </Agent>

              {run.artifacts.length ? (
                <div className="grid gap-4 xl:grid-cols-2">
                  {run.artifacts.map((artifact) => (
                    <Artifact key={artifact.key}>
                      <ArtifactHeader>
                        <div>
                          <ArtifactTitle>{artifact.title}</ArtifactTitle>
                          <ArtifactDescription>{artifact.kind}</ArtifactDescription>
                        </div>
                        <ArtifactActions>
                          <ArtifactAction
                            label="Artefakt kopieren"
                            onPress={() => void navigator.clipboard.writeText(artifact.content)}
                            type="copy"
                          />
                          <ArtifactAction
                            label="Artefakt herunterladen"
                            onPress={() => {
                              const blob = new Blob([artifact.content], { type: "text/markdown;charset=utf-8" });
                              const url = URL.createObjectURL(blob);
                              const link = document.createElement("a");
                              link.href = url;
                              link.download = `${artifact.key}.md`;
                              link.click();
                              URL.revokeObjectURL(url);
                            }}
                            type="download"
                          />
                        </ArtifactActions>
                      </ArtifactHeader>
                      <ArtifactContent>
                        <pre className="whitespace-pre-wrap text-sm leading-6 text-ink/75">{artifact.content}</pre>
                      </ArtifactContent>
                    </Artifact>
                  ))}
                </div>
              ) : null}

              {results.length > 3 ? (
                <div className="space-y-3">
                  <p className="section-label text-ink/34">Weitere Fundstellen</p>
                  {results.slice(3).map((result) => (
                    <div key={result.id} className="rounded-[22px] border border-charcoal/10 bg-white/62 px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{formatResearchSource(result.source)}</Badge>
                        <span className="font-medium text-sm">{result.title}</span>
                      </div>
                      {result.citation ? <p className="mt-2 text-sm text-ink/58">{result.citation}</p> : null}
                      <p className="mt-2 text-sm text-ink/72">{result.excerpt}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </details>
        </div>
      </div>
    </article>
  );
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength - 3)}...`;
}

function getAnswerPreview(value: string) {
  return truncate(value.replace(/\s+/g, " ").trim(), 540);
}

function formatRunHeading(value?: string) {
  if (!value) {
    return "Juristische Einordnung";
  }
  if (value === "Research Memo") {
    return "Antwortmemo";
  }
  return value;
}

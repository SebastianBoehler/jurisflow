"use client";

import type {
  MessageStatus,
  SourceMessagePart,
  ThreadAssistantMessagePart,
  ToolCallMessagePart,
} from "@assistant-ui/react";

type ToolCallPart = ToolCallMessagePart;

export type ResearchResultSource = { id: string; title: string; url: string | null };

export type ResearchRunState = {
  id: string;
  status: string;
  summary: string | null;
  trace: Array<{ key: string; label: string; agent: string; status: string; detail: string | null }>;
  artifacts: Array<{ kind: string; content: string | null }>;
};

export const RUNNING_STATUS = { type: "running" } as const satisfies MessageStatus;
export const COMPLETE_STATUS = { type: "complete", reason: "stop" } as const satisfies MessageStatus;

function getReportContent(run: ResearchRunState): string {
  return (
    run.artifacts?.find((artifact) => artifact.kind === "report")?.content?.trim() ||
    run.artifacts?.find((artifact) => artifact.kind === "memo")?.content?.trim() ||
    ""
  );
}

function makeSourceId(prefix: string, value: string) {
  return `${prefix}-${value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80) || "source"}`;
}

function createSourcePart(title: string, url: string, idSeed: string): SourceMessagePart {
  return {
    type: "source",
    sourceType: "url",
    id: makeSourceId("source", idSeed),
    title,
    url,
  };
}

export function parseWebSearchSources(text: string): SourceMessagePart[] {
  if (!text.trim()) return [];

  return text
    .split(/\n\s*---\s*\n/g)
    .map((block) => block.trim())
    .filter(Boolean)
    .flatMap((block, index) => {
      const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
      const url = lines.find((line) => /^https?:\/\//i.test(line));
      if (!url) return [];

      const titleLine = lines.find((line) => line !== url) ?? url;
      const title = titleLine.replace(/^\*\*(.*)\*\*$/, "$1").trim() || url;
      return [createSourcePart(title, url, `${url}-${index}`)];
    });
}

function researchResultsToSources(results: ResearchResultSource[]): SourceMessagePart[] {
  return results
    .filter((result): result is ResearchResultSource & { url: string } => Boolean(result.url))
    .map((result) => createSourcePart(result.title, result.url, result.id || result.url));
}

export function buildResearchContent(
  run: ResearchRunState,
  results: ResearchResultSource[] = [],
): ThreadAssistantMessagePart[] {
  const stepParts: ToolCallPart[] = run.trace?.map((step) => ({
    type: "tool-call",
    toolCallId: step.key,
    toolName: step.label,
    argsText: step.agent,
    args: { agent: step.agent } as ToolCallPart["args"],
    result: step.status === "complete" || step.status === "ready"
      ? (step.detail ?? "")
      : step.status === "failed"
      ? (step.detail ?? "Fehlgeschlagen.")
      : undefined,
  })) ?? [];

  const reportText = getReportContent(run);
  const parts: ThreadAssistantMessagePart[] = [...stepParts];
  if (reportText) parts.push({ type: "text", text: reportText });
  if (!reportText && run.summary) parts.push({ type: "text", text: run.summary });
  parts.push(...researchResultsToSources(results));
  return parts;
}

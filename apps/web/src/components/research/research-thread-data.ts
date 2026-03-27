"use client";

import type { MessageStatus, ThreadAssistantMessagePart, ThreadMessage, ThreadUserMessagePart } from "@assistant-ui/react";

import type { ResearchRequest, ResearchResult, ResearchRun, ResearchTraceStep } from "@/lib/types";

export type ResearchDraftRun = {
  createdAt: string;
  id: string;
  request: ResearchRequest;
};

function buildUserMetadata(custom: ResearchRequestMeta) {
  return {
    custom,
  };
}

function buildAssistantMetadata(custom: ResearchResponseMeta) {
  return {
    custom,
    steps: [],
    unstable_annotations: [],
    unstable_data: [],
    unstable_state: null,
  };
}

export type ResearchRequestMeta = {
  kind: "research-request";
  runId: string;
  createdAt: string;
  deepResearch: boolean;
  focus: string | null;
  maxResults: number;
  query: string;
  sources: string[];
};

export type ResearchResponseMeta = {
  kind: "research-response";
  runId: string;
  createdAt: string;
  deepResearch: boolean;
  hasReport: boolean;
  maxResults: number;
  query: string;
  replayRequest: ResearchRequest;
  resultCount: number;
  sources: string[];
  status: string;
  summary: string | null;
  trace: ResearchTraceStep[];
};

type ResearchTracePart = {
  type: "data";
  name: "research-trace";
  data: {
    steps: ResearchTraceStep[];
  };
};

type ResearchSourcesPart = {
  type: "data";
  name: "research-sources";
  data: {
    results: ResearchResult[];
  };
};

type ResearchEmptyPart = {
  type: "data";
  name: "research-empty";
  data: {
    message: string;
  };
};

function buildUserMessageContent(query: string): ThreadUserMessagePart[] {
  return [{ type: "text", text: query }];
}

function buildAssistantMessageContent(run: ResearchRun, results: ResearchResult[]): ThreadAssistantMessagePart[] {
  const report = run.artifacts.find((artifact) => artifact.kind === "report");
  const memo = run.artifacts.find((artifact) => artifact.kind === "memo");
  const text = report?.content?.trim() || memo?.content?.trim() || "";
  const parts: ThreadAssistantMessagePart[] = [];

  if (run.trace.length) {
    parts.push({
      data: { steps: run.trace },
      name: "research-trace",
      type: "data",
    } satisfies ResearchTracePart);
  }

  if (text) {
    parts.push({ text, type: "text" });
  } else if (run.status === "ready" && !run.summary) {
    parts.push({
      data: {
        message: "Kein Report verfuegbar. Die Pipeline hat keinen belastbaren Bericht geliefert.",
      },
      name: "research-empty",
      type: "data",
    } satisfies ResearchEmptyPart);
  }

  if (results.length) {
    parts.push({
      data: { results },
      name: "research-sources",
      type: "data",
    } satisfies ResearchSourcesPart);
  }

  if (!parts.length && (run.status === "queued" || run.status === "processing")) {
    parts.push({
      data: {
        message: "Die Recherche laeuft. Quellen und Bericht erscheinen hier, sobald der Worker Ergebnisse liefert.",
      },
      name: "research-empty",
      type: "data",
    } satisfies ResearchEmptyPart);
  }

  return parts;
}

function buildResponseStatus(run: ResearchRun): MessageStatus {
  if (run.status === "queued" || run.status === "processing") {
    return { type: "running" };
  }
  if (run.status === "failed") {
    return {
      error: run.summary ?? "Research run failed.",
      reason: "error",
      type: "incomplete",
    };
  }
  return {
    reason: "stop",
    type: "complete",
  };
}

function buildRequestMeta(run: ResearchRun): ResearchRequestMeta {
  return {
    createdAt: run.created_at,
    deepResearch: run.deep_research,
    focus: run.focus ?? null,
    kind: "research-request",
    maxResults: run.max_results,
    query: run.query,
    runId: run.id,
    sources: run.sources,
  };
}

function buildResponseMeta(run: ResearchRun, results: ResearchResult[]): ResearchResponseMeta {
  const hasReport = run.artifacts.some((artifact) => artifact.kind === "report" || artifact.kind === "memo");

  return {
    createdAt: run.created_at,
    deepResearch: run.deep_research,
    hasReport,
    kind: "research-response",
    maxResults: run.max_results,
    query: run.query,
    replayRequest: {
      deep_research: run.deep_research,
      focus: run.focus ?? null,
      max_results: run.max_results,
      query: run.query,
      sources: run.sources,
    },
    resultCount: results.length,
    runId: run.id,
    sources: run.sources,
    status: run.status,
    summary: run.summary,
    trace: run.trace,
  };
}

export function buildResearchThreadMessages(
  runs: ResearchRun[],
  resultsByRun: Record<string, ResearchResult[]>,
  draftRun: ResearchDraftRun | null
): ThreadMessage[] {
  const messages = runs.flatMap((run) => {
    const results = resultsByRun[run.id] ?? [];
    return [
      {
        attachments: [],
        content: buildUserMessageContent(run.query),
        createdAt: new Date(run.created_at),
        id: `${run.id}:user`,
        metadata: buildUserMetadata(buildRequestMeta(run)),
        role: "user" as const,
      },
      {
        content: buildAssistantMessageContent(run, results),
        createdAt: new Date(run.created_at),
        id: `${run.id}:assistant`,
        metadata: buildAssistantMetadata(buildResponseMeta(run, results)),
        role: "assistant" as const,
        status: buildResponseStatus(run),
      },
    ] satisfies ThreadMessage[];
  });

  if (!draftRun) {
    return messages;
  }

  const createdAt = new Date(draftRun.createdAt);
  const requestMeta: ResearchRequestMeta = {
    createdAt: draftRun.createdAt,
    deepResearch: draftRun.request.deep_research ?? true,
    focus: draftRun.request.focus ?? null,
    kind: "research-request",
    maxResults: draftRun.request.max_results ?? 8,
    query: draftRun.request.query,
    runId: draftRun.id,
    sources: draftRun.request.sources ?? [],
  };
  const responseMeta: ResearchResponseMeta = {
    createdAt: draftRun.createdAt,
    deepResearch: draftRun.request.deep_research ?? true,
    hasReport: false,
    kind: "research-response",
    maxResults: draftRun.request.max_results ?? 8,
    query: draftRun.request.query,
    replayRequest: draftRun.request,
    resultCount: 0,
    runId: draftRun.id,
    sources: draftRun.request.sources ?? [],
    status: "processing",
    summary: null,
    trace: [],
  };

  return [
    ...messages,
    {
      attachments: [],
      content: buildUserMessageContent(draftRun.request.query),
      createdAt,
      id: `${draftRun.id}:user`,
      metadata: buildUserMetadata(requestMeta),
      role: "user",
    },
    {
      content: [
        {
          data: {
            message: "Recherche wird gestartet und an die ADK-Pipeline uebergeben.",
          },
          name: "research-empty",
          type: "data",
        } satisfies ResearchEmptyPart,
      ],
      createdAt,
      id: `${draftRun.id}:assistant`,
      metadata: buildAssistantMetadata(responseMeta),
      role: "assistant",
      status: { type: "running" },
    },
  ];
}

export function extractMessageText(content: readonly ThreadUserMessagePart[]) {
  return content
    .filter((part): part is Extract<ThreadUserMessagePart, { type: "text" }> => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();
}

export function getResearchRequestMeta(message: ThreadMessage) {
  const meta = message.metadata.custom as Partial<ResearchRequestMeta> | undefined;
  if (meta?.kind !== "research-request") {
    return null;
  }
  return meta as ResearchRequestMeta;
}

export function getResearchResponseMeta(message: ThreadMessage) {
  const meta = message.metadata.custom as Partial<ResearchResponseMeta> | undefined;
  if (meta?.kind !== "research-response") {
    return null;
  }
  return meta as ResearchResponseMeta;
}

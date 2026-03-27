"use client";

import { useCallback, useRef } from "react";
import { useLocalRuntime, type ChatModelAdapter } from "@assistant-ui/react";

const API_BASE = "/_jurisflow";
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? "00000000-0000-0000-0000-000000000001";
const DEFAULT_SOURCES = ["federal_law", "state_law", "case_law", "eu_law", "general_web"];
const POLL_INTERVAL_MS = 1800;
const MAX_POLL = 90;

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", "X-Tenant-ID": TENANT_ID, ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`API error ${res.status} for ${path}`);
  return res.json() as Promise<T>;
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export type ChatMode = {
  deepResearch: boolean;
  sources: string[];
};

export function useChatRuntime(mode: ChatMode) {
  const matterIdRef = useRef<string | null>(null);
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const ensureMatter = useCallback(async (): Promise<string> => {
    if (matterIdRef.current) return matterIdRef.current;
    const matter = await apiFetch<{ id: string }>("/v1/matters", {
      method: "POST",
      body: JSON.stringify({
        title: `Recherche ${new Date().toLocaleString("de-DE")}`,
        description: "Ephemere Recherche.",
      }),
    });
    matterIdRef.current = matter.id;
    return matter.id;
  }, []);

  const adapter: ChatModelAdapter = {
    async *run({ messages, abortSignal }) {
      const matterId = await ensureMatter();
      const { deepResearch, sources } = modeRef.current;

      const lastMsg = messages[messages.length - 1];
      const query = lastMsg?.content.find((p) => p.type === "text")?.text ?? "";

      const history = messages.slice(0, -1).flatMap((msg) => {
        const textPart = msg.content.find((p) => p.type === "text");
        if (!textPart || textPart.type !== "text") return [];
        return [{ role: msg.role === "assistant" ? "assistant" : "user", content: textPart.text }];
      });

      if (deepResearch) {
        yield* runResearch(matterId, query, sources.length ? sources : DEFAULT_SOURCES, abortSignal);
      } else {
        yield* runChatStream(matterId, query, history, abortSignal);
      }
    },
  };

  return useLocalRuntime(adapter);
}

async function* runChatStream(
  matterId: string,
  query: string,
  history: Array<{ role: string; content: string }>,
  abortSignal: AbortSignal,
) {
  const res = await fetch(`${API_BASE}/v1/matters/${matterId}/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Tenant-ID": TENANT_ID },
    body: JSON.stringify({ query, history }),
    signal: abortSignal,
    cache: "no-store",
  });

  if (!res.ok || !res.body) throw new Error(`Chat stream failed: ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let accText = "";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toolCalls = new Map<string, Record<string, any>>();

  const buildContent = () => [
    ...Array.from(toolCalls.values()),
    ...(accText ? [{ type: "text" as const, text: accText }] : []),
  ];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    let shouldBreak = false;

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const raw = line.slice(6).trim();
      if (!raw) continue;
      let event: Record<string, unknown>;
      try { event = JSON.parse(raw) as Record<string, unknown>; } catch { continue; }

      if (event.type === "text_delta") {
        accText += String(event.text ?? "");
      } else if (event.type === "tool_call") {
        const id = String(event.id);
        toolCalls.set(id, {
          type: "tool-call",
          toolCallId: id,
          toolName: event.name,
          argsText: JSON.stringify(event.args),
          args: event.args as Record<string, unknown>,
          status: { type: "running" },
        });
      } else if (event.type === "tool_result") {
        const id = String(event.id);
        const existing = toolCalls.get(id);
        if (existing) {
          toolCalls.set(id, { ...existing, result: event.output, status: { type: "complete" } });
        }
      } else if (event.type === "done") {
        shouldBreak = true;
      } else if (event.type === "error") {
        throw new Error(String(event.message ?? "Stream error"));
      }

      const content = buildContent();
      if (content.length > 0) yield { content };
    }
    if (shouldBreak) break;
  }
}

interface ResearchRun {
  id: string;
  status: string;
  summary: string | null;
  trace: Array<{ key: string; label: string; agent: string; status: string; detail: string | null }>;
  artifacts: Array<{ kind: string; content: string | null }>;
}

function getReportContent(run: ResearchRun): string {
  return (
    run.artifacts?.find((a) => a.kind === "report")?.content?.trim() ||
    run.artifacts?.find((a) => a.kind === "memo")?.content?.trim() ||
    ""
  );
}

function buildResearchContent(run: ResearchRun, results: Array<{ id: string; title: string; url: string | null }> = []) {
  // Represent trace steps as tool calls
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stepParts: Record<string, any>[] = run.trace?.map((step) => ({
    type: "tool-call",
    toolCallId: step.key,
    toolName: step.label,
    argsText: step.agent,
    args: { agent: step.agent },
    result: step.detail ?? undefined,
    status: step.status === "complete" || step.status === "ready"
      ? { type: "complete" }
      : step.status === "failed"
      ? { type: "incomplete", reason: "error" }
      : { type: "running" },
  })) ?? [];

  const reportText = getReportContent(run);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parts: Record<string, any>[] = [...stepParts];
  if (reportText) parts.push({ type: "text", text: reportText });
  if (!reportText && run.summary) parts.push({ type: "text", text: run.summary });
  return parts;
}

async function* runResearch(
  matterId: string,
  query: string,
  sources: string[],
  abortSignal: AbortSignal,
) {
  yield { content: [{ type: "text" as const, text: "Recherche wird gestartet…" }] };

  const run = await apiFetch<ResearchRun>(`/v1/matters/${matterId}/research`, {
    method: "POST",
    body: JSON.stringify({ query, sources, deep_research: true, max_results: 8 }),
  });

  yield { content: buildResearchContent(run) };

  let currentRun = run;
  let attempts = 0;

  while ((currentRun.status === "queued" || currentRun.status === "processing") && attempts < MAX_POLL) {
    if (abortSignal.aborted) return;
    await sleep(POLL_INTERVAL_MS);
    attempts++;
    try {
      const runs = await apiFetch<ResearchRun[]>(`/v1/matters/${matterId}/research`);
      const updated = runs.find((r) => r.id === run.id);
      if (updated) {
        currentRun = updated;
        yield { content: buildResearchContent(currentRun) };
      }
    } catch {
      // keep polling
    }
  }

  // Fetch final results for sources
  const results = await apiFetch<Array<{ id: string; title: string; url: string | null }>>(
    `/v1/research/${run.id}/results`
  ).catch(() => []);

  yield { content: buildResearchContent(currentRun, results), status: { type: "complete" as const } };
}

import { ResearchResult, ResearchRun, ResearchTraceStep } from "@/lib/types";

export type ChatMessage =
  | {
      id: string;
      role: "user";
      content: string;
    }
  | {
      id: string;
      role: "assistant";
      content: string;
      error?: string;
      mode: "chat" | "research";
      results: ResearchResult[];
      runId?: string;
      status: "queued" | "processing" | "ready" | "failed";
      summary?: string | null;
      trace: ResearchTraceStep[];
    };

export function getReportContent(run: ResearchRun) {
  return (
    run.artifacts.find((artifact) => artifact.kind === "report")?.content?.trim() ||
    run.artifacts.find((artifact) => artifact.kind === "memo")?.content?.trim() ||
    ""
  );
}

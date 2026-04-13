import type { CaseUiData, CaseUiMessage } from "@/components/case-ui/types";

export function appendUserMessage(conversation: CaseUiMessage[], content: string): CaseUiMessage[] {
  return [...conversation, { role: "user", content, hasCode: false }];
}

export function buildApiMessages(
  conversation: CaseUiMessage[],
  currentDashboard: string,
  data: CaseUiData,
) {
  return conversation.flatMap((message, index) => {
    if (message.role === "assistant" && !message.content.trim()) return [];

    if (message.role === "user" && index === conversation.length - 1) {
      return {
        role: "user",
        content: [
          message.content,
          `<case-context>${JSON.stringify(buildCaseSummary(data), null, 2)}</case-context>`,
          `<current-dashboard>\n${currentDashboard}\n</current-dashboard>`,
        ].join("\n\n"),
      };
    }

    return [{ role: message.role, content: message.content }];
  });
}

function buildCaseSummary(data: CaseUiData) {
  return {
    matter: data.matter
      ? {
          id: data.matter.id,
          title: data.matter.title,
          description: data.matter.description,
          status: data.matter.status,
          updated_at: data.matter.updated_at,
        }
      : null,
    counts: {
      deadlines: data.deadlines.length,
      documents: data.documents.length,
      drafts: data.drafts.length,
      evidence: data.evidence.length,
      researchRuns: data.researchRuns.length,
    },
    documents: data.documents.slice(0, 6).map((document) => ({
      title: document.title,
      status: document.processing_status,
      summary: document.summary,
    })),
    researchRuns: data.researchRuns.slice(0, 5).map((run) => ({
      query: run.query,
      status: run.status,
      sources: run.sources,
      summary: run.summary,
    })),
    deadlines: data.deadlines.slice(0, 5).map((deadline) => ({
      label: deadline.label,
      kind: deadline.kind,
      due_date: deadline.due_date,
    })),
    drafts: data.drafts.slice(0, 5).map((draft) => ({
      kind: draft.kind,
      title: draft.title,
      status: draft.status,
    })),
  };
}

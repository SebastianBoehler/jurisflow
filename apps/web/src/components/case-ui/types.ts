import type { Deadline, Document, Draft, EvidenceItem, Matter, ResearchRun } from "@/lib/types";

export type CaseUiMessage = {
  role: "user" | "assistant";
  content: string;
  text?: string;
  hasCode: boolean;
};

export type CaseUiData = {
  deadlines: Deadline[];
  documents: Document[];
  drafts: Draft[];
  error: string | null;
  evidence: EvidenceItem[];
  isLoading: boolean;
  matter: Matter | null;
  researchRuns: ResearchRun[];
};

export type Matter = {
  id: string;
  tenant_id: string;
  title: string;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export type Document = {
  id: string;
  title: string;
  kind: string;
  processing_status: string;
  summary: string | null;
};

export type Deadline = {
  id: string;
  label: string;
  kind: string;
  due_date: string | null;
};

export type ResearchRun = {
  id: string;
  query: string;
  focus?: string | null;
  sources: string[];
  filters: Record<string, string | boolean | string[]>;
  max_results: number;
  deep_research: boolean;
  status: string;
  summary: string | null;
  trace: ResearchTraceStep[];
  artifacts: ResearchArtifact[];
  created_at: string;
};

export type ResearchResult = {
  id: string;
  research_run_id: string;
  source: string;
  title: string;
  citation: string | null;
  excerpt: string;
  relevance_score: number;
  url: string | null;
};

export type ResearchTraceStep = {
  key: string;
  label: string;
  agent: string;
  status: string;
  detail: string | null;
  source: string | null;
  kind: string;
  started_at: string | null;
  finished_at: string | null;
  metadata: Record<string, string | number | boolean | string[]>;
};

export type ResearchArtifact = {
  key: string;
  kind: string;
  title: string;
  content: string;
  metadata: Record<string, string | number | boolean | string[]>;
};

export type ChatMessage = {
  id: string;
  query: string;
  answer: string | null;
  created_at: string;
};

export type ResearchRequest = {
  query: string;
  focus?: string | null;
  sources?: string[];
  filters?: Record<string, string | boolean | string[]>;
  max_results?: number;
  deep_research?: boolean;
  history?: ConversationTurn[];
};

export type ConversationTurn = {
  role: "user" | "assistant";
  content: string;
};

export type Draft = {
  id: string;
  kind: string;
  title: string;
  status: string;
  content: string;
};

export type EvidenceItem = {
  id: string;
  label: string;
  title: string;
  position: number;
};

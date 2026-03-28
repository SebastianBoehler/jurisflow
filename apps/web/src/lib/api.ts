import { ChatMessage, Deadline, Document, Draft, EvidenceItem, Matter, ResearchRequest, ResearchResult, ResearchRun } from "@/lib/types";

const SERVER_API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? "00000000-0000-0000-0000-000000000001";

type ApiErrorPayload = {
  detail?: string;
};

function getApiBase() {
  if (typeof window !== "undefined") {
    return "/_jurisflow";
  }
  return SERVER_API_BASE;
}

async function buildRequestError(response: Response, path: string) {
  let detail = "";

  try {
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const payload = (await response.json()) as ApiErrorPayload;
      detail = payload.detail?.trim() ?? "";
    } else {
      detail = (await response.text()).trim();
    }
  } catch {
    detail = "";
  }

  if (detail.includes("You exceeded your current quota")) {
    return new Error("Der Chat ist derzeit nicht verfuegbar, weil fuer den konfigurierten OpenAI-Zugang kein Kontingent mehr verfuegbar ist.");
  }

  if (detail) {
    return new Error(detail);
  }

  return new Error(`Request failed for ${path} (${response.status})`);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${getApiBase()}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        "X-Tenant-ID": TENANT_ID,
        ...(init?.headers ?? {})
      },
      cache: "no-store"
    });
  } catch (error) {
    throw new Error(`Network request failed for ${path}`, { cause: error });
  }

  if (!response.ok) {
    throw await buildRequestError(response, path);
  }
  return response.json() as Promise<T>;
}

export async function fetchMatters() {
  return request<Matter[]>("/v1/matters");
}

export async function createMatter(input: { title: string; description?: string }) {
  return request<Matter>("/v1/matters", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function fetchMatter(matterId: string) {
  return request<Matter>(`/v1/matters/${matterId}`);
}

export async function fetchDocuments(matterId: string) {
  return request<Document[]>(`/v1/matters/${matterId}/documents`);
}

export async function fetchDocument(documentId: string) {
  return request<Document>(`/v1/documents/${documentId}`);
}

export async function uploadDocument(matterId: string, file: File) {
  const formData = new FormData();
  formData.append("upload", file);

  let response: Response;

  try {
    response = await fetch(`${getApiBase()}/v1/matters/${matterId}/documents`, {
      method: "POST",
      headers: {
        "X-Tenant-ID": TENANT_ID,
      },
      body: formData,
      cache: "no-store",
    });
  } catch (error) {
    throw new Error(`Network request failed for /v1/matters/${matterId}/documents`, { cause: error });
  }

  if (!response.ok) {
    throw await buildRequestError(response, `/v1/matters/${matterId}/documents`);
  }

  return response.json() as Promise<Document>;
}

export async function fetchDeadlines(matterId: string) {
  return request<Deadline[]>(`/v1/matters/${matterId}/deadlines`);
}

export async function fetchResearchRuns(matterId: string) {
  return request<ResearchRun[]>(`/v1/matters/${matterId}/research`);
}

export async function fetchResearchResults(researchRunId: string) {
  return request<ResearchResult[]>(`/v1/research/${researchRunId}/results`);
}

export async function startResearchRun(matterId: string, payload: ResearchRequest) {
  return request<ResearchRun>(`/v1/matters/${matterId}/research`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function fetchDrafts(matterId: string) {
  return request<Draft[]>(`/v1/matters/${matterId}/drafts`);
}

export async function fetchEvidence(matterId: string) {
  return request<EvidenceItem[]>(`/v1/matters/${matterId}/evidence`);
}

export async function sendChatMessage(
  matterId: string,
  query: string,
  history: Array<{ role: string; content: string }> = []
): Promise<ChatMessage> {
  const reply = await request<{ answer: string }>(`/v1/matters/${matterId}/chat`, {
    method: "POST",
    body: JSON.stringify({ query, history })
  });
  return {
    id: crypto.randomUUID(),
    query,
    answer: reply.answer,
    created_at: new Date().toISOString()
  };
}

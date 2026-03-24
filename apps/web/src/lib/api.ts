import { Deadline, Document, Draft, EvidenceItem, Matter, ResearchRequest, ResearchResult, ResearchRun } from "@/lib/types";

const SERVER_API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? "00000000-0000-0000-0000-000000000001";

function getApiBase() {
  if (typeof window !== "undefined") {
    return "/_jurisflow";
  }
  return SERVER_API_BASE;
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
    throw new Error(`Request failed for ${path}`);
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

export async function createSampleMatter() {
  return request<Matter>("/v1/matters/sample", {
    method: "POST"
  });
}

export async function fetchMatter(matterId: string) {
  return request<Matter>(`/v1/matters/${matterId}`);
}

export async function fetchDocuments(matterId: string) {
  return request<Document[]>(`/v1/matters/${matterId}/documents`);
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

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchDeadlines,
  fetchDocuments,
  fetchDrafts,
  fetchEvidence,
  fetchMatter,
  fetchResearchRuns,
} from "@/lib/api";
import type { Deadline, Document, Draft, EvidenceItem, Matter, ResearchRun } from "@/lib/types";

type WorkspaceSnapshot = {
  deadlines: Deadline[];
  documents: Document[];
  drafts: Draft[];
  evidence: EvidenceItem[];
  matter: Matter | null;
  researchRuns: ResearchRun[];
};

const EMPTY_SNAPSHOT: WorkspaceSnapshot = {
  deadlines: [],
  documents: [],
  drafts: [],
  evidence: [],
  matter: null,
  researchRuns: [],
};

const POLL_INTERVAL_MS = 4000;

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Workspace data could not be loaded.";
}

export function useWorkspaceData(matterId: string | null) {
  const [data, setData] = useState<WorkspaceSnapshot>(EMPTY_SNAPSHOT);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const hasLoadedRef = useRef(false);

  const load = useCallback(async () => {
    if (!matterId) {
      hasLoadedRef.current = false;
      setData(EMPTY_SNAPSHOT);
      setError(null);
      setIsLoading(false);
      return;
    }

    if (!hasLoadedRef.current) setIsLoading(true);

    try {
      const [matter, documents, deadlines, researchRuns, drafts, evidence] = await Promise.all([
        fetchMatter(matterId),
        fetchDocuments(matterId),
        fetchDeadlines(matterId),
        fetchResearchRuns(matterId),
        fetchDrafts(matterId),
        fetchEvidence(matterId),
      ]);

      hasLoadedRef.current = true;
      setData({ matter, documents, deadlines, researchRuns, drafts, evidence });
      setError(null);
    } catch (loadError) {
      setError(toErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, [matterId]);

  useEffect(() => {
    void load();
    if (!matterId) return;

    const intervalId = window.setInterval(() => {
      void load();
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [load, matterId]);

  return {
    ...data,
    error,
    isLoading,
    refresh: load,
  };
}

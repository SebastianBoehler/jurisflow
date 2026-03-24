"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { fetchResearchResults, fetchResearchRuns, startResearchRun } from "@/lib/api";
import { ResearchRequest, ResearchResult, ResearchRun } from "@/lib/types";

type UseResearchWorkspaceProps = {
  initialResultsByRun: Record<string, ResearchResult[]>;
  initialRuns: ResearchRun[];
  matterId: string;
};

function sortRuns(runs: ResearchRun[]) {
  return [...runs].sort((left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime());
}

export function useResearchWorkspace({ initialResultsByRun, initialRuns, matterId }: UseResearchWorkspaceProps) {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultsByRun, setResultsByRun] = useState<Record<string, ResearchResult[]>>(initialResultsByRun);
  const [runs, setRuns] = useState<ResearchRun[]>(sortRuns(initialRuns));

  const hasPendingRun = useMemo(() => runs.some((run) => run.status === "queued" || run.status === "processing"), [runs]);

  const refreshRuns = useCallback(async () => {
    try {
      const nextRuns = sortRuns(await fetchResearchRuns(matterId));
      const readyRuns = nextRuns.filter((run) => run.status === "ready");
      const loaded = await Promise.all(
        readyRuns.map(async (run) => [run.id, await fetchResearchResults(run.id).catch(() => resultsByRun[run.id] ?? [])] as const)
      );
      setRuns(nextRuns);
      setResultsByRun((current) => ({ ...current, ...Object.fromEntries(loaded) }));
      setError(null);
    } catch {
      setError("Die Akte konnte nicht aktualisiert werden. Bitte pruefen Sie die Verbindung zur API.");
    }
  }, [matterId, resultsByRun]);

  useEffect(() => {
    if (!hasPendingRun) {
      return;
    }
    void refreshRuns();
    const intervalId = window.setInterval(() => {
      void refreshRuns();
    }, 2000);
    return () => window.clearInterval(intervalId);
  }, [hasPendingRun, refreshRuns]);

  async function submitResearch(payload: ResearchRequest) {
    setIsSubmitting(true);
    setError(null);
    try {
      const run = await startResearchRun(matterId, payload);
      setRuns((current) => sortRuns([...current, run]));
    } catch {
      setError("Der Deep-Research-Lauf konnte nicht gestartet werden.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    error,
    hasPendingRun,
    isSubmitting,
    resultsByRun,
    runs,
    submitResearch
  };
}

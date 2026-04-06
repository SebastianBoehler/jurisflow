"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchMatters } from "@/lib/api";
import type { Matter } from "@/lib/types";

const POLL_INTERVAL_MS = 8000;

function byLastUpdateDesc(left: Matter, right: Matter) {
  return new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime();
}

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Akten konnten nicht geladen werden.";
}

export function useMatters() {
  const [matters, setMatters] = useState<Matter[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const nextMatters = await fetchMatters();
      setMatters([...nextMatters].sort(byLastUpdateDesc));
      setError(null);
    } catch (loadError) {
      setError(toErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const intervalId = window.setInterval(() => {
      void load();
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [load]);

  return {
    error,
    isLoading,
    matters,
    refresh: load,
  };
}

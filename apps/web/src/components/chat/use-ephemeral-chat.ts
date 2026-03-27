"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ChatMessage, getReportContent } from "@/components/chat/chat-types";
import { createMatter, fetchResearchResults, fetchResearchRuns, startResearchRun } from "@/lib/api";
import { ResearchResult, ResearchRun } from "@/lib/types";

const DEFAULT_SOURCES = ["federal_law", "state_law", "case_law", "eu_law", "general_web"];
const POLL_INTERVAL_MS = 1800;
const MAX_POLL_ATTEMPTS = 90;

function createUserMessage(content: string): ChatMessage {
  return { content, id: crypto.randomUUID(), role: "user" };
}

function createAssistantMessage(): ChatMessage {
  return {
    content: "",
    id: crypto.randomUUID(),
    results: [],
    role: "assistant",
    status: "queued",
    summary: "Recherche wird gestartet…",
    trace: [],
  };
}

function toFailedMessage(message: ChatMessage, error: string): ChatMessage {
  if (message.role !== "assistant") {
    return message;
  }

  return {
    ...message,
    error,
    status: "failed",
    summary: error,
  };
}

function toCompletedMessage(message: ChatMessage, run: ResearchRun, results: ResearchResult[]): ChatMessage {
  if (message.role !== "assistant") {
    return message;
  }

  return {
    ...message,
    content: getReportContent(run),
    error: undefined,
    results,
    runId: run.id,
    status: run.status === "failed" ? "failed" : "ready",
    summary: run.summary,
    trace: run.trace,
  };
}

function toProgressMessage(message: ChatMessage, run: ResearchRun): ChatMessage {
  if (message.role !== "assistant") {
    return message;
  }

  return {
    ...message,
    runId: run.id,
    status: run.status === "processing" ? "processing" : "queued",
    summary: run.summary,
    trace: run.trace,
  };
}

export function useEphemeralChat() {
  const matterIdRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const replaceMessage = useCallback((messageId: string, nextValue: (message: ChatMessage) => ChatMessage) => {
    setMessages((current) => current.map((message) => (message.id === messageId ? nextValue(message) : message)));
  }, []);

  const ensureMatter = useCallback(async () => {
    if (matterIdRef.current) {
      return matterIdRef.current;
    }

    const matter = await createMatter({
      description: "Ephemere Recherche aus der Startseite.",
      title: `Recherche ${new Date().toLocaleString("de-DE")}`,
    });

    matterIdRef.current = matter.id;
    return matter.id;
  }, []);

  const pollRun = useCallback(
    async (matterId: string, runId: string, messageId: string, attempt = 0): Promise<void> => {
      if (!mountedRef.current) {
        return;
      }

      if (attempt >= MAX_POLL_ATTEMPTS) {
        replaceMessage(messageId, (message) =>
          toFailedMessage(message, "Die Recherche hat zu lange gedauert. Bitte versuche es erneut.")
        );
        return;
      }

      try {
        const runs = await fetchResearchRuns(matterId);
        const run = runs.find((entry) => entry.id === runId);

        if (!run) {
          window.setTimeout(() => {
            void pollRun(matterId, runId, messageId, attempt + 1);
          }, POLL_INTERVAL_MS);
          return;
        }

        replaceMessage(messageId, (message) => toProgressMessage(message, run));

        if (run.status === "queued" || run.status === "processing") {
          window.setTimeout(() => {
            void pollRun(matterId, runId, messageId, attempt + 1);
          }, POLL_INTERVAL_MS);
          return;
        }

        const results = await fetchResearchResults(run.id).catch(() => []);
        replaceMessage(messageId, (message) => toCompletedMessage(message, run, results));
      } catch (error) {
        replaceMessage(messageId, (message) =>
          toFailedMessage(
            message,
            error instanceof Error ? error.message : "Die Recherche konnte nicht geladen werden."
          )
        );
      }
    },
    [replaceMessage]
  );

  const submit = useCallback(
    async (query: string) => {
      if (!query.trim() || isSubmitting) {
        return;
      }

      setIsSubmitting(true);

      const userMessage = createUserMessage(query);
      const assistantMessage = createAssistantMessage();

      setMessages((current) => [...current, userMessage, assistantMessage]);

      try {
        const matterId = await ensureMatter();
        const run = await startResearchRun(matterId, {
          deep_research: true,
          max_results: 8,
          query,
          sources: DEFAULT_SOURCES,
        });

        replaceMessage(assistantMessage.id, (message) => toProgressMessage(message, run));
        void pollRun(matterId, run.id, assistantMessage.id);
      } catch (error) {
        replaceMessage(assistantMessage.id, (message) =>
          toFailedMessage(message, error instanceof Error ? error.message : "Die Recherche konnte nicht gestartet werden.")
        );
      } finally {
        if (mountedRef.current) {
          setIsSubmitting(false);
        }
      }
    },
    [ensureMatter, isSubmitting, pollRun, replaceMessage]
  );

  return {
    isSubmitting,
    messages,
    submit,
  };
}

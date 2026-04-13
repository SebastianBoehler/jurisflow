"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { mergeStatements } from "@openuidev/react-lang";
import { DEFAULT_CASE_DASHBOARD } from "@/lib/case-ui/default-dashboard";
import { extractCodeOnly, extractText, responseHasCode } from "@/lib/case-ui/response-parser";
import { streamCaseUiChat } from "@/lib/case-ui/stream-chat";
import { appendUserMessage, buildApiMessages } from "@/components/case-ui/message-builders";
import type { CaseUiData, CaseUiMessage } from "@/components/case-ui/types";

type CaseUiContextValue = {
  conversation: CaseUiMessage[];
  dashboardCode: string;
  isStreaming: boolean;
  streamingText: string;
  clearConversation: () => void;
  sendPrompt: (text: string) => void;
};

const CaseUiContext = createContext<CaseUiContextValue | null>(null);

export function useCaseUi() {
  const context = useContext(CaseUiContext);
  if (!context) throw new Error("useCaseUi must be used within CaseUiProvider.");
  return context;
}

export function CaseUiProvider({
  caseKey,
  children,
  data,
}: {
  caseKey: string;
  children: ReactNode;
  data: CaseUiData;
}) {
  const [conversation, setConversation] = useState<CaseUiMessage[]>([]);
  const [dashboardCode, setDashboardCode] = useState(DEFAULT_CASE_DASHBOARD);
  const [hydrated, setHydrated] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const responseRef = useRef("");
  const storageKey = `jurisflow:case-ui:${caseKey}`;

  useEffect(() => {
    const raw = window.localStorage.getItem(storageKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { conversation?: CaseUiMessage[]; dashboardCode?: string };
        setConversation(parsed.conversation ?? []);
        setDashboardCode(parsed.dashboardCode ?? DEFAULT_CASE_DASHBOARD);
      } catch {
        setConversation([]);
        setDashboardCode(DEFAULT_CASE_DASHBOARD);
      }
    } else {
      setConversation([]);
      setDashboardCode(DEFAULT_CASE_DASHBOARD);
    }
    setHydrated(true);
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(storageKey, JSON.stringify({ conversation, dashboardCode }));
  }, [conversation, dashboardCode, hydrated, storageKey]);

  const sendPrompt = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;

      const previousCode = dashboardCode;
      const updatedConversation = appendUserMessage(conversation, trimmed);
      setConversation(updatedConversation);
      setIsStreaming(true);
      setStreamingText("");
      responseRef.current = "";

      const controller = new AbortController();
      abortRef.current = controller;

      await streamCaseUiChat(
        "/api/case-ui/chat",
        buildApiMessages(updatedConversation, previousCode, data),
        (chunk) => {
          responseRef.current += chunk;
          const responseText = responseRef.current;
          const codePatch = extractCodeOnly(responseText);
          setStreamingText(extractText(responseText));
          if (codePatch) setDashboardCode(mergeStatements(previousCode, codePatch));
        },
        () => {
          const responseText = responseRef.current;
          const codePatch = extractCodeOnly(responseText);
          setDashboardCode(codePatch ? mergeStatements(previousCode, codePatch) : previousCode);
          setConversation((current) => [
            ...current,
            {
              role: "assistant",
              content: responseText,
              text: extractText(responseText) || undefined,
              hasCode: responseHasCode(responseText),
            },
          ]);
          setIsStreaming(false);
          setStreamingText("");
        },
        controller.signal,
      );
    },
    [conversation, dashboardCode, data, isStreaming],
  );

  const clearConversation = useCallback(() => {
    abortRef.current?.abort();
    setConversation([]);
    setDashboardCode(DEFAULT_CASE_DASHBOARD);
    setIsStreaming(false);
    setStreamingText("");
    responseRef.current = "";
  }, []);

  const value = useMemo(
    () => ({ clearConversation, conversation, dashboardCode, isStreaming, sendPrompt, streamingText }),
    [clearConversation, conversation, dashboardCode, isStreaming, sendPrompt, streamingText],
  );

  return <CaseUiContext.Provider value={value}>{children}</CaseUiContext.Provider>;
}

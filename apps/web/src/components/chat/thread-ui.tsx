"use client";

import { createContext, useContext } from "react";
import type { PropsWithChildren } from "react";

type ThreadUiContextValue = {
  error: string | null;
  setError: (error: string | null) => void;
};

const ThreadUiContext = createContext<ThreadUiContextValue | null>(null);

export function ThreadUiProvider({
  children,
  value,
}: PropsWithChildren<{ value: ThreadUiContextValue }>) {
  return <ThreadUiContext.Provider value={value}>{children}</ThreadUiContext.Provider>;
}

export function useThreadUi() {
  const context = useContext(ThreadUiContext);
  if (!context) throw new Error("useThreadUi must be used within a ThreadUiProvider.");
  return context;
}

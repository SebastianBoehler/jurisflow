"use client";

import { createContext, useContext } from "react";
import type { PropsWithChildren } from "react";
import type { CaseUiData } from "@/components/case-ui/types";

const CaseUiDataContext = createContext<CaseUiData | null>(null);

export function CaseUiDataProvider({
  children,
  data,
}: PropsWithChildren<{ data: CaseUiData }>) {
  return <CaseUiDataContext.Provider value={data}>{children}</CaseUiDataContext.Provider>;
}

export function useCaseUiData() {
  const context = useContext(CaseUiDataContext);
  if (!context) throw new Error("useCaseUiData must be used within CaseUiDataProvider.");
  return context;
}

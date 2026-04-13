"use client";

import "@openuidev/react-ui/components.css";
import { CaseUiCanvas } from "@/components/case-ui/case-ui-canvas";
import { CaseUiConversation } from "@/components/case-ui/case-ui-conversation";
import { CaseUiDataProvider } from "@/components/case-ui/case-ui-data-context";
import { CaseUiProvider } from "@/components/case-ui/case-ui-context";
import type { CaseUiData } from "@/components/case-ui/types";

export function CaseUiWorkbench({
  caseKey,
  data,
}: {
  caseKey: string;
  data: CaseUiData;
}) {
  return (
    <CaseUiDataProvider data={data}>
      <CaseUiProvider caseKey={caseKey} data={data}>
        <div className="grid h-full min-h-0 overflow-hidden rounded-[2rem] border border-border/70 bg-background/88 shadow-[0_28px_80px_rgba(15,23,42,0.08)] xl:grid-cols-[24rem_minmax(0,1fr)]">
          <div className="min-h-0 border-b border-border/70 xl:border-b-0 xl:border-r">
            <CaseUiConversation />
          </div>
          <CaseUiCanvas />
        </div>
      </CaseUiProvider>
    </CaseUiDataProvider>
  );
}

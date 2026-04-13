"use client";

import { Renderer } from "@openuidev/react-lang";
import { ThemeProvider } from "@openuidev/react-ui";
import { jurisflowOpenUiLibrary } from "@/lib/case-ui/library";
import { useCaseUi } from "@/components/case-ui/case-ui-context";

export function CaseUiCanvas() {
  const { dashboardCode, isStreaming, sendPrompt } = useCaseUi();

  return (
    <div className="openui-jurisflow-theme flex min-h-[28rem] flex-col bg-background xl:min-h-[calc(100svh-12rem)]">
      <div className="flex-1 overflow-auto px-4 py-4 sm:px-6">
        <ThemeProvider cssSelector=".openui-jurisflow-theme" mode="light">
          <Renderer
            isStreaming={isStreaming}
            library={jurisflowOpenUiLibrary}
            onAction={(event) => {
              if (event.type !== "continue_conversation") return;
              const contextText = typeof event.params?.context === "string" ? event.params.context : event.humanFriendlyMessage;
              if (contextText) sendPrompt(contextText);
            }}
            queryLoader={<div className="mb-4 text-xs text-muted-foreground">Lade Aktenkontext...</div>}
            response={dashboardCode}
          />
        </ThemeProvider>
      </div>
    </div>
  );
}

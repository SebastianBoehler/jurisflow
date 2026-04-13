"use client";

import { FormEvent } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { MarkDownRenderer } from "@openuidev/react-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useCaseUi } from "@/components/case-ui/case-ui-context";

const STARTERS = [
  { label: "Fallübersicht", prompt: "Baue eine klare Fallübersicht mit Dokumenten, Research und offenen Fristen." },
  { label: "Recherche-Fokus", prompt: "Fokussiere das Dashboard auf Research-Läufe, Quellen und Belege." },
  { label: "Fristen prüfen", prompt: "Zeige mir Fristen, Entwürfe und nächste Arbeitsschritte für diese Akte." },
];

export function CaseUiConversation() {
  const { clearConversation, conversation, isStreaming, sendPrompt, streamingText } = useCaseUi();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const nextPrompt = String(formData.get("prompt") ?? "").trim();
    if (!nextPrompt) return;
    sendPrompt(nextPrompt);
    form.reset();
  }

  return (
    <div className="flex h-full min-h-[28rem] flex-col overflow-hidden bg-background/95 backdrop-blur xl:min-h-0">
      <div className="flex shrink-0 items-center justify-between border-b border-border/70 px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          <span className="text-sm font-medium">Case Chat</span>
        </div>
        <Button onClick={clearConversation} size="sm" type="button" variant="ghost">Reset</Button>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {conversation.length === 0 ? (
          <div className="space-y-4 rounded-[1.35rem] border border-dashed border-border/70 bg-muted/20 p-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Starter</p>
              <p className="mt-1 text-sm font-medium">Start from the case canvas</p>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              Ask the agent to reshape the case interface. The canvas starts with a live matter overview and can pull up legal components.
            </p>
            <div className="flex flex-wrap gap-2">
              {STARTERS.map((starter) => (
                <Button key={starter.label} disabled={isStreaming} onClick={() => sendPrompt(starter.prompt)} size="sm" type="button" variant="outline">
                  {starter.label}
                </Button>
              ))}
            </div>
          </div>
        ) : null}

        {conversation.map((message, index) => (
          <div key={`${message.role}-${index}`} className={message.role === "user" ? "ml-8 rounded-[1.2rem] bg-primary/10 px-4 py-3 text-sm text-primary" : "space-y-3 rounded-[1.2rem] border border-border/70 bg-background px-4 py-3 text-sm"}>
            {message.role === "assistant" ? (
              <>
                {message.text ? <MarkDownRenderer textMarkdown={message.text} /> : null}
                {message.hasCode ? <Badge variant="secondary">Canvas updated</Badge> : null}
              </>
            ) : (
              <p>{message.content}</p>
            )}
          </div>
        ))}

        {isStreaming ? (
          <div className="space-y-3 rounded-[1.2rem] border border-border/70 bg-background px-4 py-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Thinking...
            </div>
            {streamingText ? <MarkDownRenderer textMarkdown={streamingText} /> : null}
          </div>
        ) : null}
      </div>

      <form className="shrink-0 border-t border-border/70 bg-background/95 px-4 py-4" onSubmit={handleSubmit}>
        <div className="flex gap-2">
          <Input disabled={isStreaming} name="prompt" placeholder="Ask the case interface to refocus itself..." />
          <Button disabled={isStreaming} type="submit">Send</Button>
        </div>
      </form>
    </div>
  );
}

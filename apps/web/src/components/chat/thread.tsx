"use client";

import { useRef, useState } from "react";
import { Globe, Scale, ArrowUp, Microscope, Plus, Loader2 } from "lucide-react";
import {
  ThreadPrimitive,
  AssistantRuntimeProvider,
  useThreadRuntime,
} from "@assistant-ui/react";
import { AssistantMessage, UserMessage } from "@/components/chat/chat-messages";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { waitForDocumentProcessing } from "@/components/chat/document-upload";
import { STARTER_PROMPTS } from "@/components/chat/starter-prompts";
import {
  useChatRuntime,
  type ChatMode,
  type UploadedDocumentState,
} from "@/components/chat/use-chat-runtime";

const DEFAULT_MODE: ChatMode = {
  deepResearch: false,
  sources: ["federal_law", "state_law", "case_law", "eu_law", "general_web"],
};

const ALL_SOURCES = [
  { id: "federal_law", label: "Bundesrecht" },
  { id: "state_law", label: "Landesrecht" },
  { id: "case_law", label: "Rechtsprechung" },
  { id: "eu_law", label: "EU-Recht" },
  { id: "general_web", label: "Web" },
];

// ----------- Composer (inside AssistantRuntimeProvider) -----------
function ChatComposer({
  mode,
  onModeChange,
  onUpload,
}: {
  mode: ChatMode;
  onModeChange: (m: ChatMode) => void;
  onUpload: (file: File) => Promise<UploadedDocumentState>;
}) {
  const [value, setValue] = useState("");
  const [uploadState, setUploadState] = useState<{
    filename: string;
    status: "idle" | "uploading" | "ready" | "failed";
    detail?: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const thread = useThreadRuntime();
  const isRunning = thread.getState().isRunning;

  function handleSubmit() {
    const trimmed = value.trim();
    if (!trimmed || isRunning) return;
    setValue("");
    void thread.append({ role: "user", content: [{ type: "text", text: trimmed }] });
  }

  function toggleSource(id: string) {
    const next = mode.sources.includes(id)
      ? mode.sources.filter((s) => s !== id)
      : [...mode.sources, id];
    onModeChange({ ...mode, sources: next.length ? next : [id] });
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploadState({ filename: file.name, status: "uploading", detail: "Wird hochgeladen…" });

    try {
      const uploaded = await onUpload(file);
      const immediateState = {
        filename: uploaded.title,
        status: uploaded.processing_status === "ready" ? "ready" : "uploading",
        detail:
          uploaded.processing_status === "ready"
            ? "Dokument ist verfuegbar."
            : "Dokument wurde hochgeladen und wird verarbeitet.",
      } as const;
      setUploadState(immediateState);

      if (uploaded.processing_status !== "ready" && uploaded.processing_status !== "failed") {
        const processed = await waitForDocumentProcessing(uploaded.id);
        setUploadState({
          filename: processed.title,
          status: processed.processing_status === "ready" ? "ready" : "failed",
          detail:
            processed.processing_status === "ready"
              ? "Dokument ist verfuegbar."
              : processed.summary ?? "Dokumentenverarbeitung fehlgeschlagen.",
        });
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Upload fehlgeschlagen.";
      setUploadState({ filename: file.name, status: "failed", detail });
    }
  }

  return (
    <div className="rounded-[28px] border border-border bg-background shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
      <div className="px-5 pt-4 pb-3">
        <textarea
          className="w-full resize-none border-0 bg-transparent text-base leading-7 outline-none placeholder:text-muted-foreground"
          disabled={isRunning}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
          }}
          placeholder="Stelle eine juristische Frage oder beschreibe deinen Fall…"
          rows={2}
          value={value}
        />
      </div>
      <div className="flex items-center gap-2 border-t border-border px-4 py-3">
        <input
          ref={fileInputRef}
          accept=".pdf,.doc,.docx,.txt,.eml,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,message/rfc822"
          className="hidden"
          onChange={handleFileChange}
          type="file"
        />
        <button
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:border-foreground/20 hover:text-foreground"
          type="button"
          aria-label="Anhang hinzufügen"
          disabled={uploadState?.status === "uploading"}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploadState?.status === "uploading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        </button>

        {uploadState ? (
          <div
            className={cn(
              "max-w-[14rem] truncate rounded-full px-3 py-1.5 text-xs",
              uploadState.status === "failed"
                ? "bg-red-50 text-red-700"
                : uploadState.status === "ready"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-muted text-muted-foreground",
            )}
            title={uploadState.detail}
          >
            {uploadState.filename}
          </div>
        ) : null}

        <button
          className={cn(
            "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition",
            mode.deepResearch
              ? "border-foreground bg-foreground text-background"
              : "border-border text-muted-foreground hover:border-foreground/20 hover:text-foreground"
          )}
          onClick={() => onModeChange({ ...mode, deepResearch: !mode.deepResearch })}
          type="button"
        >
          <Microscope className="h-3.5 w-3.5" />
          Deep Research
        </button>

        {mode.deepResearch && (
          <Popover>
            <PopoverTrigger asChild>
              <button
                className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-foreground/20 hover:text-foreground"
                type="button"
              >
                <Globe className="h-3.5 w-3.5" />
                Quellen
                {mode.sources.length < ALL_SOURCES.length && (
                  <span className="ml-1 rounded-full bg-foreground px-1.5 py-0.5 text-[10px] leading-none text-background">
                    {mode.sources.length}
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="start">
              <p className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Quellen</p>
              {ALL_SOURCES.map((src) => (
                <button
                  key={src.id}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition hover:bg-muted",
                    mode.sources.includes(src.id) ? "text-foreground" : "text-muted-foreground"
                  )}
                  onClick={() => toggleSource(src.id)}
                  type="button"
                >
                  <span className={cn(
                    "flex h-4 w-4 items-center justify-center rounded border text-[10px]",
                    mode.sources.includes(src.id) ? "border-foreground bg-foreground text-background" : "border-border"
                  )}>
                    {mode.sources.includes(src.id) && "✓"}
                  </span>
                  {src.label}
                </button>
              ))}
            </PopoverContent>
          </Popover>
        )}

        <div className="flex-1" />

        <Button
          className="h-9 w-9 rounded-full p-0"
          disabled={isRunning || uploadState?.status === "uploading" || !value.trim()}
          onClick={handleSubmit}
          size="icon"
          type="button"
        >
          {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

// ----------- Empty state starter prompts -----------
function EmptyState() {
  const thread = useThreadRuntime();

  function handlePrompt(prompt: string) {
    void thread.append({ role: "user", content: [{ type: "text", text: prompt }] });
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center pb-40 pt-12 text-center">
      <div className="max-w-2xl">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-muted-foreground">
          Ein Fenster. Eine Frage.
        </p>
        <h2 className="mt-5 text-5xl font-semibold tracking-[-0.06em] text-foreground">
          Rechtliche Recherche ohne Dashboard.
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-muted-foreground">
          Die Unterhaltung startet mit deiner ersten Frage und verschwindet beim Neuladen.
        </p>
      </div>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        {STARTER_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            className="rounded-full border border-border bg-card px-4 py-2.5 text-sm text-foreground transition hover:border-foreground/20 hover:bg-muted"
            onClick={() => handlePrompt(prompt)}
            type="button"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}

// ----------- Root Thread component -----------
export function Thread() {
  const [mode, setMode] = useState<ChatMode>(DEFAULT_MODE);
  const { runtime, uploadDocument } = useChatRuntime(mode);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-5 sm:px-8">
        {/* Header */}
        <header className="flex items-center justify-between py-6">
          <div>
            <p className="text-sm font-medium tracking-[0.18em] text-muted-foreground">JURISFLOW</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-foreground">
              Juristische Recherche
            </h1>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-border px-3 py-2 text-sm text-muted-foreground sm:flex">
            <Scale className="h-4 w-4" />
            KI-Assistent
          </div>
        </header>

        {/* Thread */}
        <ThreadPrimitive.Root className="flex flex-1 flex-col">
          <ThreadPrimitive.Viewport className="flex flex-1 flex-col">
            <ThreadPrimitive.If empty>
              <EmptyState />
            </ThreadPrimitive.If>
            <ThreadPrimitive.If empty={false}>
              <div className="flex-1 space-y-6 pb-40 pt-6">
                <ThreadPrimitive.Messages
                  components={{ UserMessage, AssistantMessage }}
                />
              </div>
            </ThreadPrimitive.If>
          </ThreadPrimitive.Viewport>

          {/* Sticky composer */}
          <div className="sticky bottom-0 bg-gradient-to-t from-background via-background to-transparent pb-6 pt-4">
            <ChatComposer mode={mode} onModeChange={setMode} onUpload={uploadDocument} />
          </div>
        </ThreadPrimitive.Root>
      </div>
    </AssistantRuntimeProvider>
  );
}

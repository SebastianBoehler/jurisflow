"use client";

import { ComposerPrimitive, useAui, useAuiState } from "@assistant-ui/react";
import { BookOpen, Globe, Scale, Search, SendHorizontal, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const SOURCE_OPTIONS = [
  { value: "federal_law", label: "Bundesrecht", icon: Scale },
  { value: "state_law", label: "Landesrecht", icon: Scale },
  { value: "case_law", label: "Rechtsprechung", icon: Search },
  { value: "eu_law", label: "EU-Recht", icon: Scale },
  { value: "internal_docs", label: "Akte", icon: BookOpen },
  { value: "general_web", label: "Web-Recherche", icon: Globe },
] as const;

export const DEFAULT_RESEARCH_SOURCES = SOURCE_OPTIONS.filter((option) => option.value !== "general_web").map((option) => option.value);

export type ResearchComposerOptions = {
  deepResearch: boolean;
  focus: string;
  maxResults: number;
  sources: string[];
};

type ResearchComposerProps = {
  error: string | null;
  isSubmitting: boolean;
  onOptionsChange: (next: ResearchComposerOptions) => void;
  options: ResearchComposerOptions;
  suggestions: string[];
};

export function ResearchComposer({
  error,
  isSubmitting,
  onOptionsChange,
  options,
  suggestions,
}: ResearchComposerProps) {
  const aui = useAui();
  const composerText = useAuiState((state) => state.composer.text);

  function setOptions(patch: Partial<ResearchComposerOptions>) {
    onOptionsChange({ ...options, ...patch });
  }

  function toggleSource(source: string) {
    const nextSources = options.sources.includes(source)
      ? options.sources.filter((value) => value !== source)
      : [...options.sources, source];
    const officialSources = nextSources.filter((value) => value !== "general_web");
    if (!officialSources.length) return;
    setOptions({ sources: nextSources });
  }

  return (
    <div className="surface-panel rounded-[28px] p-4 shadow-sm">
      <div className="flex flex-col gap-4">
        {!composerText && suggestions.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <button
                className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
                key={suggestion}
                onClick={() => aui.composer().setText(suggestion)}
                type="button"
              >
                {suggestion}
              </button>
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-full border border-border bg-muted/70 p-1">
            {[
              { active: !options.deepResearch, label: "Chat" },
              { active: options.deepResearch, label: "Deep Research" },
            ].map((item) => (
              <button
                className={cn(
                  "rounded-full px-4 py-2 text-sm transition-colors",
                  item.active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                )}
                key={item.label}
                onClick={() => setOptions({ deepResearch: item.label === "Deep Research" })}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {SOURCE_OPTIONS.map(({ value, label, icon: Icon }) => (
              <button
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors",
                  options.sources.includes(value)
                    ? "border-primary/20 bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:text-foreground"
                )}
                key={value}
                onClick={() => toggleSource(value)}
                type="button"
              >
                <Icon className="size-3" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_180px]">
          <Input
            onChange={(event) => setOptions({ focus: event.target.value })}
            placeholder="Optionaler Fokus, z. B. Normen, Fristen, Verteidigungslinie"
            value={options.focus}
          />
          <select
            className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none"
            onChange={(event) => setOptions({ maxResults: Number(event.target.value) })}
            value={options.maxResults}
          >
            {[6, 8, 10, 12].map((value) => (
              <option key={value} value={value}>
                {value} Quellen
              </option>
            ))}
          </select>
        </div>

        <ComposerPrimitive.Root className="flex items-end gap-3">
          <ComposerPrimitive.Input
            className={cn(
              "flex min-h-28 w-full flex-1 resize-none rounded-2xl border border-input border-border bg-background px-4 py-3 text-base leading-7 shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            )}
            maxRows={12}
            minRows={4}
            placeholder="Stelle eine Rechtsfrage, starte Deep Research oder lass einen belastbaren Report mit Zitaten erzeugen."
            submitMode="enter"
          />
          <ComposerPrimitive.Send asChild>
            <Button
              className="size-12 shrink-0 rounded-2xl"
              disabled={isSubmitting}
              variant={options.deepResearch ? "ember" : "outline"}
            >
              {options.deepResearch ? <Sparkles data-icon="inline-start" /> : <SendHorizontal data-icon="inline-start" />}
            </Button>
          </ComposerPrimitive.Send>
        </ComposerPrimitive.Root>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
    </div>
  );
}

"use client";

import { KeyboardEvent, useState } from "react";
import { BookOpen, ChevronDown, Globe, SendHorizontal, Sparkles, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Textarea } from "@/components/ui/textarea";
import { Document, ResearchRequest } from "@/lib/types";
import { cn } from "@/lib/utils";

const DEFAULT_SOURCES = ["federal_law", "state_law", "case_law", "eu_law", "internal_docs"];
const SOURCE_OPTIONS = [
  { value: "federal_law", label: "Bundesrecht" },
  { value: "state_law", label: "Landesrecht" },
  { value: "case_law", label: "Rechtsprechung" },
  { value: "eu_law", label: "EU-Recht" },
  { value: "internal_docs", label: "Akte" },
  { value: "general_web", label: "Web-Recherche" }
] as const;

type ChatInputBarProps = {
  documents: Document[];
  error: string | null;
  isSubmitting: boolean;
  matterTitle: string;
  onSubmit: (payload: ResearchRequest) => void;
  suggestions: string[];
};

export function ChatInputBar({ documents, error, isSubmitting, matterTitle, onSubmit, suggestions }: ChatInputBarProps) {
  const [query, setQuery] = useState("");
  const [focus, setFocus] = useState("");
  const [sources, setSources] = useState<string[]>(DEFAULT_SOURCES);
  const [maxResults, setMaxResults] = useState(8);
  const [deepResearch, setDeepResearch] = useState(true);
  const [showOptions, setShowOptions] = useState(false);

  function toggleSource(source: string) {
    setSources((curr) => {
      const next = curr.includes(source) ? curr.filter((s) => s !== source) : [...curr, source];
      const official = next.filter((value) => value !== "general_web");
      return official.length ? next : curr;
    });
  }

  function handleSubmit() {
    if (!query.trim() || !sources.length || isSubmitting) return;
    onSubmit({
      deep_research: deepResearch,
      focus: focus.trim() || null,
      max_results: maxResults,
      query: query.trim(),
      sources
    });
    setQuery("");
    setFocus("");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  const canSubmit = query.trim().length > 0 && sources.length > 0 && !isSubmitting;

  return (
    <div className="border-t border-border bg-background/95 backdrop-blur-sm px-4 py-3 space-y-2">
      {/* Suggestion chips */}
      {!query && suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pb-1">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => setQuery(s)}
              className="rounded-full border border-border bg-muted/50 px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-ember/30 hover:bg-muted hover:text-foreground"
            >
              {s.length > 72 ? s.slice(0, 72) + "…" : s}
            </button>
          ))}
        </div>
      )}

      {/* Source toggles + options row */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => setDeepResearch((v) => !v)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            deepResearch
              ? "border-ember/30 bg-ember/10 text-ember"
              : "border-border bg-transparent text-muted-foreground hover:bg-muted"
          )}
        >
          <Sparkles className="h-3 w-3" />
          Deep Research
        </button>

        {SOURCE_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => toggleSource(value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors",
              sources.includes(value)
                ? "border-charcoal/20 bg-charcoal text-paper"
                : "border-border bg-transparent text-muted-foreground hover:bg-muted"
            )}
          >
            {value === "internal_docs" && <BookOpen className="h-3 w-3" />}
            {value === "general_web" && <Globe className="h-3 w-3" />}
            {label}
          </button>
        ))}

        <CollapsibleTrigger asChild onClick={() => setShowOptions((v) => !v)}>
          <button className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            Optionen
            <ChevronDown className={cn("h-3 w-3 transition-transform", showOptions && "rotate-180")} />
          </button>
        </CollapsibleTrigger>
      </div>

      {/* Expandable options */}
      {showOptions && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
          <input
            className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/60"
            placeholder="Optionaler Fokus, z. B. Einwendungen, Beweislast..."
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
          />
          <select
            className="h-6 bg-transparent text-xs text-muted-foreground outline-none"
            value={maxResults}
            onChange={(e) => setMaxResults(Number(e.target.value))}
          >
            {[5, 8, 10, 12].map((v) => (
              <option key={v} value={v}>{v} Treffer</option>
            ))}
          </select>
        </div>
      )}

      {/* Main input */}
      <div className="flex items-end gap-2">
        <Textarea
          className="min-h-[2.75rem] max-h-40 flex-1 resize-none rounded-xl border-border bg-background text-sm leading-7 py-2.5"
          placeholder={`Frage an die Akte ${matterTitle}... (Enter zum Senden)`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
        />
        <Button
          variant={canSubmit ? "ember" : "outline"}
          size="icon"
          className="h-[2.75rem] w-[2.75rem] shrink-0 rounded-xl"
          onClick={handleSubmit}
          disabled={!canSubmit}
        >
          <SendHorizontal className="h-4 w-4" />
        </Button>
      </div>

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}

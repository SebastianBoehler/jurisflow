"use client";

import { FilterIcon, PaperclipIcon, SparklesIcon } from "lucide-react";
import { KeyboardEvent, useState } from "react";

import { Attachments } from "@/components/ai/attachments";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Badge } from "@/components/ui/badge";
import { Document, ResearchRequest } from "@/lib/types";

const DEFAULT_SOURCES = ["federal_law", "case_law", "eu_law", "internal_docs"];

type ResearchComposerProps = {
  documents: Document[];
  error: string | null;
  isSubmitting: boolean;
  matterTitle: string;
  onSubmit: (payload: ResearchRequest) => void;
  suggestions: string[];
};

export function ResearchComposer({ documents, error, isSubmitting, matterTitle, onSubmit, suggestions }: ResearchComposerProps) {
  const [query, setQuery] = useState("Kaufpreisforderung nach 433 BGB und Einwendungen wegen behaupteter Maengel");
  const [focus, setFocus] = useState("Anspruchsgrundlagen, Einwendungen, Fristen und belastbare Belegstellen");
  const [sources, setSources] = useState<string[]>(DEFAULT_SOURCES);
  const [maxResults, setMaxResults] = useState(8);
  const [deepResearch, setDeepResearch] = useState(true);

  function toggleSource(source: string) {
    setSources((current) => (current.includes(source) ? current.filter((item) => item !== source) : [...current, source]));
  }

  function handleSubmit() {
    if (!query.trim() || !sources.length) {
      return;
    }
    onSubmit({
      deep_research: deepResearch,
      focus: focus.trim() || null,
      max_results: maxResults,
      query: query.trim(),
      sources
    });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }
    event.preventDefault();
    handleSubmit();
  }

  const attachmentItems = documents.map((document) => ({
    id: document.id,
    filename: document.title,
    mediaType: document.kind === "email" ? "message/rfc822" : "text/plain",
    type: "file" as const
  }));

  return (
    <div className="surface-panel rounded-[34px] p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="section-label text-ink/42">Frage an die Akte</div>
          <div className="max-w-2xl text-sm leading-7 text-ink/66">
            Stellen Sie eine Frage zur Sache, zu Belegen, Fristen oder zur Argumentationslinie. Wenn das Tag aktiv ist, startet dieselbe Eingabe einen tieferen ADK-Research-Lauf.
          </div>
        </div>
        <Badge variant="outline">{matterTitle}</Badge>
      </div>

      {documents.length ? (
        <div className="mb-4 flex items-start gap-2">
          <PaperclipIcon className="mt-2 h-4 w-4 text-ink/38" />
          <Attachments items={attachmentItems.slice(0, 4)} />
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          aria-pressed={deepResearch}
          className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
            deepResearch ? "border-ember/20 bg-ember/12 text-charcoal" : "border-charcoal/10 bg-white text-ink/66 hover:bg-charcoal/5"
          }`}
          onClick={() => setDeepResearch((current) => !current)}
          type="button"
        >
          <SparklesIcon className="h-4 w-4 text-ember" />
          Deep Research via ADK
        </button>
        {[
          ["federal_law", "Bundesrecht"],
          ["case_law", "Rechtsprechung"],
          ["eu_law", "EU-Recht"],
          ["internal_docs", "Akte"]
        ].map(([source, label]) => (
          <button
            aria-pressed={sources.includes(source)}
            key={source}
            onClick={() => toggleSource(source)}
            className={`rounded-full border px-4 py-2 text-sm transition ${
              sources.includes(source)
                ? "border-charcoal/12 bg-charcoal text-paper"
                : "border-charcoal/10 bg-white text-ink/60 hover:bg-charcoal/5"
            }`}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>

      <textarea
        className="min-h-32 w-full rounded-[28px] border border-charcoal/10 bg-white px-5 py-4 text-sm leading-7 text-charcoal placeholder:text-ink/34"
        onKeyDown={handleKeyDown}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Zum Beispiel: Welche Anspruchsgrundlagen tragen die Kaufpreisforderung und welche Einwendungen sind belastbar?"
        value={query}
      />

      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto]">
        <input
          className="w-full rounded-[22px] border border-charcoal/10 bg-white px-4 py-3 text-sm text-charcoal placeholder:text-ink/34"
          onChange={(event) => setFocus(event.target.value)}
          placeholder="Optionaler Fokus, z. B. Einwendungen, Beweislast oder naechster Schriftsatzschritt"
          value={focus}
        />

        <div className="flex items-center gap-2 rounded-[22px] border border-charcoal/10 bg-white px-3">
          <FilterIcon className="h-4 w-4 text-ink/38" />
          <select
            className="h-11 bg-transparent pr-3 text-sm text-charcoal outline-none"
            onChange={(event) => setMaxResults(Number(event.target.value))}
            value={maxResults}
          >
            {[5, 8, 10, 12].map((value) => (
              <option key={value} value={value}>
                {value} Treffer
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <ShimmerButton disabled={isSubmitting || !query.trim() || !sources.length} onClick={handleSubmit} type="button">
          {isSubmitting ? "Antwort wird vorbereitet..." : "Frage senden"}
        </ShimmerButton>
        <Badge variant="outline">{deepResearch ? `Deep Research aktiv / ${maxResults} Fundstellen` : `Schnelle Antwort / ${maxResults} Fundstellen`}</Badge>
        <p className="text-sm text-ink/52">Enter zum Senden, Shift+Enter fuer Zeilenumbruch.</p>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
      </div>

      <div className="mt-5 border-t border-charcoal/10 pt-4">
        <p className="section-label text-ink/34">Vorschlaege</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {suggestions.map((suggestion) => (
            <button
              className="rounded-full border border-charcoal/10 bg-white px-4 py-2 text-sm text-ink/68 transition hover:bg-charcoal/5"
              key={suggestion}
              onClick={() => setQuery(suggestion)}
              type="button"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

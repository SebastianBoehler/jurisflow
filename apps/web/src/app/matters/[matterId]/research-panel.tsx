"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { startResearchRun } from "@/lib/api";

const DEFAULT_SOURCES = ["federal_law", "case_law", "eu_law", "internal_docs"];

type ResearchPanelProps = {
  matterId: string;
};

export function ResearchPanel({ matterId }: ResearchPanelProps) {
  const router = useRouter();
  const [query, setQuery] = useState("Kaufpreisforderung nach 433 BGB und Einwendungen wegen behaupteter Maengel");
  const [focus, setFocus] = useState("Anspruchsgrundlagen, Einwendungen, Fristen und geeignete Belegstellen");
  const [maxResults, setMaxResults] = useState(8);
  const [deepResearch, setDeepResearch] = useState(true);
  const [sources, setSources] = useState<string[]>(DEFAULT_SOURCES);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleSource(source: string) {
    setSources((current) => (current.includes(source) ? current.filter((item) => item !== source) : [...current, source]));
  }

  async function handleSubmit() {
    if (!query.trim()) {
      setError("Bitte eine Suchanfrage eingeben.");
      return;
    }
    if (!sources.length) {
      setError("Bitte mindestens eine Quelle auswaehlen.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await startResearchRun(matterId, {
        query: query.trim(),
        focus: focus.trim() || null,
        sources,
        max_results: maxResults,
        deep_research: deepResearch
      });
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setError("Der Recherchelauf konnte nicht gestartet werden.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-fog bg-fog/40 p-4">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">Deep Research starten</h3>
        <p className="text-sm text-ink/70">
          Die Recherche durchsucht parallel Bundesrecht, Rechtsprechung, EU-Recht und interne Akteninhalte.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-ink" htmlFor="research-query">
          Suchanfrage
        </label>
        <textarea
          id="research-query"
          className="min-h-28 w-full rounded-2xl border border-fog bg-white px-4 py-3 text-sm outline-none ring-0"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-ink" htmlFor="research-focus">
          Fokus
        </label>
        <input
          id="research-focus"
          className="w-full rounded-2xl border border-fog bg-white px-4 py-3 text-sm outline-none ring-0"
          value={focus}
          onChange={(event) => setFocus(event.target.value)}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_auto]">
        <div className="space-y-2">
          <div className="text-sm font-medium text-ink">Quellen</div>
          <div className="flex flex-wrap gap-2">
            {[
              ["federal_law", "Bundesrecht"],
              ["case_law", "Rechtsprechung"],
              ["eu_law", "EU-Recht"],
              ["internal_docs", "Interne Dokumente"]
            ].map(([source, label]) => {
              const active = sources.includes(source);
              return (
                <button
                  key={source}
                  type="button"
                  className={`rounded-full border px-3 py-2 text-sm transition ${
                    active ? "border-clay bg-clay text-white" : "border-fog bg-white text-ink"
                  }`}
                  onClick={() => toggleSource(source)}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={deepResearch} onChange={(event) => setDeepResearch(event.target.checked)} />
            Deep Research
          </label>
          <label className="flex items-center gap-3 text-sm text-ink">
            <span>Max. Treffer</span>
            <select
              className="rounded-xl border border-fog bg-white px-3 py-2"
              value={maxResults}
              onChange={(event) => setMaxResults(Number(event.target.value))}
            >
              {[5, 8, 10, 12].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? "Recherche startet..." : "Recherche starten"}
        </Button>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
      </div>
    </div>
  );
}

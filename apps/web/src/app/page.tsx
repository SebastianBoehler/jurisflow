import Link from "next/link";
import { ArrowUpRight, Files, Scale, Search } from "lucide-react";

import { HomeActions } from "@/app/home-actions";
import { createSampleMatter, fetchMatters } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { formatRelativeRunTime, formatStatusLabel } from "@/lib/formatting";
import { Matter } from "@/lib/types";

const SAMPLE_TITLE = "Musterakte Kaufvertrag";

function orderMatters(matters: Matter[]) {
  return [...matters].sort((left, right) => {
    if (left.title === SAMPLE_TITLE && right.title !== SAMPLE_TITLE) {
      return -1;
    }
    if (left.title !== SAMPLE_TITLE && right.title === SAMPLE_TITLE) {
      return 1;
    }
    return new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime();
  });
}

async function loadMatters() {
  const matters = await fetchMatters().catch(() => []);
  const existingSample = matters.find((matter) => matter.title === SAMPLE_TITLE);
  if (existingSample) {
    return orderMatters(matters);
  }

  const sampleMatter = await createSampleMatter().catch(() => null);
  if (!sampleMatter) {
    return orderMatters(matters);
  }

  return orderMatters([sampleMatter, ...matters]);
}

const STUDIO_POINTS = [
  {
    label: "Dokumente",
    copy: "Import, OCR und strukturierte Einordnung bleiben direkt an der Akte verankert."
  },
  {
    label: "Recherche",
    copy: "Bundesrecht, Rechtsprechung, EU-Recht und interne Quellen werden als ein Arbeitsraum gelesen."
  },
  {
    label: "Entwurf",
    copy: "Schriftsaetze, Memos und Anlagen entstehen aus derselben nachvollziehbaren Spur."
  }
];

const FEATURE_COLUMNS = [
  {
    icon: Files,
    kicker: "01",
    title: "Akte als primaere Oberflaeche",
    copy: "Nicht Tool zuerst, nicht Chat zuerst. Jeder Schritt bleibt an der Akte, an Fristen und an Belegen verankert."
  },
  {
    icon: Search,
    kicker: "02",
    title: "Recherche mit sichtbarer Herleitung",
    copy: "Agent Trace, Begruendung und Fundstellen bleiben lesbar, damit juristische Arbeit auditierbar bleibt."
  },
  {
    icon: Scale,
    kicker: "03",
    title: "Vom Material zum Schriftsatz",
    copy: "Die Arbeitsoberflaeche verbindet Quelle, Argument und Artefakt ohne Medienbruch."
  }
];

export default async function HomePage() {
  const matters = await loadMatters();
  const sampleMatter = matters.find((matter) => matter.title === SAMPLE_TITLE) ?? null;

  return (
    <main className="pb-16">
      <section className="w-full px-0">
        <div className="surface-panel-dark overflow-hidden rounded-none text-paper">
          <div className="grid min-h-screen gap-8 lg:grid-cols-[minmax(0,1.05fr)_34rem]">
            <div className="flex flex-col justify-between gap-12 px-6 py-6 sm:px-8 sm:py-8 lg:px-12 lg:py-10 xl:px-16">
              <div className="fade-up space-y-12">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="section-label text-white/42">Jurisflow</p>
                    <p className="mt-2 max-w-sm text-sm text-white/58">Aktezentrierter KI-Arbeitsraum fuer deutsche Kanzleien.</p>
                  </div>
                  <Badge className="border-white/12 bg-white/8 text-white">Fuer den deutschen Rechtsmarkt</Badge>
                </div>

                <div className="space-y-6">
                  <h1 className="max-w-[7ch] font-serif text-[clamp(4.4rem,11vw,8.5rem)] leading-[0.9] tracking-[-0.05em]">
                    Jurisflow
                  </h1>
                  <p className="max-w-2xl text-lg leading-8 text-white/72 sm:text-xl">
                    Ein neuer Ausgangspunkt fuer juristische Arbeit: Akte, Recherche, Entwurf und Anlagenfuehrung in einem ruhigen, nachvollziehbaren Arbeitsraum.
                  </p>
                </div>

                <HomeActions />
              </div>

              <div className="fade-up fade-up-delay-1 grid gap-6 border-t border-white/10 pt-6 md:grid-cols-3">
                {STUDIO_POINTS.map((item) => (
                  <div key={item.label} className="space-y-2">
                    <p className="section-label text-white/40">{item.label}</p>
                    <p className="text-sm leading-7 text-white/68">{item.copy}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative hidden overflow-hidden border-l border-white/10 lg:block">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.09),transparent_36%)]" />
              <div className="absolute left-[6%] top-[12%] font-serif text-[12rem] leading-none tracking-[-0.08em] text-white/[0.07]">BGB</div>
              <div className="absolute left-[14%] top-[18%] h-[34rem] w-[34rem] rounded-full border border-white/10" />
              <div className="absolute left-[24%] top-[27%] h-[24rem] w-[24rem] rounded-full border border-white/10" />
              <div className="absolute inset-y-14 right-10 flex w-56 flex-col justify-between">
                {[
                  ["01", "Eingang", "Dokumente, OCR, Klassifikation"],
                  ["02", "Recherche", "Bundesrecht, Rechtsprechung, EU-Recht"],
                  ["03", "Entwurf", "Memo, Schriftsatz, Anlagenlogik"]
                ].map(([index, label, copy], itemIndex) => (
                  <div
                    key={label}
                    className={`fade-up border-t border-white/12 pt-4 ${itemIndex === 0 ? "fade-up-delay-1" : itemIndex === 1 ? "fade-up-delay-2" : ""}`}
                  >
                    <p className="section-label text-white/34">{index}</p>
                    <p className="mt-3 font-serif text-3xl">{label}</p>
                    <p className="mt-2 text-sm leading-7 text-white/62">{copy}</p>
                  </div>
                ))}
              </div>
              <div className="absolute left-12 top-[32rem] max-w-[17rem] border-l border-white/12 pl-6">
                <p className="section-label text-white/34">Arbeitsidee</p>
                <p className="mt-3 text-sm leading-7 text-white/68">
                  Keine Dashboard-Mosaike. Eine Akte fuehrt Material, Recherche und Argumentationskette in einer lesbaren Linie zusammen.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-12 sm:px-8 lg:px-12 xl:px-16">
        <div className="mx-auto grid max-w-[1560px] gap-12 lg:grid-cols-[0.78fr_1.22fr]">
          <div className="editorial-rule pb-8">
            <p className="section-label text-ink/42">Systemgedanke</p>
            <h2 className="mt-4 max-w-xl font-serif text-4xl leading-tight tracking-[-0.03em] text-charcoal sm:text-5xl">
              Die Oberflaeche arbeitet wie ein Kanzlei-Dossier, nicht wie ein generischer SaaS-Startbildschirm.
            </h2>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {FEATURE_COLUMNS.map((item, index) => (
              <div key={item.title} className={`border-t border-charcoal/10 pt-5 ${index > 0 ? "md:border-l md:pl-6 md:pt-0" : ""}`}>
                <item.icon className="h-5 w-5 text-ember" />
                <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-ink/38">{item.kicker}</p>
                <h3 className="mt-3 text-2xl font-semibold leading-tight text-charcoal">{item.title}</h3>
                <p className="mt-4 text-sm leading-7 text-ink/68">{item.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {sampleMatter ? (
        <section className="px-6 py-2 sm:px-8 lg:px-12 xl:px-16">
          <div className="mx-auto max-w-[1560px]">
            <Link className="surface-panel glow-line block overflow-hidden rounded-[36px] p-7 sm:p-10" href={`/matters/${sampleMatter.id}`}>
              <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
                <div className="space-y-4">
                  <p className="section-label text-ink/42">Empfohlene Demoakte</p>
                  <h2 className="max-w-lg font-serif text-4xl leading-tight tracking-[-0.03em] text-charcoal sm:text-5xl">
                    Sofort in einer vorbefuellten Kaufvertragsakte arbeiten.
                  </h2>
                </div>
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge className="bg-charcoal text-paper">Musterfall</Badge>
                    <Badge variant="outline">Recherche, Entwurf und Anlagen</Badge>
                  </div>
                  <p className="max-w-2xl text-sm leading-7 text-ink/70">
                    {sampleMatter.description ??
                      "Enthaelt Beispieldokumente, Fristen, Rechercheergebnisse, einen Klageentwurf und ein Anlagenverzeichnis."}
                  </p>
                  <div className="inline-flex items-center gap-2 text-sm font-medium text-charcoal">
                    Demoakte oeffnen
                    <ArrowUpRight className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </section>
      ) : null}

      <section className="px-6 py-10 sm:px-8 lg:px-12 xl:px-16">
        <div className="mx-auto max-w-[1560px]">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="section-label text-ink/42">Aktenuebersicht</p>
              <h2 className="mt-4 font-serif text-4xl leading-none tracking-[-0.03em] text-charcoal sm:text-5xl">Akten</h2>
            </div>
            <Badge>{matters.length} erfasst</Badge>
          </div>

          <div className="surface-panel overflow-hidden rounded-[36px]">
            {matters.length ? (
              matters.map((matter, index) => (
                <Link
                  key={matter.id}
                  className={`group grid gap-4 px-6 py-5 transition hover:bg-white/50 lg:grid-cols-[minmax(0,1.2fr)_0.75fr_9rem] lg:items-center ${
                    index > 0 ? "border-t border-charcoal/10" : ""
                  }`}
                  href={`/matters/${matter.id}`}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-xl font-semibold text-charcoal">{matter.title}</h3>
                      <ArrowUpRight className="h-4 w-4 text-ink/32 transition group-hover:text-charcoal" />
                    </div>
                    <p className="mt-2 max-w-2xl text-sm leading-7 text-ink/68">
                      {matter.description?.includes("Neu angelegte Akte")
                        ? "Leere Akte. Fuegen Sie Dokumente hinzu oder oeffnen Sie zunaechst die Demoakte als Referenz."
                        : matter.description ?? "Noch keine Beschreibung vorhanden."}
                    </p>
                  </div>
                  <div className="text-sm text-ink/62">
                    <p className="section-label text-ink/34">Letzte Aenderung</p>
                    <p className="mt-2">{formatRelativeRunTime(matter.updated_at) || "Kein Zeitstempel"}</p>
                  </div>
                  <div className="flex justify-start lg:justify-end">
                    <Badge className={matter.title === SAMPLE_TITLE ? "bg-charcoal text-paper" : "bg-moss text-white"}>
                      {matter.title === SAMPLE_TITLE ? "Demoakte" : formatStatusLabel(matter.status)}
                    </Badge>
                  </div>
                </Link>
              ))
            ) : (
              <div className="px-6 py-10 text-sm text-ink/68">
                Noch keine Akten vorhanden. Legen Sie oben eine Akte an oder oeffnen Sie die Musterakte.
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

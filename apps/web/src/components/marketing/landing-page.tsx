import Link from "next/link";
import {
  ArrowRight,
  FileStack,
  Microscope,
  Scale,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const pillars = [
  {
    body: "Aktive Akten, Belege, Deadlines und Drafting bleiben im selben Raum statt in losen Chatverläufen.",
    title: "Matter-first workspace",
  },
  {
    body: "German legal sources, uploaded documents and Deep Research traces are visible in the answer instead of hidden behind prompts.",
    title: "Source-led reasoning",
  },
  {
    body: "Built for the narrow path from intake to memo to filing-ready draft, not for generic AI demos.",
    title: "Litigation-ready flow",
  },
];

const workflow = [
  "Akte öffnen und Sachverhalt festhalten.",
  "Schriftsätze, E-Mails und PDFs direkt im Composer hochladen.",
  "Deep Research gegen Bundesrecht, Landesrecht, Rechtsprechung und EU-Recht ausführen.",
  "Ergebnisse, Deadlines und Belege in derselben Matter strukturieren.",
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f5efe5_0%,#fbf9f5_42%,#ffffff_100%)] text-foreground">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-10">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-[1.15rem] bg-charcoal text-paper shadow-[0_12px_30px_rgba(15,23,42,0.18)]">
            <Scale className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-[0.16em] text-muted-foreground">JURISFLOW</p>
            <p className="text-sm text-muted-foreground">German legal AI workspace</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost">
            <Link href="#preview">Produkt ansehen</Link>
          </Button>
          <Button asChild>
            <Link href="/workspace">
              Workspace öffnen
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 -z-10 h-[42rem] bg-[radial-gradient(circle_at_18%_16%,rgba(201,115,69,0.24),transparent_30%),radial-gradient(circle_at_82%_18%,rgba(85,100,81,0.18),transparent_28%)]" />
          <div className="mx-auto grid max-w-7xl gap-12 px-6 pb-20 pt-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(420px,1.08fr)] lg:px-10 lg:pb-24 lg:pt-10">
            <div className="flex flex-col justify-center">
              <Badge variant="secondary">Matter-first legal AI for Germany</Badge>
              <h1 className="mt-6 max-w-3xl font-serif text-6xl leading-[0.94] tracking-[-0.07em] text-charcoal sm:text-7xl lg:text-[5.8rem]">
                Keep the assistant inside the matter.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-foreground/72">
                Jurisflow turns a research-first MVP into a working legal surface: one place for the assistant,
                Deep Research, uploaded evidence, deadlines, and draft context.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link href="/workspace">
                    Arbeitsraum starten
                    <ArrowRight data-icon="inline-end" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="#workflow">Wie der Flow aussieht</Link>
                </Button>
              </div>
              <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 border-t border-border/60 pt-6">
                {["Bundesrecht & Landesrecht", "Rechtsprechung", "EU-Recht", "Eigene Dokumente"].map((item) => (
                  <span key={item} className="flex items-center gap-1.5 text-sm text-foreground/60">
                    <span className="h-1 w-1 rounded-full bg-primary/60" />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div id="preview" className="relative">
              <div className="absolute inset-0 rounded-[2.5rem] bg-[radial-gradient(circle_at_top,rgba(201,115,69,0.22),transparent_48%)] blur-3xl" />
              <div className="relative overflow-hidden rounded-[2.2rem] border border-charcoal/10 bg-charcoal text-paper shadow-[0_40px_120px_rgba(15,23,42,0.22)]">
                <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                      <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                      <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                    </div>
                    <p className="text-sm font-medium text-paper/70">Jurisflow Arbeitsraum</p>
                  </div>
                  <Badge className="border-white/15 bg-white/8 text-paper" variant="default">
                    Deep Research aktiv
                  </Badge>
                </div>

                <div className="grid gap-4 p-4 lg:grid-cols-[180px_minmax(0,1fr)_210px]">
                  <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-paper/48">Matter rail</p>
                    <div className="mt-5 flex flex-col gap-2 text-sm text-paper/76">
                      <span>Assistant</span>
                      <span>Research</span>
                      <span>Evidence</span>
                      <span>Deadlines</span>
                    </div>
                    <Separator className="my-4 bg-white/10" />
                    <div className="flex flex-col gap-3">
                      <div className="rounded-2xl border border-white/10 bg-white/6 p-3">
                        <p className="text-xs text-paper/52">Active source lanes</p>
                        <p className="mt-2 text-sm">Federal law, case law, EU law</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[1.65rem] border border-white/10 bg-white/4 p-4">
                    <div className="rounded-[1.4rem] border border-white/10 bg-[#f8f4ed] p-4 text-charcoal shadow-[0_22px_50px_rgba(0,0,0,0.15)]">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-charcoal/42">Assistent</p>
                          <h3 className="mt-2 text-xl font-semibold tracking-[-0.04em]">Rechtliche Frage stellen</h3>
                        </div>
                        <Sparkles className="h-4 w-4 text-clay" />
                      </div>
                      <div className="mt-4 rounded-[0.85rem] border border-charcoal/12 bg-white/80 px-3 py-2.5 text-sm text-charcoal/50">
                        Stelle eine juristische Frage oder beschreibe deinen Fall…
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <div className="rounded-full border border-charcoal/15 bg-white px-2.5 py-1 text-[11px] font-medium text-charcoal/60">+ Anhang</div>
                        <div className="rounded-full border border-charcoal/20 bg-charcoal/8 px-2.5 py-1 text-[11px] font-medium text-charcoal/70">Deep Research</div>
                        <div className="ml-auto flex h-7 w-7 items-center justify-center rounded-full bg-charcoal text-paper">
                          <ArrowRight className="h-3 w-3" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-paper/48">Live context</p>
                    <div className="mt-4 flex flex-col gap-3">
                      <div className="rounded-2xl border border-white/10 bg-white/6 p-3">
                        <p className="text-xs text-paper/52">Documents</p>
                        <p className="mt-2 text-sm">Mandantenschreiben.pdf</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/6 p-3">
                        <p className="text-xs text-paper/52">Deadline</p>
                        <p className="mt-2 text-sm">Stellungnahmefrist</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/6 p-3">
                        <p className="text-xs text-paper/52">Draft queue</p>
                        <p className="mt-2 text-sm">Memo + pleading outline</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-18 lg:px-10">
          <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">What changes</p>
              <h2 className="mt-3 max-w-2xl font-serif text-5xl leading-tight tracking-[-0.06em] text-charcoal">
                The chat stays. The rest of the matter finally catches up.
              </h2>
            </div>
            <p className="max-w-lg text-base leading-7 text-foreground/68">
              The current MVP already has the research engine. This surface turns it into a product someone can
              navigate, review, and return to.
            </p>
          </div>

          <div className="mt-12 grid gap-6 border-t border-border/70 pt-8 lg:grid-cols-3">
            {pillars.map((pillar, index) => (
              <div key={pillar.title} className="flex flex-col gap-4 lg:pr-8">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-clay">0{index + 1}</span>
                  <Separator className="flex-1" />
                </div>
                <h3 className="text-2xl font-semibold tracking-[-0.04em] text-charcoal">{pillar.title}</h3>
                <p className="text-base leading-7 text-foreground/70">{pillar.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="workflow" className="bg-charcoal py-18 text-paper">
          <div className="mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:px-10">
            <div>
              <Badge className="border-white/12 bg-white/8 text-paper" variant="default">Workflow</Badge>
              <h2 className="mt-5 font-serif text-5xl leading-tight tracking-[-0.06em]">
                A tighter flow from file intake to source-backed draft.
              </h2>
              <p className="mt-5 max-w-xl text-base leading-7 text-paper/70">
                Jurisflow is strongest when it reduces context loss. The same workspace that runs research should also
                hold evidence, deadlines, and the next draft.
              </p>
            </div>

            <div className="grid gap-4">
              {workflow.map((step, index) => (
                <div key={step} className="rounded-[1.65rem] border border-white/10 bg-white/5 px-5 py-5">
                  <div className="flex items-start gap-4">
                    <span className="mt-0.5 text-sm font-semibold text-clay">0{index + 1}</span>
                    <p className="text-base leading-7 text-paper/82">{step}</p>
                  </div>
                </div>
              ))}
              <div className="grid gap-4 pt-4 sm:grid-cols-3">
                <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4">
                  <Microscope className="h-5 w-5 text-clay" />
                  <p className="mt-4 text-sm leading-6 text-paper/74">Deep Research remains visible in the flow.</p>
                </div>
                <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4">
                  <FileStack className="h-5 w-5 text-clay" />
                  <p className="mt-4 text-sm leading-6 text-paper/74">Evidence labels and document processing stay with the matter.</p>
                </div>
                <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4">
                  <ShieldCheck className="h-5 w-5 text-clay" />
                  <p className="mt-4 text-sm leading-6 text-paper/74">Sources and legal lanes are visible, not implied.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-18 lg:px-10">
          <div className="grid gap-10 rounded-[2.2rem] border border-border/70 bg-[linear-gradient(135deg,rgba(201,115,69,0.08),rgba(255,255,255,0.95))] px-6 py-10 shadow-[0_18px_60px_rgba(15,23,42,0.08)] lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:px-10">
            <div>
              <h2 className="font-serif text-5xl leading-tight tracking-[-0.06em] text-charcoal">
                Bereit. Öffne den Arbeitsraum und leg los.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-7 text-foreground/70">
                Der Assistent steht sofort bereit — mit Deep Research, Dokumenten-Upload, Quellenauswahl und
                strukturierter Aktenführung in einer Oberfläche.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/workspace">
                  Workspace starten
                  <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="https://github.com/SebastianBoehler/jurisflow">
                  Repository
                  <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

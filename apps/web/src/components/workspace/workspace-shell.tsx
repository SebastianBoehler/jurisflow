"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  BookOpenText,
  Clock3,
  FileStack,
  Files,
  Microscope,
  Scale,
  Sparkles,
} from "lucide-react";
import { Thread } from "@/components/chat/thread";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { useWorkspaceData } from "@/components/workspace/use-workspace-data";
import {
  formatWorkspaceDate,
  StatusBadge,
  WorkspaceMetric,
  WorkspaceSection,
} from "@/components/workspace/workspace-chrome";

export function WorkspaceShell() {
  const [matterId, setMatterId] = useState<string | null>(null);
  const { deadlines, documents, drafts, error, evidence, isLoading, matter, researchRuns } = useWorkspaceData(matterId);

  const metrics = useMemo(
    () => [
      { detail: "aktive Akte", label: "Vorgang", value: matter ? "1" : "0" },
      { detail: `${documents.filter((document) => document.processing_status === "ready").length} bereit`, label: "Dokumente", value: String(documents.length) },
      { detail: `${researchRuns.filter((run) => run.status === "ready").length} abgeschlossen`, label: "Recherche-Läufe", value: String(researchRuns.length) },
      { detail: `${drafts.filter((draft) => draft.status === "ready").length} bereit`, label: "Entwürfe", value: String(drafts.length) },
    ],
    [documents, drafts, matter, researchRuns],
  );

  const navigation = [
    { href: "#assistant", icon: Sparkles, label: "Assistent" },
    { href: "#research", icon: Microscope, label: "Recherche" },
    { href: "#evidence", icon: FileStack, label: "Belege" },
    { href: "#deadlines", icon: Clock3, label: "Fristen" },
  ];

  return (
    <SidebarProvider defaultOpen>
      <Sidebar collapsible="icon" variant="floating">
        <SidebarHeader className="p-3">
          <Link href="/" className="flex items-center gap-3 rounded-[1.25rem] border border-sidebar-border/80 bg-sidebar-accent/60 p-3">
            <div className="flex size-10 items-center justify-center rounded-[1rem] bg-sidebar-primary text-sidebar-primary-foreground">
              <Scale className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-sidebar-foreground">Jurisflow</p>
              <p className="truncate text-xs text-sidebar-foreground/60">Juristische KI-Arbeitsumgebung</p>
            </div>
          </Link>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Arbeitsbereiche</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navigation.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild tooltip={item.label}>
                      <a href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarSeparator />

          <SidebarGroup>
            <SidebarGroupLabel>Rechtsquellen</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {["Bundesrecht", "Landesrecht", "Rechtsprechung", "EU-Recht", "Web + Akten"].map((source) => (
                  <SidebarMenuItem key={source}>
                    <SidebarMenuButton className="text-sidebar-foreground/68 hover:text-sidebar-foreground">
                      <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-sidebar-primary/50" />
                      <span>{source}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="p-3">
          <div className="rounded-[1.25rem] border border-sidebar-border/80 bg-sidebar-accent/50 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${matter ? "bg-emerald-400" : "bg-sidebar-foreground/30"}`} />
              <p className="text-xs text-sidebar-foreground/70">
                {matter ? matter.title : "Kein aktiver Vorgang"}
              </p>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="bg-[radial-gradient(circle_at_top_left,rgba(201,115,69,0.16),transparent_36%),linear-gradient(180deg,#f8f4ed_0%,#ffffff_58%,#f5efe5_100%)]">
        <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col px-4 py-4 sm:px-6 lg:px-8">
          <header className="flex flex-wrap items-center justify-between gap-4 rounded-[1.75rem] border border-border/70 bg-background/78 px-4 py-3 shadow-[0_12px_40px_rgba(15,23,42,0.06)] backdrop-blur">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="hidden md:inline-flex" />
              <div>
                <p className="text-xs text-muted-foreground">Aktiver Vorgang</p>
                <h1 className="mt-0.5 text-xl font-semibold tracking-[-0.04em] text-foreground">
                  {matter?.title ?? "Jurisflow Arbeitsraum"}
                </h1>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={matter?.status} />
            </div>
          </header>

          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => (
              <WorkspaceMetric key={metric.label} {...metric} />
            ))}
          </div>

          <div className="mt-6 grid flex-1 gap-6 xl:grid-cols-[minmax(0,1.15fr)_360px]">
            <section
              id="assistant"
              className="flex min-h-[72svh] flex-col overflow-hidden rounded-[2rem] border border-border/70 bg-background/84 p-4 shadow-[0_30px_80px_rgba(15,23,42,0.08)] backdrop-blur"
            >
              <div className="mb-4 flex items-center justify-between gap-3 border-b border-border/60 px-2 pb-4">
                <h2 className="text-lg font-semibold tracking-[-0.04em] text-foreground">
                  {matter?.title ?? "Juristische Recherche"}
                </h2>
                <StatusBadge status={matter?.status} />
              </div>
              <Thread
                autoCreateMatter
                className="min-h-0 max-w-none flex-1 px-0 sm:px-0"
                onMatterIdChange={setMatterId}
                showHeader={false}
              />
            </section>

            <aside className="flex flex-col gap-4 xl:max-h-[calc(100svh-11rem)] xl:overflow-auto">
              <WorkspaceSection icon={BookOpenText} id="research" title="Research-Läufe">
                {error ? (
                  <p className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>
                ) : isLoading && researchRuns.length === 0 ? (
                  <div className="flex flex-col gap-3">
                    <Skeleton className="h-20 rounded-[1.25rem]" />
                    <Skeleton className="h-20 rounded-[1.25rem]" />
                  </div>
                ) : researchRuns.length ? (
                  <div className="flex flex-col gap-3">
                    {researchRuns.slice(0, 4).map((run) => (
                      <div key={run.id} className="rounded-[1.25rem] border border-border/70 bg-background px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <StatusBadge status={run.status} />
                          <span className="text-xs text-muted-foreground">{formatWorkspaceDate(run.created_at)}</span>
                        </div>
                        <p className="mt-3 text-sm font-medium leading-6 text-foreground">{run.query}</p>
                        <p className="mt-2 text-sm text-muted-foreground">{run.summary ?? "Zusammenfassung folgt nach Abschluss des Runs."}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm leading-6 text-muted-foreground">
                    Noch kein Research-Lauf. Aktiviere Deep Research im Composer, um Quellen und Traces in die Akte zu schreiben.
                  </p>
                )}
              </WorkspaceSection>

              <WorkspaceSection icon={Files} id="evidence" title="Dokumente & Belege">
                {isLoading && documents.length === 0 ? (
                  <div className="flex flex-col gap-3">
                    <Skeleton className="h-16 rounded-[1.25rem]" />
                    <Skeleton className="h-16 rounded-[1.25rem]" />
                  </div>
                ) : documents.length ? (
                  <div className="flex flex-col gap-4">
                    {documents.slice(0, 4).map((document) => (
                      <div key={document.id} className="rounded-[1.25rem] border border-border/70 bg-background px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium text-foreground">{document.title}</p>
                          <StatusBadge status={document.processing_status} />
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">{document.summary ?? "Wird nach der Verarbeitung in den Workspace einsortiert."}</p>
                      </div>
                    ))}
                    {evidence.length ? (
                      <>
                        <Separator />
                        <div className="flex flex-col gap-2">
                          {evidence.slice(0, 4).map((item) => (
                            <div key={item.id} className="flex items-center justify-between gap-3 text-sm">
                              <span className="font-medium text-foreground">{item.label}</span>
                              <span className="truncate text-muted-foreground">{item.title}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-sm leading-6 text-muted-foreground">
                    Lade PDFs, DOCX, TXT oder E-Mails direkt im Composer hoch. Jurisflow verknüpft sie mit der aktiven Akte.
                  </p>
                )}
              </WorkspaceSection>

              <WorkspaceSection icon={Clock3} id="deadlines" title="Fristen & Entwürfe">
                <div className="flex flex-col gap-4">
                  {deadlines.length ? (
                    deadlines.slice(0, 4).map((deadline) => (
                      <div key={deadline.id} className="rounded-[1.25rem] border border-border/70 bg-background px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium text-foreground">{deadline.label}</p>
                          <Badge variant="outline">{deadline.kind}</Badge>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">{deadline.due_date ?? "Termin folgt aus der Dokumentauswertung."}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm leading-6 text-muted-foreground">
                      Noch keine Fristen erkannt. Sobald Dokumente verarbeitet sind, erscheinen Fristen und Belege hier.
                    </p>
                  )}

                  <Separator />

                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-foreground">Entwurfswarteschlange</p>
                      <Badge variant="outline">{drafts.length}</Badge>
                    </div>
                    <p className="text-sm leading-6 text-muted-foreground">
                      Entwürfe bleiben Teil der Aktenhistorie und verschwinden nicht als einzelne Chat-Nachrichten.
                    </p>
                  </div>
                </div>
              </WorkspaceSection>
            </aside>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

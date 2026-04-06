"use client";

import { useMemo, useState } from "react";
import {
  MessageSquarePlus,
  Scale,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Thread } from "@/components/chat/thread";
import { Badge } from "@/components/ui/badge";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useMatters } from "@/components/matters/use-matters";
import { useWorkspaceData } from "@/components/workspace/use-workspace-data";
import { StatusBadge } from "@/components/workspace/workspace-chrome";
import { WorkspaceContextRail } from "@/components/workspace/workspace-context-rail";
import { WorkspaceSidebar } from "@/components/workspace/workspace-sidebar";

export function WorkspaceShell() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMatterId = searchParams.get("matter");
  const [matterId, setMatterId] = useState<string | null>(initialMatterId);
  const [threadSessionKey, setThreadSessionKey] = useState(
    initialMatterId ? `matter:${initialMatterId}` : "new",
  );
  const { error: mattersError, isLoading: mattersLoading, matters } = useMatters();
  const { deadlines, documents, drafts, error, evidence, isLoading, matter, researchRuns } = useWorkspaceData(matterId);

  const recentMatterLinks = useMemo(
    () =>
      matters.slice(0, 5).map((entry) => ({
        id: entry.id,
        title: entry.title,
      })),
    [matters],
  );

  function handleSelectMatter(nextMatterId: string) {
    setMatterId(nextMatterId);
    setThreadSessionKey(`matter:${nextMatterId}`);
    router.push(`${pathname}?matter=${nextMatterId}`, { scroll: false });
  }

  function handleNewMatter() {
    setMatterId(null);
    setThreadSessionKey(`new:${Date.now()}`);
    router.push(pathname, { scroll: false });
  }

  return (
    <SidebarProvider defaultOpen>
      <WorkspaceSidebar
        error={mattersError}
        isLoading={mattersLoading}
        matters={matters}
        onNewMatter={handleNewMatter}
        onSelectMatter={handleSelectMatter}
        selectedMatterId={matterId}
      />

      <SidebarInset className="bg-[radial-gradient(circle_at_top_left,rgba(71,85,105,0.12),transparent_26%),linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)]">
        <div className="flex min-h-svh flex-1 flex-col">
          <header className="border-b border-border/60 bg-background/72 px-4 py-4 backdrop-blur sm:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Chat-first legal workspace
                </p>
                <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground">
                  {matter?.title ?? "Neue juristische Unterhaltung"}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  {matter
                    ? matter.description ?? "Die Matter ist aktiv. Frage weiter, lade Dokumente hoch oder starte Deep Research im selben Thread."
                    : "Beginne mit einer juristischen Frage, einem Upload oder einem Starter-Prompt. Die Akte wird beim ersten Senden angelegt."}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {matter ? (
                  <StatusBadge status={matter.status} />
                ) : (
                  <Badge variant="outline">Bereit zum Start</Badge>
                )}
                <Button onClick={handleNewMatter} type="button" variant="outline">
                  <MessageSquarePlus className="size-4" />
                  Neue Akte
                </Button>
              </div>
            </div>

            {recentMatterLinks.length ? (
              <div className="mt-4 flex gap-2 overflow-x-auto md:hidden">
                {recentMatterLinks.map((entry) => (
                  <button
                    key={entry.id}
                    className="rounded-full border border-border bg-background px-3 py-1.5 text-sm text-foreground"
                    onClick={() => handleSelectMatter(entry.id)}
                    type="button"
                  >
                    {entry.title}
                  </button>
                ))}
              </div>
            ) : null}
          </header>

          <div className="flex-1 overflow-hidden px-4 py-4 sm:px-6">
            <div className="grid h-full gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
              <section className="flex min-h-0 flex-col overflow-hidden rounded-[2rem] border border-border/70 bg-background/88 shadow-[0_28px_80px_rgba(15,23,42,0.08)]">
                <div className="flex items-center justify-between gap-4 border-b border-border/60 px-4 py-4 sm:px-6">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-[1rem] bg-foreground text-background">
                      <Scale className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold tracking-[-0.02em] text-foreground">Jurisflow Assistant</p>
                      <p className="text-sm text-muted-foreground">
                        {matterId
                          ? "Chat, Dokumente und Research greifen auf dieselbe Matter zu."
                          : "Die erste Nachricht startet eine neue Matter im selben Arbeitsraum."}
                      </p>
                    </div>
                  </div>
                  {matterId ? (
                    <p className="hidden text-xs text-muted-foreground sm:block">Matter geladen</p>
                  ) : (
                    <Badge className="hidden sm:inline-flex" variant="outline">
                      Deep Research im Composer
                    </Badge>
                  )}
                </div>

                <Thread
                  key={threadSessionKey}
                  className="flex-1 px-0"
                  initialMatterId={matterId}
                  matterTitle={matter?.title ?? null}
                  onMatterIdChange={setMatterId}
                  showHeader={false}
                />
              </section>

              <WorkspaceContextRail
                deadlines={deadlines}
                documents={documents}
                drafts={drafts}
                error={error}
                evidence={evidence}
                isLoading={isLoading}
                matter={matter}
                researchRuns={researchRuns}
              />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

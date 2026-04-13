"use client";

import { useMemo, useState } from "react";
import { MessageSquarePlus } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CaseUiWorkbench } from "@/components/case-ui/case-ui-workbench";
import { Badge } from "@/components/ui/badge";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useMatters } from "@/components/matters/use-matters";
import { useWorkspaceData } from "@/components/workspace/use-workspace-data";
import { StatusBadge } from "@/components/workspace/workspace-chrome";
import { WorkspaceSidebar } from "@/components/workspace/workspace-sidebar";
import { createMatter } from "@/lib/api";

export function WorkspaceShell() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMatterId = searchParams.get("matter");
  const [matterId, setMatterId] = useState<string | null>(initialMatterId);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreatingMatter, setIsCreatingMatter] = useState(false);
  const { error: mattersError, isLoading: mattersLoading, matters, refresh } = useMatters();
  const { deadlines, documents, drafts, error, evidence, isLoading, matter, researchRuns } = useWorkspaceData(matterId);

  const recentMatterLinks = useMemo(
    () =>
      matters.slice(0, 5).map((entry) => ({
        id: entry.id,
        title: entry.title,
      })),
    [matters],
  );

  const workspaceData = useMemo(
    () => ({
      deadlines,
      documents,
      drafts,
      error,
      evidence,
      isLoading,
      matter,
      researchRuns,
    }),
    [deadlines, documents, drafts, error, evidence, isLoading, matter, researchRuns],
  );

  function handleSelectMatter(nextMatterId: string) {
    setMatterId(nextMatterId);
    setCreateError(null);
    router.push(`${pathname}?matter=${nextMatterId}`, { scroll: false });
  }

  async function handleNewMatter() {
    if (isCreatingMatter) return;
    setCreateError(null);
    setIsCreatingMatter(true);

    try {
      const nextMatter = await createMatter({ title: "Neue Akte" });
      setMatterId(nextMatter.id);
      router.push(`${pathname}?matter=${nextMatter.id}`, { scroll: false });
      await refresh();
    } catch (newMatterError) {
      setCreateError(
        newMatterError instanceof Error
          ? newMatterError.message
          : "Neue Akte konnte nicht erstellt werden.",
      );
    } finally {
      setIsCreatingMatter(false);
    }
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
                    ? matter.description ?? "Die Matter ist aktiv. Der Chat kann die Falloberfläche live auf Dokumente, Research, Fristen und Entwürfe fokussieren."
                    : "Erstelle oder wähle eine Akte. Danach kann der Case Chat die Oberfläche dynamisch an die Fallarbeit anpassen."}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {matter ? (
                  <StatusBadge status={matter.status} />
                ) : (
                  <Badge variant="outline">Bereit zum Start</Badge>
                )}
                <Button disabled={isCreatingMatter} onClick={handleNewMatter} type="button" variant="outline">
                  <MessageSquarePlus className="size-4" />
                  {isCreatingMatter ? "Erstelle..." : "Neue Akte"}
                </Button>
              </div>
            </div>

            {createError ? (
              <p className="mt-3 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {createError}
              </p>
            ) : null}

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
            <CaseUiWorkbench
              key={matterId ?? "new-case"}
              caseKey={matterId ?? "new-case"}
              data={workspaceData}
            />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

"use client";

import Link from "next/link";
import { MessageSquarePlus, Scale, Sparkles } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { formatWorkspaceDate } from "@/components/workspace/workspace-chrome";
import { cn } from "@/lib/utils";
import type { Matter } from "@/lib/types";

type WorkspaceSidebarProps = {
  error: string | null;
  isLoading: boolean;
  matters: Matter[];
  onNewMatter: () => void;
  onSelectMatter: (matterId: string) => void;
  selectedMatterId: string | null;
};

const SOURCE_LANES = [
  "Bundesrecht",
  "Landesrecht",
  "Rechtsprechung",
  "EU-Recht",
  "Web + Uploads",
];

export function WorkspaceSidebar({
  error,
  isLoading,
  matters,
  onNewMatter,
  onSelectMatter,
  selectedMatterId,
}: WorkspaceSidebarProps) {
  return (
    <Sidebar collapsible="none" variant="inset" className="border-0">
      <SidebarHeader className="gap-3 p-3">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-[1.5rem] border border-sidebar-border/80 bg-sidebar-accent/60 px-3 py-3"
        >
          <div className="flex size-10 items-center justify-center rounded-[1rem] bg-sidebar-primary text-sidebar-primary-foreground">
            <Scale className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-sidebar-foreground">Jurisflow</p>
            <p className="truncate text-xs text-sidebar-foreground/58">Chat-first legal workspace</p>
          </div>
        </Link>

        <Button
          className="justify-start rounded-[1.15rem] bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/88"
          onClick={onNewMatter}
          type="button"
        >
          <MessageSquarePlus className="size-4" />
          Neue Akte
        </Button>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Akten</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <SidebarMenuItem key={index}>
                    <div className="h-[68px] animate-pulse rounded-[1rem] bg-white/6" />
                  </SidebarMenuItem>
                ))
              ) : matters.length ? (
                matters.slice(0, 10).map((matter) => {
                  const isActive = matter.id === selectedMatterId;

                  return (
                    <SidebarMenuItem key={matter.id}>
                      <button
                        className={cn(
                          "w-full rounded-[1rem] border px-3 py-3 text-left transition",
                          isActive
                            ? "border-white/14 bg-white/10 text-sidebar-foreground"
                            : "border-transparent bg-transparent text-sidebar-foreground/72 hover:border-white/10 hover:bg-white/6 hover:text-sidebar-foreground",
                        )}
                        onClick={() => onSelectMatter(matter.id)}
                        type="button"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              "mt-0.5 flex size-8 items-center justify-center rounded-[0.9rem]",
                              isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "bg-white/8 text-sidebar-foreground/68",
                            )}
                          >
                            <Sparkles className="size-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{matter.title}</p>
                            <p className="mt-1 truncate text-xs text-sidebar-foreground/48">
                              {formatWorkspaceDate(matter.updated_at)}
                            </p>
                          </div>
                        </div>
                      </button>
                    </SidebarMenuItem>
                  );
                })
              ) : (
                <SidebarMenuItem>
                  <div className="rounded-[1rem] border border-dashed border-white/12 bg-white/5 px-3 py-4 text-sm leading-6 text-sidebar-foreground/62">
                    Noch keine Akten. Die erste Nachricht legt die erste Akte an.
                  </div>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
            {error ? (
              <p className="px-2 pt-3 text-xs leading-5 text-rose-200/90">{error}</p>
            ) : null}
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Quellen</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="grid gap-2 px-2">
              {SOURCE_LANES.map((source) => (
                <div
                  key={source}
                  className="flex items-center gap-2 rounded-[0.95rem] border border-white/8 bg-white/5 px-3 py-2 text-sm text-sidebar-foreground/70"
                >
                  <span className="size-1.5 rounded-full bg-sidebar-primary/80" />
                  <span>{source}</span>
                </div>
              ))}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        <div className="rounded-[1.35rem] border border-sidebar-border/80 bg-sidebar-accent/55 px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/46">
            Immer im Chat
          </p>
          <p className="mt-2 text-sm leading-6 text-sidebar-foreground/68">
            Dokumente, Deep Research und Aktenkontext bleiben an derselben Stelle statt in separaten Tools.
          </p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

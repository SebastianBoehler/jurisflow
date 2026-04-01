"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ScrollText } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function formatWorkspaceDate(value: string | null | undefined) {
  if (!value) return "Keine Angabe";
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function workspaceStatusVariant(
  status: string | null | undefined,
): "default" | "destructive" | "outline" | "secondary" {
  switch (status) {
    case "ready":
    case "open":
      return "secondary";
    case "failed":
      return "destructive";
    case "processing":
    case "review":
      return "default";
    default:
      return "outline";
  }
}

export function WorkspaceMetric({
  detail,
  label,
  value,
}: {
  detail: string;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-border/70 bg-background/78 p-4 shadow-[0_10px_35px_rgba(15,23,42,0.06)] backdrop-blur">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <span className="text-3xl font-semibold tracking-[-0.06em] text-foreground">{value}</span>
        <span className="text-sm text-muted-foreground">{detail}</span>
      </div>
    </div>
  );
}

export function WorkspaceSection({
  children,
  icon: Icon = ScrollText,
  id,
  title,
}: {
  children: ReactNode;
  icon?: LucideIcon;
  id: string;
  title: string;
}) {
  return (
    <section
      id={id}
      className="rounded-[1.75rem] border border-border/70 bg-background/82 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur"
    >
      <div className="flex items-center gap-2.5">
        <div className="rounded-xl border border-border/60 bg-muted/50 p-1.5 text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
        </div>
        <h2 className="text-sm font-semibold tracking-[-0.02em] text-foreground">{title}</h2>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

const STATUS_LABELS: Record<string, string> = {
  ready: "Bereit",
  open: "Offen",
  failed: "Fehler",
  processing: "Wird verarbeitet",
  review: "In Prüfung",
};

export function StatusBadge({ status }: { status: string | null | undefined }) {
  const label = status ? (STATUS_LABELS[status] ?? status) : "Wird geladen";
  return <Badge variant={workspaceStatusVariant(status)}>{label}</Badge>;
}

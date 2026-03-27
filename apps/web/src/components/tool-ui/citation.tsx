"use client";

import { ExternalLink, Globe } from "lucide-react";

import { cn } from "@/lib/utils";

type CitationProps = {
  className?: string;
  domain?: string;
  href: string;
  id: string;
  snippet?: string;
  title: string;
  type?: string;
};

export function Citation({ className, domain, href, id, snippet, title, type }: CitationProps) {
  const content = (
    <div
      className={cn(
        "group flex h-full flex-col rounded-2xl border border-border bg-background p-4 transition hover:border-foreground/20 hover:bg-muted/50",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{id}</p>
          <p className="mt-2 line-clamp-2 text-sm font-medium leading-6 text-foreground">{title}</p>
        </div>
        <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-foreground" />
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <Globe className="h-3.5 w-3.5" />
        <span>{domain ?? "Quelle"}</span>
        {type ? <span>· {type}</span> : null}
      </div>
      {snippet ? <p className="mt-3 line-clamp-4 text-sm leading-6 text-muted-foreground">{snippet}</p> : null}
    </div>
  );

  if (!href || href === "#") {
    return content;
  }

  return (
    <a href={href} rel="noreferrer" target="_blank">
      {content}
    </a>
  );
}

"use client";

import { CopyIcon, DownloadIcon } from "lucide-react";

import { Action, Actions } from "@/components/ai/actions";
import { cn } from "@/lib/utils";

export function Artifact({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("overflow-hidden rounded-[28px] border border-charcoal/10 bg-white/78", className)} {...props} />;
}

export function ArtifactHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-start justify-between gap-4 border-b border-charcoal/10 bg-charcoal/4 px-4 py-3", className)} {...props} />;
}

export function ArtifactTitle({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("font-medium text-sm", className)} {...props} />;
}

export function ArtifactDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("mt-1 text-sm text-ink/62", className)} {...props} />;
}

export function ArtifactActions(props: React.HTMLAttributes<HTMLDivElement>) {
  return <Actions {...props} />;
}

export function ArtifactAction({
  label,
  onPress,
  type
}: {
  label: string;
  onPress?: () => void;
  type: "copy" | "download";
}) {
  const Icon = type === "copy" ? CopyIcon : DownloadIcon;
  return (
    <Action label={label} onClick={onPress}>
      <Icon className="h-4 w-4" />
    </Action>
  );
}

export function ArtifactContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("max-h-80 overflow-auto p-4", className)} {...props} />;
}

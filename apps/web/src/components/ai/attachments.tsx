"use client";

import { FileTextIcon, GlobeIcon, ImageIcon, Music2Icon, PaperclipIcon, VideoIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type AttachmentData = {
  id: string;
  type: "file" | "source-document";
  filename?: string;
  title?: string;
  url?: string | null;
  mediaType?: string | null;
};

type AttachmentsProps = React.HTMLAttributes<HTMLDivElement> & {
  items: AttachmentData[];
  variant?: "inline" | "list";
};

export function Attachments({ className, items, variant = "inline", ...props }: AttachmentsProps) {
  return (
    <div className={cn(variant === "inline" ? "flex flex-wrap gap-2" : "space-y-2", className)} {...props}>
      {items.map((item) => (
        <AttachmentItem key={item.id} item={item} variant={variant} />
      ))}
    </div>
  );
}

function AttachmentItem({ item, variant }: { item: AttachmentData; variant: "inline" | "list" }) {
  const Icon = getAttachmentIcon(item);
  const label = item.title ?? item.filename ?? "Anhang";
  const body = (
    <>
      <Icon className="h-4 w-4 text-clay" />
      <span className="truncate">{label}</span>
      {item.type === "source-document" ? <Badge variant="outline">Quelle</Badge> : null}
    </>
  );

  if (item.url) {
    return (
      <a
        className={cn(
          "flex items-center gap-2 rounded-full border border-charcoal/10 bg-white/72 px-3 py-2 text-sm hover:border-ember/40 hover:bg-paper",
          variant === "list" && "rounded-[22px] px-4 py-3"
        )}
        href={item.url}
        rel="noreferrer"
        target="_blank"
      >
        {body}
      </a>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full border border-charcoal/10 bg-white/72 px-3 py-2 text-sm",
        variant === "list" && "rounded-[22px] px-4 py-3"
      )}
    >
      {body}
    </div>
  );
}

function getAttachmentIcon(item: AttachmentData) {
  if (item.type === "source-document") {
    return GlobeIcon;
  }
  const mediaType = item.mediaType ?? "";
  if (mediaType.startsWith("image/")) {
    return ImageIcon;
  }
  if (mediaType.startsWith("video/")) {
    return VideoIcon;
  }
  if (mediaType.startsWith("audio/")) {
    return Music2Icon;
  }
  if (mediaType.startsWith("application/") || mediaType.startsWith("text/")) {
    return FileTextIcon;
  }
  return PaperclipIcon;
}

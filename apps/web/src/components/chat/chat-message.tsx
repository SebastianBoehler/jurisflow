import { BotIcon, UserIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type ChatMessageProps = React.PropsWithChildren<{
  className?: string;
  role: "assistant" | "user";
}>;

export function ChatMessage({ children, className, role }: ChatMessageProps) {
  const Icon = role === "assistant" ? BotIcon : UserIcon;
  return (
    <div className={cn("flex gap-4", className)}>
      <div
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border",
          role === "assistant"
            ? "border-charcoal/10 bg-paper text-charcoal"
            : "border-white/12 bg-white/8 text-white"
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1 space-y-3">{children}</div>
    </div>
  );
}

export function ChatBubble({ children, className, tone = "default" }: React.PropsWithChildren<{ className?: string; tone?: "default" | "subtle" }>) {
  return (
    <div
      className={cn(
        "rounded-[28px] border px-5 py-4",
        tone === "default"
          ? "border-white/12 bg-charcoal text-paper shadow-[0_20px_40px_rgba(21,23,27,0.16)]"
          : "border-charcoal/10 bg-paper/72 text-ink backdrop-blur",
        className
      )}
    >
      {children}
    </div>
  );
}

export function ChatMeta({ children, className }: React.PropsWithChildren<{ className?: string }>) {
  return <div className={cn("text-[11px] font-semibold uppercase tracking-[0.22em] text-ink/42", className)}>{children}</div>;
}

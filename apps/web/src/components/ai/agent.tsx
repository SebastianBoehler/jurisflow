import { BotIcon, WrenchIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function Agent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-[28px] border border-charcoal/10 bg-white/72 p-4", className)} {...props} />;
}

export function AgentHeader({
  className,
  model,
  name,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { model?: string; name: string }) {
  return (
    <div className={cn("flex items-center justify-between gap-4", className)} {...props}>
      <div className="flex items-center gap-2">
        <BotIcon className="h-4 w-4 text-ember" />
        <span className="font-medium text-sm">{name}</span>
      </div>
      {model ? <Badge variant="outline">{model}</Badge> : null}
    </div>
  );
}

export function AgentContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-4 space-y-4", className)} {...props} />;
}

export function AgentInstructions({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("space-y-2", className)} {...props}>
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">Instruktionen</div>
      <p className="rounded-[22px] bg-charcoal/4 p-3 text-sm text-ink/72">{children}</p>
    </div>
  );
}

export function AgentTools({
  className,
  title = "Tools",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { title?: string }) {
  return (
    <div className={cn("space-y-2", className)} {...props}>
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">{title}</div>
      <div className="space-y-2">{props.children}</div>
    </div>
  );
}

export function AgentTool({
  description,
  schema,
  title
}: {
  description: string;
  schema?: string;
  title: string;
}) {
  return (
    <details className="rounded-[22px] border border-charcoal/10 bg-white/82">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
        <span className="flex items-center gap-2 text-sm font-medium">
          <WrenchIcon className="h-4 w-4 text-moss" />
          {title}
        </span>
        <span className="text-xs text-ink/45">Details</span>
      </summary>
      <div className="space-y-3 border-t border-charcoal/10 px-4 py-3">
        <p className="text-sm text-ink/72">{description}</p>
        {schema ? (
          <pre className="overflow-x-auto rounded-[20px] bg-charcoal p-3 text-xs text-white/88">{schema}</pre>
        ) : null}
      </div>
    </details>
  );
}

export function AgentOutput({ className, schema }: { className?: string; schema: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">Output</div>
      <pre className="overflow-x-auto rounded-[20px] bg-charcoal p-3 text-xs text-white/88">{schema}</pre>
    </div>
  );
}

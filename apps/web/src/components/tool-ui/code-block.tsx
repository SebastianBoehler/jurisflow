"use client";

import { ReactNode, useState } from "react";
import { Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CodeBlockProps = {
  children?: ReactNode;
  className?: string;
  code: string;
  filename?: string;
  language?: string;
};

export function CodeBlock({ children, className, code, filename, language }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 text-slate-50">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2.5">
        <div className="flex items-center gap-2 text-xs text-slate-300">
          {filename ? <span className="font-medium text-slate-100">{filename}</span> : null}
          {language ? (
            <span className="rounded-full bg-slate-800 px-2 py-0.5 uppercase">{language.replace(/^language-/, "")}</span>
          ) : null}
        </div>
        <Button
          className="h-8 rounded-full border border-slate-700 bg-transparent px-3 text-xs text-slate-100 hover:bg-slate-800"
          onClick={() => void handleCopy()}
          type="button"
          variant="ghost"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Kopiert" : "Kopieren"}
        </Button>
      </div>
      <pre className="overflow-x-auto p-4 text-sm leading-6">
        <code className={cn("hljs", className)}>{children ?? code}</code>
      </pre>
    </div>
  );
}

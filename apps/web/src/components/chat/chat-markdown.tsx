"use client";

import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";

import { CodeBlock } from "@/components/tool-ui/code-block";

type ChatMarkdownProps = {
  content: string;
};

export function ChatMarkdown({ content }: ChatMarkdownProps) {
  return (
    <div className="report-markdown">
      <ReactMarkdown
        rehypePlugins={[rehypeHighlight]}
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ ...props }) => (
            <a
              {...props}
              className="font-medium text-foreground underline underline-offset-4"
              rel="noreferrer"
              target="_blank"
            />
          ),
          code: ({ className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className ?? "");
            const code = String(children).replace(/\n$/, "");

            if (match) {
              return (
                <CodeBlock className={className} code={code} language={match[0]}>
                  {children}
                </CodeBlock>
              );
            }

            return (
              <code
                {...props}
                className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[0.92em] text-foreground"
              >
                {children}
              </code>
            );
          },
          pre: ({ children }) => <>{children}</>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

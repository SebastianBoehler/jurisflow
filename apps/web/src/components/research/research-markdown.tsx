"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

type ResearchMarkdownProps = {
  content: string;
};

export function ResearchMarkdown({ content }: ResearchMarkdownProps) {
  return (
    <div className="report-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          a: ({ ...props }) => (
            <a {...props} className="underline underline-offset-4" rel="noreferrer" target="_blank" />
          ),
          code: ({ className, children, ...props }) => (
            <code {...props} className={className}>
              {children}
            </code>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

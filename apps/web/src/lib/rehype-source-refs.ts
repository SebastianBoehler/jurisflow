/**
 * rehype plugin – wraps inline [S1]–[S99] source references in a
 * styled <span class="source-ref"> element so they appear as badges
 * inside the rendered report markdown.
 *
 * This is a pure hast (HTML AST) transform; no extra npm packages needed.
 * It works with both ReactMarkdown and @assistant-ui/react-markdown's
 * MarkdownTextPrimitive since both accept rehypePlugins.
 */

type HastNode = {
  type: string;
  value?: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

const SOURCE_REF_RE = /\[S(\d{1,2})\]/g;

/**
 * Walk the hast tree and split any text node that contains [S1]…[S99]
 * into alternating text + element nodes.
 */
function processNode(node: HastNode): void {
  if (!node.children?.length) return;

  const next: HastNode[] = [];
  for (const child of node.children) {
    if (child.type === "text" && child.value && SOURCE_REF_RE.test(child.value)) {
      SOURCE_REF_RE.lastIndex = 0;
      next.push(...splitIntoRefs(child.value));
    } else {
      processNode(child);
      next.push(child);
    }
  }
  node.children = next;
}

function splitIntoRefs(text: string): HastNode[] {
  const nodes: HastNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  SOURCE_REF_RE.lastIndex = 0;

  while ((m = SOURCE_REF_RE.exec(text)) !== null) {
    if (m.index > last) {
      nodes.push({ type: "text", value: text.slice(last, m.index) });
    }
    nodes.push({
      type: "element",
      tagName: "span",
      properties: { className: ["source-ref"] },
      children: [{ type: "text", value: m[0] }],
    });
    last = m.index + m[0].length;
  }

  if (last < text.length) {
    nodes.push({ type: "text", value: text.slice(last) });
  }
  return nodes;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function rehypeSourceRefs(): (tree: any) => void {
  return (tree) => processNode(tree);
}

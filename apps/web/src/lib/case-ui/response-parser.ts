export function extractCodeOnly(response: string): string | null {
  const fenceRegex = /```[\w-]*\n([\s\S]*?)```/g;
  const blocks: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = fenceRegex.exec(response)) !== null) {
    blocks.push(match[1].trim());
  }

  if (blocks.length > 0) return blocks.join("\n");

  const unclosedMatch = response.match(/```[\w-]*\n([\s\S]*)$/);
  if (unclosedMatch) return unclosedMatch[1].trim() || null;

  return isPureCode(response) ? response.trim() : null;
}

export function extractText(response: string): string {
  const withoutClosedBlocks = response.replace(/```[\w-]*\n[\s\S]*?```/g, "").trim();
  const withoutUnclosedBlocks = withoutClosedBlocks.replace(/```[\w-]*\n[\s\S]*$/g, "").trim();

  if (withoutUnclosedBlocks && isPureCode(withoutUnclosedBlocks)) return "";

  return withoutUnclosedBlocks;
}

export function responseHasCode(response: string): boolean {
  if (/```[\w-]*\n/.test(response)) return true;
  return /^[a-zA-Z_$][\w$]*\s*=/.test(response.trim());
}

function isPureCode(response: string): boolean {
  const lines = response.trim().split("\n").filter((line) => line.trim());
  if (lines.length === 0 || /```/.test(response)) return false;

  const statementCount = lines.filter((line) => /^[a-zA-Z_$][\w$]*\s*=/.test(line.trim())).length;
  return statementCount / lines.length > 0.7;
}

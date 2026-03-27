function stringifyFallback(result: unknown) {
  if (result == null) return "";
  try {
    return JSON.stringify(result, null, 2);
  } catch {
    return String(result);
  }
}

function unwrapResultString(value: string) {
  const trimmed = value.trim();

  if (trimmed.startsWith("{'result': '") && trimmed.endsWith("'}")) {
    return trimmed.slice(12, -2);
  }

  if (trimmed.startsWith('{"result":"') && trimmed.endsWith('"}')) {
    return trimmed.slice(11, -2);
  }

  return trimmed;
}

export function getToolResultText(result: unknown) {
  if (typeof result === "object" && result && "result" in result && typeof result.result === "string") {
    return result.result;
  }

  if (typeof result !== "string") {
    return stringifyFallback(result);
  }

  return unwrapResultString(result)
    .replace(/\\n/g, "\n")
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'");
}

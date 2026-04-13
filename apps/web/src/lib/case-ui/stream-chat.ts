export type LlmToolCall = {
  id: string;
  name: string;
  status: "calling" | "done";
};

export async function streamCaseUiChat(
  endpoint: string,
  messages: Array<{ role: string; content: string }>,
  onChunk: (text: string) => void,
  onDone: () => void,
  signal?: AbortSignal,
) {
  let response: Response;

  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return;
    onChunk(`Error: ${error instanceof Error ? error.message : "Failed to reach case UI stream"}`);
    onDone();
    return;
  }

  if (!response.ok) {
    onChunk(`Error: ${await response.text()}`);
    onDone();
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    onChunk("Error: empty stream response");
    onDone();
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") {
        onDone();
        return;
      }

      try {
        const chunk = JSON.parse(data);
        if (typeof chunk.error === "string") {
          onChunk(`Error: ${chunk.error}`);
          onDone();
          return;
        }

        const content = chunk.choices?.[0]?.delta?.content;
        if (content) onChunk(content);
      } catch {
        // Ignore partial SSE payloads.
      }
    }
  }

  onDone();
}

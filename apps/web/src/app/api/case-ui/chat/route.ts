import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { buildCaseUiPrompt } from "@/lib/case-ui/prompt";

type IncomingMessage = {
  role: "user" | "assistant";
  content: string;
};

function toSseStream(stream: AsyncIterable<unknown>) {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (error) {
        const message = error instanceof Error ? error.message : "Case UI generation failed";
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`));
      } finally {
        controller.close();
      }
    },
  });
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || "";
  if (!apiKey) {
    return NextResponse.json(
      { error: "Set LLM_API_KEY or OPENAI_API_KEY before using the case UI agent." },
      { status: 500 },
    );
  }

  const body = (await request.json()) as { messages?: IncomingMessage[] };
  const messages = (body.messages ?? []).filter(
    (message) =>
      (message.role === "user" || message.role === "assistant") &&
      typeof message.content === "string",
  );

  const client = new OpenAI({
    apiKey,
    baseURL: process.env.LLM_BASE_URL || "https://api.openai.com/v1",
  });
  const stream = await client.chat.completions.create({
    messages: [{ role: "system", content: buildCaseUiPrompt() }, ...messages],
    model: process.env.CASE_UI_MODEL || process.env.LLM_MODEL || "gpt-5.4-mini",
    stream: true,
  });

  return new Response(toSseStream(stream), {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream",
    },
  });
}

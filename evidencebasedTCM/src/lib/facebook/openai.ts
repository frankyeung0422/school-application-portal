/**
 * Minimal OpenAI chat-completion helper for FB content generation.
 *
 * Uses raw fetch (same pattern as src/lib/research/grade-paper.ts) — no SDK
 * dependency. Returns the message string only.
 */

const MODEL = process.env.FB_OPENAI_MODEL ?? "gpt-4o-mini";
const ENDPOINT = "https://api.openai.com/v1/chat/completions";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function chat(args: {
  messages: ChatMessage[];
  temperature?: number;
  responseFormat?: "text" | "json_object";
  maxTokens?: number;
}): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

  const body: Record<string, unknown> = {
    model: MODEL,
    messages: args.messages,
    temperature: args.temperature ?? 0.8,
    max_tokens: args.maxTokens ?? 1200,
  };
  if (args.responseFormat === "json_object") {
    body.response_format = { type: "json_object" };
  }

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenAI HTTP ${res.status}: ${text.slice(0, 400)}`);
  }
  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI returned empty content");
  return content;
}

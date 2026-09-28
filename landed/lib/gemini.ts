import { GoogleGenAI } from "@google/genai";

const MODEL_CASCADE = ["gemini-2.5-flash", "gemini-2.5-pro"];

let client: GoogleGenAI | null = null;

export function getGemini(): GoogleGenAI {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set");
  }
  if (!client) client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

export interface InlineImage {
  mimeType: string;
  data: string; // base64
}

/**
 * JSON-mode generation with model cascade. Returns the parsed object and the
 * model that produced it.
 */
export async function generateJson<T>(
  prompt: string,
  responseSchema: object,
  images: InlineImage[] = [],
): Promise<{ value: T; model: string }> {
  const ai = getGemini();
  const parts: object[] = [
    { text: prompt },
    ...images.map((img) => ({ inlineData: img })),
  ];
  let lastError: unknown;
  for (const model of MODEL_CASCADE) {
    try {
      const res = await ai.models.generateContent({
        model,
        contents: [{ role: "user", parts }],
        config: {
          responseMimeType: "application/json",
          responseSchema,
        },
      });
      const text = (res.text ?? "").replace(/^```(json)?|```$/g, "").trim();
      return { value: JSON.parse(text) as T, model };
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error(`Gemini cascade failed: ${String(lastError)}`);
}

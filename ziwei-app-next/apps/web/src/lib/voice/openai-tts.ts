import 'server-only';
import { createHash } from 'node:crypto';
import { env } from '@/lib/env';
import { synthesize as synthesizeElevenLabs, type SynthesizeResult } from './elevenlabs';

/**
 * OpenAI TTS wrapper, mirroring the ElevenLabs `synthesize()` interface so the
 * two providers are interchangeable. Used for the AI 師傅 voice (zero setup —
 * OPENAI_API_KEY is already configured). Output: mp3.
 *
 * Voice: 'onyx' — a deeper, measured voice that fits a 命理師傅 persona.
 * Model: 'gpt-4o-mini-tts' (supports an `instructions` field for spoken tone);
 * falls back to 'tts-1' on error.
 */

const API = 'https://api.openai.com/v1/audio/speech';
const DEFAULT_VOICE = 'onyx';
const TONE_INSTRUCTIONS =
  '請用粵語（廣東話、香港口音）朗讀，務必以廣東話發音，切勿用普通話／國語發音。' +
  '以一位沉穩、睿智、和藹的命理師傅語氣說話, 語速從容, 帶長者的篤定與溫度, 像當面為人論命。';

export interface OpenAITTSParams {
  text: string;
  voice?: string;
  /** Spoken-tone steering (gpt-4o-mini-tts only). */
  instructions?: string;
}

function key(voice: string, model: string, text: string): string {
  return createHash('sha256').update(`openai:${voice}:${model}:${text}`).digest('hex');
}

async function callOpenAITTS(model: string, voice: string, text: string, instructions?: string): Promise<ArrayBuffer> {
  const res = await fetch(API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      voice,
      input: text,
      response_format: 'mp3',
      ...(model === 'gpt-4o-mini-tts' && instructions ? { instructions } : {}),
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI TTS ${res.status}: ${errText.slice(0, 200)}`);
  }
  return res.arrayBuffer();
}

export async function synthesizeOpenAI(params: OpenAITTSParams): Promise<SynthesizeResult> {
  if (!env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not configured');
  const voice = params.voice ?? DEFAULT_VOICE;
  const instructions = params.instructions ?? TONE_INSTRUCTIONS;

  let buf: ArrayBuffer;
  let model = 'gpt-4o-mini-tts';
  try {
    buf = await callOpenAITTS(model, voice, params.text, instructions);
  } catch (err) {
    console.warn('[openai-tts] gpt-4o-mini-tts failed, falling back to tts-1:', (err as Error).message);
    model = 'tts-1';
    buf = await callOpenAITTS(model, voice, params.text);
  }
  return { audio: new Uint8Array(buf), cacheKey: key(voice, model, params.text), mimeType: 'audio/mpeg' };
}

/**
 * Provider-agnostic master voice. Prefers ElevenLabs when a key + voice id are
 * configured (higher quality); otherwise uses OpenAI TTS. Swapping later is a
 * no-op for callers.
 */
export async function synthesizeMasterVoice(text: string): Promise<SynthesizeResult> {
  if (env.ELEVENLABS_API_KEY && env.ELEVENLABS_VOICE_ID) {
    try {
      return await synthesizeElevenLabs({ text });
    } catch (err) {
      console.warn('[voice] ElevenLabs failed, falling back to OpenAI TTS:', (err as Error).message);
    }
  }
  return synthesizeOpenAI({ text });
}

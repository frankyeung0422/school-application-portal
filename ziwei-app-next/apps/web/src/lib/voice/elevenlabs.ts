import 'server-only';
import { createHash } from 'node:crypto';
import { env } from '@/lib/env';

/**
 * ElevenLabs TTS wrapper for daily fortune audio.
 *
 * Strategy:
 *  - Output: mp3, 22050 Hz (smaller file, fine for daily fortune)
 *  - Cache by hash(voiceId + modelId + text) → R2 (when configured) or in-memory
 *  - Use the configured Mandarin voice (default voice id from env)
 *
 * For v0.1 we return the audio bytes from the cache helper; the caller
 * uploads to R2 (or serves directly). To keep this module dependency-free
 * we don't import an R2 SDK here — see lib/storage/r2.ts (TODO).
 */

const API = 'https://api.elevenlabs.io/v1';

function key(voiceId: string, modelId: string, text: string): string {
  return createHash('sha256').update(`${voiceId}:${modelId}:${text}`).digest('hex');
}

export interface SynthesizeParams {
  text: string;
  voiceId?: string;
  modelId?: string; // e.g. 'eleven_multilingual_v2'
}

export interface SynthesizeResult {
  audio: Uint8Array;
  cacheKey: string;
  mimeType: 'audio/mpeg';
}

export async function synthesize(params: SynthesizeParams): Promise<SynthesizeResult> {
  if (!env.ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY not configured');
  }
  const voiceId = params.voiceId ?? env.ELEVENLABS_VOICE_ID;
  if (!voiceId) throw new Error('ELEVENLABS_VOICE_ID not configured (and no override passed)');
  const modelId = params.modelId ?? 'eleven_multilingual_v2';

  const cacheKey = key(voiceId, modelId, params.text);

  const res = await fetch(`${API}/text-to-speech/${voiceId}?output_format=mp3_22050_32`, {
    method: 'POST',
    headers: {
      'xi-api-key': env.ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text: params.text,
      model_id: modelId,
      voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.2 },
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`ElevenLabs ${res.status}: ${errText.slice(0, 200)}`);
  }
  const buf = await res.arrayBuffer();
  return { audio: new Uint8Array(buf), cacheKey, mimeType: 'audio/mpeg' };
}

/**
 * Estimate cost (USD). ElevenLabs charges per character; 11 plan tiers exist.
 * For accounting only — actual billing on their dashboard.
 */
export function estimateCost(text: string, plan: 'starter' | 'creator' | 'pro' = 'creator'): number {
  // Approximate cost per char on Creator tier: ~$0.18 / 1000 chars
  const perChar = { starter: 0.30 / 1000, creator: 0.18 / 1000, pro: 0.11 / 1000 }[plan];
  return text.length * perChar;
}

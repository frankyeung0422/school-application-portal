import { NextResponse } from 'next/server';
import { z } from 'zod';
import { synthesizeMasterVoice } from '@/lib/voice/openai-tts';
import { requireSession } from '@/lib/auth/session';

export const runtime = 'nodejs';
export const maxDuration = 60;

const schema = z.object({ text: z.string().min(1).max(2000) });

/**
 * Voice for the AI 師傅. Takes the assistant's text reply (already produced and
 * quota-gated by askMaster) and returns spoken audio/mpeg. Auth-only — the
 * chat quota is enforced upstream in askMaster, so this isn't premium-gated.
 * Provider: ElevenLabs when configured, else OpenAI TTS.
 */
export async function POST(req: Request) {
  await requireSession();
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'text required' }, { status: 400 });

  try {
    const result = await synthesizeMasterVoice(parsed.data.text);
    return new Response(new Uint8Array(result.audio), {
      headers: {
        'Content-Type': result.mimeType,
        'X-Cache-Key': result.cacheKey,
        'Cache-Control': 'private, max-age=86400',
      },
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

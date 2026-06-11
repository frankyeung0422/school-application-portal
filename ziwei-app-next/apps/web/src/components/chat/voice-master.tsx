'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui';
import { askMaster, type AskMasterResult } from '@/lib/chat/actions';
import { useSpeechRecognition } from '@/lib/voice/use-speech-recognition';
import { MasterAvatar, type MasterState } from './master-avatar';

export interface VoiceMasterProps {
  chartId: string;
  initialConversationId: string | null;
  quota: { unlimited: boolean; used: number; limit: number; remaining: number };
  /** Avatar diameter px (larger for the immersive page). */
  avatarSize?: number;
}

const STARTERS = ['我今年運勢如何?', '我適合創業還是受雇?', '我的感情會有結果嗎?'];

/**
 * Voice 師傅: push-to-talk (Web Speech) → askMaster(voice) → OpenAI/ElevenLabs
 * TTS (/api/voice/master) played while the portrait's aura reacts to the audio
 * amplitude. Typed fallback when Web Speech is unsupported; text is always
 * shown as captions so the experience degrades gracefully without audio.
 */
export function VoiceMaster({ chartId, initialConversationId, quota, avatarSize = 200 }: VoiceMasterProps) {
  const [conversationId, setConversationId] = useState(initialConversationId);
  const [state, setState] = useState<MasterState>('idle');
  const [level, setLevel] = useState(0);
  const [userText, setUserText] = useState('');
  const [reply, setReply] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [typed, setTyped] = useState('');
  const [usedThisSession, setUsedThisSession] = useState(0);
  const [isPending, startTransition] = useTransition();

  const sr = useSpeechRecognition('zh-HK');
  const submitOnStop = useRef(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const srcNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);

  const remaining = quota.unlimited ? Infinity : Math.max(0, quota.remaining - usedThisSession);
  const quotaExhausted = !quota.unlimited && remaining <= 0;

  const stopMeter = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    setLevel(0);
  }, []);

  const ensureGraph = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    if (!ctxRef.current) {
      const Ctx = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
      ctxRef.current = new Ctx();
    }
    const ctx = ctxRef.current;
    if (!srcNodeRef.current) {
      srcNodeRef.current = ctx.createMediaElementSource(el);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      srcNodeRef.current.connect(analyser);
      analyser.connect(ctx.destination);
      analyserRef.current = analyser;
    }
  }, []);

  const runMeter = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const arr = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteFrequencyData(arr);
      let sum = 0;
      for (let i = 0; i < arr.length; i++) sum += arr[i];
      setLevel(Math.min(1, sum / arr.length / 140));
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();
  }, []);

  const speak = useCallback(async (text: string) => {
    try {
      const res = await fetch('/api/voice/master', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error('voice ' + res.status);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const el = audioRef.current;
      if (!el) return;
      ensureGraph();
      await ctxRef.current?.resume();
      el.src = url;
      el.onended = () => { stopMeter(); setState('idle'); URL.revokeObjectURL(url); };
      setState('speaking');
      runMeter();
      await el.play();
    } catch (err) {
      // Audio failed — keep the text reply visible, just drop to idle.
      console.warn('[voice-master] speak failed:', (err as Error).message);
      stopMeter();
      setState('idle');
    }
  }, [ensureGraph, runMeter, stopMeter]);

  const ask = useCallback((question: string) => {
    const q = question.trim();
    if (!q || isPending) return;
    if (quotaExhausted) { setError('本月免費提問已用完, 升級訂閱即可無限詢問。'); return; }
    setError(null);
    setUserText(q);
    setReply('');
    setState('thinking');
    startTransition(async () => {
      const result: AskMasterResult = await askMaster({ chartId, conversationId, question: q, voice: true });
      if (result.ok) {
        setConversationId(result.conversationId);
        setUsedThisSession((n) => n + 1);
        setReply(result.assistant);
        await speak(result.assistant);
      } else {
        setState('idle');
        if (result.error === 'quota-exceeded') setError('本月免費提問已用完, 升級訂閱即可無限詢問。');
        else if (result.error === 'unauthenticated') setError('請先登入。');
        else if (result.error === 'ai-failed') setError('師傅暫時離席, 請稍後再試。');
        else setError(result.message || '出了點問題, 請稍後再試。');
      }
    });
  }, [chartId, conversationId, isPending, quotaExhausted, speak]);

  // When recognition ends after the user taps stop, submit the transcript.
  useEffect(() => {
    if (!sr.listening && submitOnStop.current) {
      submitOnStop.current = false;
      const t = sr.transcript.trim();
      // Reacting to the speech-recognition lifecycle ending — a valid external-system effect.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (t) ask(t);
      else setState('idle');
    }
  }, [sr.listening, sr.transcript, ask]);

  useEffect(() => () => { stopMeter(); }, [stopMeter]);

  function toggleMic() {
    if (isPending || state === 'speaking') return;
    if (sr.listening) {
      submitOnStop.current = true;
      sr.stop();
    } else {
      if (quotaExhausted) { setError('本月免費提問已用完, 升級訂閱即可無限詢問。'); return; }
      setError(null);
      setReply('');
      setUserText('');
      sr.start();
      setState('listening');
    }
  }

  const liveTranscript = sr.listening ? sr.transcript : '';

  return (
    <div className="flex flex-col items-center gap-5">
      <MasterAvatar state={state} level={level} size={avatarSize} />
      <audio ref={audioRef} hidden />

      {/* captions */}
      <div className="w-full max-w-xl min-h-[3rem] text-center">
        {(liveTranscript || userText) && (
          <p className="text-sm text-[var(--color-gold)] mb-2">「{liveTranscript || userText}」</p>
        )}
        {reply && (
          <p className="text-[var(--color-fg)] leading-[1.9] whitespace-pre-wrap text-left bg-[var(--color-bg-deep)] rounded-[var(--radius)] p-4 shadow-[var(--shadow-rim-gold)]">
            {reply}
          </p>
        )}
        {error && <p className="text-xs text-[var(--color-danger)] mt-2">{error}</p>}
      </div>

      {/* mic control */}
      {sr.supported ? (
        <Button
          type="button"
          size="lg"
          variant={sr.listening ? 'primary' : 'gold'}
          onClick={toggleMic}
          disabled={isPending || state === 'speaking' || quotaExhausted}
        >
          {sr.listening ? '◉ 說完了, 請師傅解答' : isPending ? '師傅思考中…' : state === 'speaking' ? '師傅論命中…' : '🎙 按住開口問師傅'}
        </Button>
      ) : (
        <p className="text-xs text-[var(--color-fg-subtle)]">此瀏覽器不支援語音輸入, 請用下方文字提問 (建議用 Chrome / Edge)。</p>
      )}

      {/* starters + typed fallback */}
      {!sr.listening && state === 'idle' && !reply && (
        <div className="flex flex-wrap justify-center gap-2">
          {STARTERS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => ask(s)}
              disabled={isPending || quotaExhausted}
              className="text-xs px-3 py-1.5 rounded-[var(--radius)] bg-[var(--color-bg-elevated)] text-[var(--color-fg-muted)] hover:text-[var(--color-gold-bright)] hover:bg-[var(--color-gold)]/10 transition-colors disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        className="flex items-center gap-2 w-full max-w-xl"
        onSubmit={(e) => { e.preventDefault(); if (typed.trim()) { ask(typed); setTyped(''); } }}
      >
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={quotaExhausted ? '本月提問已用完 — 升級訂閱繼續' : '或在此輸入問題…'}
          disabled={isPending || quotaExhausted || state === 'speaking'}
          className="flex-1 rounded-[var(--radius)] px-4 h-11 bg-[var(--color-bg-deep)] text-[var(--color-fg)] text-sm shadow-[var(--shadow-rim-gold)] placeholder:text-[var(--color-fg-subtle)] focus:outline-none disabled:opacity-50"
        />
        <Button type="submit" size="md" variant="ghost" disabled={isPending || quotaExhausted || !typed.trim()}>送出</Button>
      </form>

      <p className="text-xs text-[var(--color-fg-muted)]">
        {quota.unlimited ? (
          <span className="text-[var(--color-gold-bright)]">訂閱會員 · 無限提問</span>
        ) : (
          <>本月剩餘 <span className="text-[var(--color-gold-bright)]">{remaining === Infinity ? '∞' : remaining}</span> / {quota.limit} 次
            {remaining <= 1 && <Link href="/pricing" className="text-[var(--color-gold)] hover:underline">升級 →</Link>}
          </>
        )}
      </p>
    </div>
  );
}

'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui';
import { askMaster, type AskMasterResult } from '@/lib/chat/actions';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  pending?: boolean;
};

export interface MasterChatProps {
  chartId: string;
  initialConversationId: string | null;
  initialMessages: { id: string; role: 'user' | 'assistant'; content: string }[];
  quota: { unlimited: boolean; used: number; limit: number; remaining: number };
  archetypeLabel: string;
}

const STARTER_PROMPTS = [
  '我今年事業會有什麼變動?',
  '我命中的另一半會是什麼樣的人?',
  '我命盤中最大的盲點是什麼?',
  '我適合創業還是受雇?',
];

export function MasterChat({
  chartId,
  initialConversationId,
  initialMessages,
  quota,
  archetypeLabel,
}: MasterChatProps) {
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [usedThisSession, setUsedThisSession] = useState(0);
  const [isPending, startTransition] = useTransition();
  const threadRef = useRef<HTMLDivElement>(null);

  const remaining = quota.unlimited
    ? Infinity
    : Math.max(0, quota.remaining - usedThisSession);
  const quotaExhausted = !quota.unlimited && remaining <= 0;

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  function send(question: string) {
    const trimmed = question.trim();
    if (!trimmed) return;
    if (isPending) return;
    if (quotaExhausted) {
      setError('本月免費提問已用完, 升級訂閱即可無限詢問。');
      return;
    }

    setError(null);
    setInput('');
    const tempUserId = 'tmp-u-' + Date.now();
    const tempAssistantId = 'tmp-a-' + Date.now();
    setMessages((prev) => [
      ...prev,
      { id: tempUserId, role: 'user', content: trimmed },
      { id: tempAssistantId, role: 'assistant', content: '師傅正在閱您命盤 ...', pending: true },
    ]);

    startTransition(async () => {
      const result: AskMasterResult = await askMaster({
        chartId,
        conversationId,
        question: trimmed,
      });
      if (result.ok) {
        setConversationId(result.conversationId);
        setUsedThisSession((n) => n + 1);
        setMessages((prev) => prev.map((m) =>
          m.id === tempAssistantId
            ? { id: tempAssistantId, role: 'assistant', content: result.assistant }
            : m,
        ));
      } else {
        // Roll back the optimistic turns and surface the error
        setMessages((prev) => prev.filter((m) => m.id !== tempUserId && m.id !== tempAssistantId));
        if (result.error === 'quota-exceeded') {
          setError('本月免費提問已用完, 升級訂閱即可無限詢問。');
        } else if (result.error === 'unauthenticated') {
          setError('請先登入。');
        } else if (result.error === 'chart-not-found') {
          setError('找不到此命盤。');
        } else if (result.error === 'ai-failed') {
          setError('師傅暫時離席, 請稍後再試。' + (result.message ? ` (${result.message})` : ''));
        } else {
          setError(result.message || '送出失敗, 請稍後再試。');
        }
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-display text-2xl text-[var(--color-gold-bright)] mb-1">問師傅</h2>
          <p className="text-xs text-[var(--color-fg-muted)]">
            針對您的<span className="text-[var(--color-gold)]">{archetypeLabel}</span>命盤, 隨時提問。回答僅供參考, 重大決定請結合專業意見。
          </p>
        </div>
        <div className="text-xs text-right text-[var(--color-fg-muted)]">
          {quota.unlimited ? (
            <span className="text-[var(--color-gold-bright)]">訂閱會員 · 無限提問</span>
          ) : (
            <>
              <div>本月剩餘 <span className="text-[var(--color-gold-bright)]">{remaining}</span> / {quota.limit} 次</div>
              {remaining <= 1 && (
                <Link href="/pricing" className="text-[var(--color-gold)] hover:underline">升級無限提問 →</Link>
              )}
            </>
          )}
        </div>
      </div>

      <div
        ref={threadRef}
        className="flex flex-col gap-3 max-h-[520px] overflow-y-auto bg-[var(--color-bg-deep)] p-4 rounded-[var(--radius)] shadow-[var(--shadow-rim-gold)]"
      >
        {messages.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-[var(--color-fg-muted)] mb-4">師傅在此, 您想問什麼?</p>
            <div className="flex flex-col items-stretch gap-2 max-w-md mx-auto">
              {STARTER_PROMPTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => send(p)}
                  disabled={isPending || quotaExhausted}
                  className="text-left text-sm px-3 py-2 rounded-[var(--radius)] bg-[var(--color-bg-elevated)] text-[var(--color-fg-muted)] hover:text-[var(--color-gold-bright)] hover:bg-[var(--color-gold)]/10 transition-colors disabled:opacity-50"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={
              m.role === 'user'
                ? 'self-end max-w-[85%] px-4 py-2 rounded-[var(--radius)] bg-[var(--color-gold)]/15 text-[var(--color-fg)] text-sm leading-relaxed'
                : 'self-start max-w-[92%] px-4 py-3 rounded-[var(--radius)] bg-[var(--color-bg-elevated)] text-[var(--color-paper-ink,#f5efe0)] text-sm leading-[1.75] whitespace-pre-wrap'
            }
          >
            {m.role === 'assistant' && m.pending ? (
              <span className="italic text-[var(--color-fg-muted)]">{m.content}</span>
            ) : (
              m.content
            )}
          </div>
        ))}
      </div>

      {error && (
        <p className="text-xs text-[var(--color-danger)]">{error}</p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-end gap-2"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          placeholder={quotaExhausted ? '本月提問已用完 — 升級訂閱繼續' : '在此輸入您的問題, Enter 送出, Shift+Enter 換行'}
          disabled={isPending || quotaExhausted}
          rows={2}
          className="flex-1 resize-none rounded-[var(--radius)] px-4 py-2 bg-[var(--color-bg-deep)] text-[var(--color-fg)] text-sm shadow-[var(--shadow-rim-gold)] placeholder:text-[var(--color-fg-subtle)] focus:outline-none focus:shadow-[var(--shadow-rim-strong),var(--shadow-glow-gold)] disabled:opacity-50"
        />
        <Button
          type="submit"
          variant="gold"
          size="md"
          disabled={isPending || quotaExhausted || !input.trim()}
        >
          {isPending ? '請示中' : '送出'}
        </Button>
      </form>
    </div>
  );
}

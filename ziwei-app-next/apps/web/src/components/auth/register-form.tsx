'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { Field, Input, Button } from '@/components/ui';
import { registerAction, type AuthState } from '@/lib/auth/actions';
import { PLAN_DISPLAY, DEFAULT_PLAN } from '@/lib/billing/plans';
import type { PlanKey } from '@/lib/billing/stripe';

const initial: AuthState = {};

function isPlanKey(v: string | undefined): v is PlanKey {
  return PLAN_DISPLAY.some((p) => p.id === v);
}

export function RegisterForm({ defaultEmail, plan }: { defaultEmail?: string; plan?: string }) {
  const [state, formAction, pending] = useActionState(registerAction, initial);
  const [selected, setSelected] = useState<PlanKey>(isPlanKey(plan) ? plan : DEFAULT_PLAN);

  return (
    <form action={formAction} method="POST" className="flex flex-col gap-5">
      <Field label="電子郵件" htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          required
          defaultValue={defaultEmail}
          placeholder="your@email.com"
          autoComplete="email"
        />
      </Field>
      <Field label="密碼" htmlFor="password" hint="至少 8 字符">
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </Field>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-[var(--color-fg)] mb-1">選擇方案</legend>
        {PLAN_DISPLAY.map((p) => {
          const active = selected === p.id;
          return (
            <label
              key={p.id}
              className={`flex items-center gap-3 cursor-pointer rounded-[var(--radius)] border px-4 py-3 transition-colors ${
                active
                  ? 'border-[var(--color-gold)] bg-[var(--color-gold)]/10'
                  : 'border-[var(--color-border)] hover:border-[var(--color-gold)]/50'
              }`}
            >
              <input
                type="radio"
                name="plan"
                value={p.id}
                checked={active}
                onChange={() => setSelected(p.id)}
                className="accent-[var(--color-gold)]"
              />
              <span className="flex-1">
                <span className="flex items-baseline gap-2">
                  <span className="font-display text-base text-[var(--color-gold-bright)]">{p.name}</span>
                  {p.badge && (
                    <span className="text-[10px] uppercase tracking-wider text-[var(--color-gold)]">
                      {p.badge}
                    </span>
                  )}
                </span>
                <span className="block text-xs text-[var(--color-fg-muted)]">{p.tagline}</span>
              </span>
              <span className="text-right whitespace-nowrap">
                <span className="font-display text-[var(--color-fg)]">HK${p.price.toLocaleString()}</span>
                <span className="text-xs text-[var(--color-fg-muted)]">{p.period}</span>
              </span>
            </label>
          );
        })}
        <p className="text-xs text-[var(--color-fg-subtle)]">所有方案均含 7 天免費試用,試用期內隨時取消不扣款。</p>
      </fieldset>

      {state.error && (
        <p role="alert" className="text-sm text-[var(--color-danger)]">
          {state.error}
        </p>
      )}

      {/* intent=pay → after signup, redirect to Stripe checkout for the selected plan. */}
      <Button type="submit" name="intent" value="pay" size="lg" variant="gold" disabled={pending}>
        {pending ? '建立中…' : '建立帳戶並付款'}
      </Button>

      {/* intent=free → registerAction skips checkout and lands on the dashboard. */}
      <button
        type="submit"
        name="intent"
        value="free"
        disabled={pending}
        className="text-xs text-[var(--color-fg-subtle)] text-center hover:text-[var(--color-gold-bright)] transition-colors disabled:opacity-50"
      >
        略過,先用免費版 →
      </button>

      <p className="text-xs text-[var(--color-fg-subtle)] text-center">
        按下「建立帳戶」即代表你同意我們的{' '}
        <Link href="/terms" className="underline">服務條款</Link> 及{' '}
        <Link href="/privacy" className="underline">私隱政策</Link>。
      </p>
      <p className="text-sm text-center text-[var(--color-fg-muted)]">
        已有帳戶?{' '}
        <Link href="/login" className="text-[var(--color-gold)] hover:underline">
          立即登入
        </Link>
      </p>
    </form>
  );
}

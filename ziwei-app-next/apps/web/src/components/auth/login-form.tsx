'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { Field, Input, Button } from '@/components/ui';
import { loginAction, type AuthState } from '@/lib/auth/actions';

const initial: AuthState = {};

export function LoginForm({ defaultEmail }: { defaultEmail?: string }) {
  const [state, formAction, pending] = useActionState(loginAction, initial);
  return (
    <div className="flex flex-col gap-5">
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
        <Field label="密碼" htmlFor="password">
          <Input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
          />
        </Field>
        {state.error && (
          <p role="alert" className="text-sm text-[var(--color-danger)]">
            {state.error}
          </p>
        )}
        <Button type="submit" size="lg" variant="gold" disabled={pending}>
          {pending ? '登入中…' : '登入'}
        </Button>
        <div className="text-center">
          <Link
            href="/login/magic"
            className="text-sm text-[var(--color-gold)] hover:underline"
          >
            改用電郵連結登入 →
          </Link>
        </div>
        <div className="flex items-center justify-between text-sm">
          <Link href="/forgot" className="text-[var(--color-gold)] hover:underline">
            忘記密碼?
          </Link>
          <Link href="/register" className="text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]">
            新用戶註冊
          </Link>
        </div>
      </form>
    </div>
  );
}

'use client';

import { useActionState } from 'react';
import { Field, Input, Button } from '@/components/ui';
import { magicLinkRequestAction, type AuthState } from '@/lib/auth/actions';

const initial: AuthState = {};

export function MagicForm() {
  const [state, formAction, pending] = useActionState(magicLinkRequestAction, initial);
  return (
    <form action={formAction} method="POST" className="flex flex-col gap-5">
      <Field label="電子郵件" htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          required
          placeholder="your@email.com"
          autoComplete="email"
          disabled={state.ok}
        />
      </Field>
      {state.error && (
        <p role="alert" className="text-sm text-[var(--color-danger)]">
          {state.error}
        </p>
      )}
      {state.message && (
        <p role="status" className="text-sm text-[var(--color-jade)]">
          ✦ {state.message}
        </p>
      )}
      {!state.ok && (
        <Button type="submit" size="lg" variant="gold" disabled={pending}>
          {pending ? '寄送中…' : '寄出登入連結'}
        </Button>
      )}
    </form>
  );
}

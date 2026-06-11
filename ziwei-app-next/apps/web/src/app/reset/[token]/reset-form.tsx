'use client';

import { useActionState } from 'react';
import { Field, Input, Button } from '@/components/ui';
import { resetPasswordAction, type AuthState } from '@/lib/auth/actions';

const initial: AuthState = {};

export function ResetForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(resetPasswordAction, initial);
  return (
    <form action={formAction} method="POST" className="flex flex-col gap-5">
      <input type="hidden" name="token" value={token} />
      <Field label="新密碼" htmlFor="password" hint="至少 8 個字符">
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </Field>
      {state.error && (
        <p role="alert" className="text-sm text-[var(--color-danger)]">
          {state.error}
        </p>
      )}
      <Button type="submit" size="lg" variant="gold" disabled={pending}>
        {pending ? '更新中…' : '設定新密碼並登入'}
      </Button>
    </form>
  );
}

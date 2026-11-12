'use client';

import { startTransition, useActionState, type FormEvent } from 'react';
import { Button, Field, FormMessage, Input } from '@/components/ui';
import { IDLE } from '@/lib/action-state';
import { loginAdmin } from './actions';

export function LoginForm() {
  const [state, dispatch, pending] = useActionState(loginAdmin, IDLE);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Field label="관리자 비밀번호" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required autoFocus />
      </Field>
      <Button size="lg" className="w-full" disabled={pending}>
        {pending ? '확인하는 중…' : '로그인'}
      </Button>
      <FormMessage state={state} />
    </form>
  );
}

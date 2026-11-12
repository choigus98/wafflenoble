'use client';

import { startTransition, useActionState, type FormEvent } from 'react';
import { updateGuildPassword } from '@/app/admin/actions';
import { Button, Field, FormMessage, Input } from '@/components/ui';
import { IDLE } from '@/lib/action-state';

export function GuildPasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [state, dispatch, pending] = useActionState(updateGuildPassword, IDLE);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  }

  return (
    <div className="space-y-4">
      {/* 성공하면 key가 바뀌어 입력칸이 비워진다 */}
      <form key={state.status === 'success' ? state.at : 'form'} onSubmit={handleSubmit} className="space-y-4">
        <Field label={hasPassword ? '새 열람 비밀번호' : '열람 비밀번호'} htmlFor="guild-password">
          <Input id="guild-password" name="password" autoComplete="off" required minLength={4} maxLength={64} />
        </Field>
        <Field label="한 번 더 입력" htmlFor="guild-password-confirm">
          <Input id="guild-password-confirm" name="confirm" autoComplete="off" required minLength={4} maxLength={64} />
        </Field>
        <Button disabled={pending}>{hasPassword ? '비밀번호 바꾸기' : '비밀번호 정하기'}</Button>
      </form>
      <FormMessage state={state} />
    </div>
  );
}

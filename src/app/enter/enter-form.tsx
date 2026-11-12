'use client';

import { startTransition, useActionState, useRef, useState, type FormEvent } from 'react';
import { Button, Field, FormMessage, Input } from '@/components/ui';
import { NICKNAME_MAX } from '@/lib/utils';
import { enterGuild, type EnterState } from './actions';

const INITIAL: EnterState = { status: 'idle' };

export function EnterForm({
  next,
  defaultName,
  closed,
  returning,
}: {
  next: string;
  defaultName: string;
  closed: boolean;
  returning: boolean;
}) {
  const [state, dispatch, pending] = useActionState(enterGuild, INITIAL);
  // '다른 이름 쓸게요'를 누르면 이번 확인 상태만 화면에서 닫는다 (서버 상태는 그대로)
  const [dismissed, setDismissed] = useState<EnterState | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  // form action 대신 직접 dispatch해서, 비밀번호가 틀려도 입력한 값이 지워지지 않게 한다
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  }

  if (closed) {
    return (
      <p className="rounded-2xl border border-line bg-surface p-5 text-center text-[15px] leading-relaxed text-muted">
        아직 열람이 열리지 않았어요.
        <br />
        작가님이 준비를 마치면 들어올 수 있어요.
      </p>
    );
  }

  const confirming = state.status === 'confirm' && state !== dismissed;

  function chooseAnotherName() {
    setDismissed(state);
    if (nameRef.current) {
      nameRef.current.value = '';
      nameRef.current.focus();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <input type="hidden" name="next" value={next} />
      {confirming && state.status === 'confirm' ? (
        <input type="hidden" name="confirmName" value={state.name} />
      ) : null}

      {returning ? (
        <p className="rounded-xl bg-accent-soft px-4 py-3 text-sm leading-relaxed text-fg">
          열람 비밀번호가 바뀌었어요. 새 비밀번호로 다시 들어와 주세요.
        </p>
      ) : null}

      <Field label="열람 비밀번호" htmlFor="password">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          autoFocus={!defaultName}
        />
      </Field>

      <Field label="이름" htmlFor="name" hint="좋아요를 누르면 이 이름이 보여요. 다른 기기에서도 같은 이름을 쓰면 기록이 이어져요.">
        <Input
          ref={nameRef}
          id="name"
          name="name"
          defaultValue={defaultName}
          autoComplete="nickname"
          maxLength={NICKNAME_MAX}
          required
          readOnly={confirming}
          autoFocus={Boolean(defaultName)}
        />
      </Field>

      {confirming ? (
        <div className="space-y-3 rounded-xl border border-accent/40 bg-accent-soft px-4 py-3.5">
          <p className="text-sm leading-relaxed">
            <strong>‘{state.status === 'confirm' ? state.name : ''}’</strong> 이름은 이미 있어요. 본인이면 그대로
            들어가세요.
          </p>
          <div className="flex gap-2">
            <Button size="sm" disabled={pending}>
              네, 본인이에요
            </Button>
            <Button size="sm" type="button" variant="secondary" onClick={chooseAnotherName}>
              다른 이름 쓸게요
            </Button>
          </div>
        </div>
      ) : (
        <Button size="lg" className="w-full" disabled={pending}>
          {pending ? '확인하는 중…' : '입장하기'}
        </Button>
      )}

      <FormMessage state={state} />
    </form>
  );
}

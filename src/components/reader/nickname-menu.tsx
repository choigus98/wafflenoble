'use client';

import { startTransition, useActionState, useRef, useState, type FormEvent } from 'react';
import { changeNickname, leaveGuild } from '@/app/(reader)/actions';
import { useDismiss } from '@/components/use-dismiss';
import { Button, FormMessage, Input } from '@/components/ui';
import { IDLE } from '@/lib/action-state';
import { NICKNAME_MAX } from '@/lib/utils';

export function NicknameMenu({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [state, dispatch, pending] = useActionState(changeNickname, IDLE);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // 바깥을 누르거나 Esc를 누르면 닫기 (Esc면 이름 버튼으로 포커스를 돌려준다)
  useDismiss({
    open,
    onClose: () => {
      setOpen(false);
      setEditing(false);
    },
    rootRef,
    triggerRef,
  });

  function handleRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex h-9 max-w-44 items-center gap-1.5 rounded-full border border-line bg-surface pr-3 pl-1.5 text-sm font-semibold transition hover:bg-surface-2"
      >
        <span aria-hidden="true" className="grid size-6 place-items-center rounded-full bg-accent-soft text-xs text-accent">
          {[...name][0]}
        </span>
        <span className="truncate">{name}님</span>
      </button>

      {open ? (
        <div className="absolute top-11 right-0 z-40 w-64 rounded-2xl border border-line bg-surface p-2 shadow-lg shadow-black/5">
          {editing ? (
            <form onSubmit={handleRename} className="space-y-2.5 p-2">
              <label htmlFor="new-name" className="block text-sm font-semibold">
                새 이름
              </label>
              <Input id="new-name" name="name" defaultValue={name} maxLength={NICKNAME_MAX} required autoFocus />
              <FormMessage state={state} />
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
                  취소
                </Button>
                <Button size="sm" disabled={pending}>
                  바꾸기
                </Button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col">
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="rounded-xl px-3 py-2.5 text-left text-sm hover:bg-surface-2"
              >
                이름 바꾸기
              </button>
              <form action={leaveGuild}>
                <button type="submit" className="w-full rounded-xl px-3 py-2.5 text-left text-sm text-muted hover:bg-surface-2">
                  나가기
                </button>
              </form>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

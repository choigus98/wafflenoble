'use client';

import { startTransition, useActionState, useMemo, type FormEvent } from 'react';
import { createNovel, updateNovel } from '@/app/admin/actions';
import { Button, Field, FormMessage, Input, Textarea } from '@/components/ui';
import { IDLE } from '@/lib/action-state';
import type { SerialStatus } from '@/lib/db/schema';
import { SERIAL_STATUS_LABEL } from '@/lib/utils';

type NovelInput = {
  id: number;
  title: string;
  description: string;
  serialStatus: SerialStatus;
  isPublished: boolean;
};

const STATUSES: SerialStatus[] = ['ongoing', 'completed', 'hiatus'];

/** novel이 있으면 수정, 없으면 새로 만들기 */
export function NovelForm({ novel }: { novel?: NovelInput }) {
  const novelId = novel?.id;
  const action = useMemo(() => (novelId ? updateNovel.bind(null, novelId) : createNovel), [novelId]);
  const [state, dispatch, pending] = useActionState(action, IDLE);

  // 저장 후에도 입력한 값이 그대로 남도록 form action 대신 직접 dispatch
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Field label="제목" htmlFor="novel-title">
        <Input id="novel-title" name="title" defaultValue={novel?.title} maxLength={100} required autoFocus={!novel} />
      </Field>

      <Field label="소개" htmlFor="novel-description" hint="작품 화면 맨 위에 보여요. 줄바꿈도 그대로 보여요.">
        <Textarea id="novel-description" name="description" defaultValue={novel?.description} rows={5} maxLength={2000} />
      </Field>

      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold">연재 상태</legend>
        <div className="flex gap-2">
          {STATUSES.map((status) => (
            <label
              key={status}
              className="flex h-10 flex-1 cursor-pointer items-center justify-center rounded-xl border border-line bg-surface text-sm font-semibold text-muted transition has-checked:border-accent has-checked:bg-accent-soft has-checked:text-accent has-focus-visible:outline-2 has-focus-visible:outline-accent"
            >
              <input
                type="radio"
                name="serialStatus"
                value={status}
                defaultChecked={(novel?.serialStatus ?? 'ongoing') === status}
                className="sr-only"
              />
              {SERIAL_STATUS_LABEL[status]}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-4">
        <input
          type="checkbox"
          name="isPublished"
          defaultChecked={novel?.isPublished ?? false}
          className="mt-0.5 size-5 shrink-0 accent-accent"
        />
        <span className="space-y-0.5">
          <span className="block text-sm font-semibold">길드원에게 공개</span>
          <span className="block text-[13px] leading-relaxed text-muted">
            끄면 작품 목록에서 숨겨지고, 발행한 회차도 함께 안 보여요.
          </span>
        </span>
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={pending}>{pending ? '저장하는 중…' : novel ? '저장' : '작품 만들기'}</Button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}

'use client';

import { startTransition, useActionState, useMemo, useState, type FormEvent } from 'react';
import { createNovel, updateNovel } from '@/app/admin/actions';
import { NovelCover } from '@/components/novel-cover';
import { Button, Field, FormMessage, Input, Textarea } from '@/components/ui';
import { IDLE } from '@/lib/action-state';
import { COVER_COLORS, COVER_COLOR_KEYS, autoCoverColor, isCoverColor, type CoverColor } from '@/lib/cover';
import type { SerialStatus } from '@/lib/db/schema';
import { SERIAL_STATUS_LABEL, cn } from '@/lib/utils';

type NovelInput = {
  id: number;
  title: string;
  description: string;
  serialStatus: SerialStatus;
  isPublished: boolean;
  coverColor: string | null;
  scheduleNote: string;
};

const STATUSES: SerialStatus[] = ['ongoing', 'completed', 'hiatus'];

/** novel이 있으면 수정, 없으면 새로 만들기 */
export function NovelForm({ novel }: { novel?: NovelInput }) {
  const novelId = novel?.id;
  const action = useMemo(() => (novelId ? updateNovel.bind(null, novelId) : createNovel), [novelId]);
  const [state, dispatch, pending] = useActionState(action, IDLE);
  // 표지 미리보기용 (입력칸 자체는 그대로 폼 값으로 보낸다)
  const [title, setTitle] = useState(novel?.title ?? '');
  const [coverColor, setCoverColor] = useState<CoverColor | null>(isCoverColor(novel?.coverColor) ? novel.coverColor : null);

  // 저장 후에도 입력한 값이 그대로 남도록 form action 대신 직접 dispatch
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Field label="제목" htmlFor="novel-title">
        <Input
          id="novel-title"
          name="title"
          defaultValue={novel?.title}
          maxLength={100}
          required
          autoFocus={!novel}
          onChange={(event) => setTitle(event.target.value)}
        />
      </Field>

      <CoverColorPicker novelId={novelId} title={title} value={coverColor} onChange={setCoverColor} />

      <Field label="소개" htmlFor="novel-description" hint="작품 화면 맨 위에 보여요. 줄바꿈도 그대로 보여요.">
        <Textarea id="novel-description" name="description" defaultValue={novel?.description} rows={5} maxLength={2000} />
      </Field>

      <Field label="연재 일정 (선택)" htmlFor="novel-schedule" hint="작품 화면 '총 N화' 옆에 보여요. 비우거나 완결로 바꾸면 안 보여요.">
        <Input
          id="novel-schedule"
          name="scheduleNote"
          defaultValue={novel?.scheduleNote}
          maxLength={60}
          placeholder="예: 매주 금요일 저녁 8시"
        />
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

/** 표지 색 고르기. '자동'은 작품 번호로 정해지는 색 (지금까지와 같음) */
function CoverColorPicker({
  novelId,
  title,
  value,
  onChange,
}: {
  novelId: number | undefined;
  title: string;
  value: CoverColor | null;
  onChange: (value: CoverColor | null) => void;
}) {
  const auto = novelId ? COVER_COLORS[autoCoverColor(novelId)] : null;
  const swatch =
    'relative grid size-9 cursor-pointer place-items-center rounded-full ring-1 ring-black/10 transition has-checked:ring-2 has-checked:ring-fg has-checked:ring-offset-2 has-checked:ring-offset-surface has-focus-visible:outline-2 has-focus-visible:outline-offset-4 has-focus-visible:outline-accent';

  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-semibold">표지 색</legend>
      <div className="flex items-start gap-4">
        {/* 작품 화면과 같은 크기 (좁으면 'WAFFLE NOVEL'이 두 줄로 꺾인다) */}
        <NovelCover id={novelId ?? 0} title={title.trim() || '제목'} color={value} size="sm" className="w-28 shrink-0" />
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <label
              className={cn(
                'flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-sm font-semibold text-muted transition',
                'has-checked:border-accent has-checked:bg-accent-soft has-checked:text-accent has-focus-visible:outline-2 has-focus-visible:outline-accent',
              )}
            >
              <input type="radio" name="coverColor" value="" checked={value === null} onChange={() => onChange(null)} className="sr-only" />
              {auto ? <span aria-hidden="true" className="size-3.5 rounded-full ring-1 ring-black/10" style={{ background: auto.background }} /> : null}
              자동
            </label>
            {COVER_COLOR_KEYS.map((key) => {
              const color = COVER_COLORS[key];
              return (
                <label key={key} title={color.label} className={swatch} style={{ background: color.background }}>
                  <input
                    type="radio"
                    name="coverColor"
                    value={key}
                    checked={value === key}
                    onChange={() => onChange(key)}
                    className="sr-only"
                  />
                  <span className="sr-only">{color.label}</span>
                  {value === key ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke={color.foreground} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-4">
                      <path d="M5 12.5l4.5 4.5L19 7.5" />
                    </svg>
                  ) : null}
                </label>
              );
            })}
          </div>
          <div className="text-[13px] leading-relaxed text-muted">
            {novelId ? '자동은 작품마다 정해진 색이에요. 고르면 그 색으로 바뀌어요.' : '자동은 작품을 만들 때 작품마다 정해져요.'}
          </div>
        </div>
      </div>
    </fieldset>
  );
}

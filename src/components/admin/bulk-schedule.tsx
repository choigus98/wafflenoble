'use client';

import { useId, useRef, useState, useTransition } from 'react';
import { scheduleChapters } from '@/app/admin/actions';
import { Button } from '@/components/ui';
import { announce } from '@/lib/announce';
import { BULK_INTERVALS, bulkScheduleTimes, defaultBulkStart } from '@/lib/bulk-schedule';
import { formatSchedule } from '@/lib/format';

type Draft = { id: number; position: number; title: string };

/** <input type="datetime-local">에 넣을 값 (브라우저 시간대 기준) */
function toLocalInputValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * 관리자 작품 화면 '임시저장 한꺼번에 예약': 임시저장 회차를 골라(처음엔 전부) 첫 공개 시각부터 N일 간격으로 회차 번호 순서대로 예약.
 * 창 안에서 어느 회차가 언제 공개되는지 미리 보여 주고, 한 번에 저장한다 (하나라도 안 되면 아무것도 안 바뀜)
 */
export function BulkSchedule({ novelId, drafts }: { novelId: number; drafts: Draft[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const [picked, setPicked] = useState<Set<number>>(() => new Set(drafts.map((draft) => draft.id)));
  const [start, setStart] = useState('');
  const [every, setEvery] = useState<number>(BULK_INTERVALS[0].days);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  const chosen = drafts.filter((draft) => picked.has(draft.id));
  const first = start ? new Date(start) : null;
  const times = first && !Number.isNaN(first.getTime()) ? bulkScheduleTimes(first, chosen.length, every) : [];

  function open() {
    // 열 때마다 처음 상태로: 전부 고르고, 첫 공개는 내일 오후 7시
    setPicked(new Set(drafts.map((draft) => draft.id)));
    setStart(toLocalInputValue(defaultBulkStart(new Date())));
    setEvery(BULK_INTERVALS[0].days);
    setError('');
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  function toggle(id: number) {
    setPicked((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function submit() {
    if (chosen.length === 0 || times.length !== chosen.length) return;
    setError('');
    startTransition(async () => {
      const result = await scheduleChapters(
        novelId,
        chosen.map((draft, index) => ({ chapterId: draft.id, publishAt: times[index].toISOString() })),
      );
      if (!result.ok) {
        setError(result.message);
        return;
      }
      close();
      announce(`회차 ${result.count}개를 예약했어요. 첫 공개는 ${formatSchedule(times[0])}`);
      // 임시저장이 하나 이하로 줄면 이 단추가 사라지므로, 포커스는 회차 목록 제목으로
      requestAnimationFrame(() => document.getElementById('chapters-title')?.focus());
    });
  }

  return (
    <>
      <Button ref={triggerRef} type="button" variant="secondary" size="sm" onClick={open}>
        한꺼번에 예약
      </Button>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        // 창 바깥(어두운 곳)을 누르면 닫기. 닫히면 포커스를 단추로 돌려준다 (Esc도 같음)
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
        onClose={() => triggerRef.current?.focus()}
        className="m-auto w-[min(30rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-line bg-surface p-0 text-fg shadow-xl backdrop:bg-black/45"
      >
        <div className="flex max-h-[min(44rem,calc(100dvh-2rem))] flex-col">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line py-2.5 pr-2.5 pl-5">
            <h2 id={titleId} className="font-bold">
              임시저장 회차 한꺼번에 예약
            </h2>
            <button
              type="button"
              onClick={close}
              aria-label="닫기"
              className="grid size-9 place-items-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-fg"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" className="size-4">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-4">
            <div className="flex flex-wrap gap-3">
              {/* 좁은 화면에서는 시각 칸이 줄어들지 않고 '간격'이 아래 줄로 내려간다 */}
              <label className="min-w-[13rem] flex-1 space-y-1.5">
                <span className="block text-sm font-semibold">첫 공개</span>
                <input
                  type="datetime-local"
                  value={start}
                  // 창이 열리면 바로 첫 공개 시각부터
                  autoFocus
                  onChange={(event) => setStart(event.target.value)}
                  className="h-11 w-full min-w-0 rounded-xl border border-line bg-surface px-3 text-base text-fg focus:border-accent focus:ring-3 focus:ring-accent/20 focus:outline-none"
                />
              </label>
              <label className="min-w-36 flex-1 space-y-1.5 sm:flex-none">
                <span className="block text-sm font-semibold">간격</span>
                <select
                  value={every}
                  onChange={(event) => setEvery(Number(event.target.value))}
                  className="h-11 w-full rounded-xl border border-line bg-surface px-3 text-base text-fg focus:border-accent focus:ring-3 focus:ring-accent/20 focus:outline-none"
                >
                  {BULK_INTERVALS.map((interval) => (
                    <option key={interval.days} value={interval.days}>
                      {interval.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {/* fieldset은 기본으로 내용만큼 넓어져서(긴 제목) 창 밖으로 나가므로 최소 너비를 0으로 */}
            <fieldset className="min-w-0">
              <legend className="text-sm font-semibold">
                예약할 회차 <span className="font-normal text-muted">회차 번호 순서대로</span>
              </legend>
              <ul className="mt-1.5 divide-y divide-line rounded-xl border border-line">
                {drafts.map((draft) => {
                  const order = chosen.findIndex((item) => item.id === draft.id);
                  const when = order === -1 ? null : times[order];
                  return (
                    <li key={draft.id}>
                      <label className="flex min-h-12 cursor-pointer items-center gap-3 px-3 py-2">
                        <input type="checkbox" checked={picked.has(draft.id)} onChange={() => toggle(draft.id)} className="size-5 shrink-0 accent-(--accent)" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">
                            {draft.position}화 {draft.title || '(제목 없음)'}
                          </span>
                          <span className="block text-xs text-muted">{when ? `${formatSchedule(when)} 공개` : '이번에는 예약 안 함'}</span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </fieldset>
            <p className="text-xs leading-relaxed text-muted">예약한 회차는 그 시각이 되면 길드원에게 보여요. 그 전까지는 에디터에서 계속 고칠 수 있어요.</p>
            {error ? (
              <p role="alert" className="text-sm font-medium text-danger">
                {error}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 justify-end gap-2 border-t border-line px-5 py-3">
            <Button type="button" variant="ghost" size="sm" onClick={close}>
              취소
            </Button>
            <Button type="button" size="sm" disabled={pending || chosen.length === 0 || times.length === 0} onClick={submit}>
              {pending ? '예약하는 중…' : `${chosen.length}개 예약하기`}
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}

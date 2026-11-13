'use client';

import { useId, useRef, useState, useTransition } from 'react';
import { renameChapters } from '@/app/admin/actions';
import { Button } from '@/components/ui';
import { announce } from '@/lib/announce';
import { cn } from '@/lib/utils';

type Row = { id: number; position: number; title: string };

/**
 * 관리자 작품 화면 '제목 고치기': 이 작품의 모든 회차 제목을 한 창에서 표처럼 고치고 한 번에 저장한다.
 * 바뀐 것만 보내고(바뀐 칸은 테두리 색으로), 이 작품 회차가 아닌 게 섞이면 아무것도 안 바뀐다.
 * 발행된 회차의 제목은 저장하면 바로 길드원에게 보인다 (에디터의 '수정 반영'처럼 발행본 기록이 남음). Enter로도 저장
 */
export function BulkRename({ novelId, rows }: { novelId: number; rows: Row[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const noteId = useId();
  const [titles, setTitles] = useState<Record<number, string>>({});
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  const valueOf = (row: Row) => titles[row.id] ?? row.title;
  const changed = rows.filter((row) => valueOf(row).trim() !== row.title.trim());

  function open() {
    // 열 때마다 지금 제목으로 (닫았다 열면 고치던 것은 버림)
    setTitles(Object.fromEntries(rows.map((row) => [row.id, row.title])));
    setError('');
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  function submit() {
    if (changed.length === 0 || pending) return;
    setError('');
    startTransition(async () => {
      const result = await renameChapters(
        novelId,
        changed.map((row) => ({ chapterId: row.id, title: valueOf(row).trim() })),
      );
      if (!result.ok) {
        setError(result.message);
        return;
      }
      close();
      announce(`회차 제목 ${result.count}개를 고쳤어요`);
    });
  }

  return (
    <>
      <Button ref={triggerRef} type="button" variant="secondary" size="sm" onClick={open} title="회차 제목 한꺼번에 고치기">
        제목 고치기
      </Button>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-describedby={noteId}
        // 창 바깥(어두운 곳)을 누르면 닫기. 닫히면 포커스를 단추로 돌려준다 (Esc도 같음)
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
        onClose={() => triggerRef.current?.focus()}
        className="m-auto w-[min(32rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-line bg-surface p-0 text-fg shadow-xl backdrop:bg-black/45"
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
          className="flex max-h-[min(44rem,calc(100dvh-2rem))] flex-col"
        >
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line py-2.5 pr-2.5 pl-5">
            <h2 id={titleId} className="font-bold">
              회차 제목 한꺼번에 고치기
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
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
            <p id={noteId} className="text-xs leading-relaxed text-muted">
              바꾼 제목만 저장해요. 발행된 회차의 제목은 저장하면 바로 길드원에게 보여요.
            </p>
            <ul className="mt-3 space-y-2">
              {rows.map((row, index) => {
                const dirty = valueOf(row).trim() !== row.title.trim();
                return (
                  <li key={row.id}>
                    <label className="flex items-center gap-3">
                      <span className="w-12 shrink-0 text-right text-sm font-semibold text-accent tabular-nums">{row.position}화</span>
                      <input
                        value={valueOf(row)}
                        onChange={(event) => setTitles((current) => ({ ...current, [row.id]: event.target.value }))}
                        maxLength={100}
                        placeholder="제목 없음"
                        // 창이 열리면 첫 회차 제목부터
                        autoFocus={index === 0}
                        className={cn(
                          'h-10 min-w-0 flex-1 rounded-xl border bg-surface px-3 text-base text-fg placeholder:text-muted/70 focus:border-accent focus:ring-3 focus:ring-accent/20 focus:outline-none',
                          dirty ? 'border-accent' : 'border-line',
                        )}
                      />
                    </label>
                  </li>
                );
              })}
            </ul>
            {error ? (
              <p role="alert" className="mt-3 text-sm font-medium text-danger">
                {error}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-line px-5 py-3">
            <Button type="button" variant="ghost" size="sm" onClick={close}>
              취소
            </Button>
            <Button type="submit" size="sm" disabled={pending || changed.length === 0}>
              {pending ? '저장하는 중…' : changed.length > 0 ? `${changed.length}개 저장` : '바뀐 제목 없음'}
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}

'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { announce } from '@/lib/announce';
import { matchesChapterQuery } from '@/lib/chapter-filter';

export type ChapterRow = {
  id: number;
  position: number;
  title: string;
  content: ReactNode; // 회차 링크 (서버에서 그림)
  move: ReactNode; // 순서 바꾸기 단추 (못 바꾸면 null)
};

/**
 * 관리자 작품 화면의 회차 목록. 거르기 알약(서버에서 그림) 옆 찾기 칸으로 제목·회차 번호를 치는 대로 거른다.
 * 찾는 동안에는 순서 바꾸기 단추를 숨긴다 (안 보이는 회차와 자리가 바뀌면 헷갈려서).
 * 알약을 눌러 거르기를 바꿔도 같은 화면이라 찾던 말은 그대로 남는다
 */
export function ChapterList({
  filters,
  rows,
  searchable,
  moveHint,
  emptyText,
  filterLabel,
}: {
  filters: ReactNode; // 거르기 알약 (회차가 하나뿐이면 null)
  rows: ChapterRow[]; // 알약으로 거른 회차
  searchable: boolean;
  moveHint: string | null; // 거르기 때문에 순서를 못 바꿀 때 안내
  emptyText: string; // 알약으로 거른 회차가 하나도 없을 때
  filterLabel: string | null; // '임시저장' 같은 지금 알약 (전체면 null)
}) {
  const [query, setQuery] = useState('');
  const searching = query.trim() !== '';
  const shown = useMemo(() => rows.filter((row) => matchesChapterQuery(row, query)), [rows, query]);
  const movable = rows.some((row) => row.move !== null);
  const hint = moveHint ?? (searching && movable ? '순서 바꾸기는 찾기를 지우면 할 수 있어요' : null);

  // 찾은 개수를 화면 낭독기에 (치는 동안 매번 읽지 않게 잠깐 기다렸다가)
  useEffect(() => {
    if (!searching) return;
    const timer = window.setTimeout(() => announce(shown.length > 0 ? `회차 ${shown.length}개` : '맞는 회차가 없어요'), 500);
    return () => window.clearTimeout(timer);
  }, [searching, query, shown.length]);

  return (
    <>
      {filters || searchable ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {filters}
          {searchable ? (
            <div className="relative w-full sm:w-56">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label="회차 찾기"
                placeholder="제목·회차 번호로 찾기"
                maxLength={60}
                autoComplete="off"
                spellCheck={false}
                className="h-9 w-full rounded-full border border-line bg-surface pr-3 pl-9 text-base text-fg placeholder:text-muted focus:border-accent focus:ring-3 focus:ring-accent/20 focus:outline-none sm:h-8 sm:text-sm"
              />
            </div>
          ) : null}
        </div>
      ) : null}
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}
      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line px-6 py-10 text-center text-sm text-muted">{emptyText}</p>
      ) : shown.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line px-6 py-10 text-center text-sm text-muted break-keep">
          ‘{query.trim()}’에 맞는 {filterLabel ? `${filterLabel} ` : ''}회차가 없어요.
        </p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {shown.map((row) => (
            <li key={row.id} className="flex items-stretch">
              {row.content}
              {searching ? null : row.move}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

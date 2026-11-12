'use client';

import Link from 'next/link';
import { useId, useState } from 'react';
import { ChapterReadStatus } from '@/components/reader/chapter-read-status';
import { Badge } from '@/components/ui';
import { formatDate, formatSchedule } from '@/lib/format';
import { formatReadingTime, readingMinutes } from '@/lib/reading-time';
import { TOC_FILTER_MIN, filterToc } from '@/lib/toc-filter';
import { cn } from '@/lib/utils';

export type TocListItem = {
  id: number;
  position: number;
  title: string;
  status: 'draft' | 'published';
  scheduled: boolean;
  publishedAt: string | null; // ISO (서버 → 브라우저로 넘기려고 글자로)
  likeCount: number;
  readByMe: boolean;
  isNew: boolean;
  charCount: number;
};

/** 작품 목차. 회차가 많으면(10화 넘으면) 위에 '회차 찾기' 칸 — 번호나 제목 일부로 거른다 */
export function TocList({ novelId, items }: { novelId: number; items: TocListItem[] }) {
  const [query, setQuery] = useState('');
  const inputId = useId();
  const statusId = useId();
  const searchable = items.length >= TOC_FILTER_MIN;
  const shown = searchable ? filterToc(items, query) : items;
  const searching = searchable && query.trim() !== '';

  return (
    <>
      {searchable ? (
        <div className="mb-3">
          <label htmlFor={inputId} className="sr-only">
            회차 찾기
          </label>
          <div className="relative">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted">
              <circle cx="11" cy="11" r="6.5" />
              <path d="M20 20l-4.2-4.2" />
            </svg>
            <input
              id={inputId}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="회차 찾기 · 번호나 제목"
              aria-describedby={statusId}
              autoComplete="off"
              enterKeyHint="search"
              maxLength={60}
              className="h-11 w-full rounded-xl border border-line bg-surface pr-3 pl-10 text-base text-fg placeholder:text-muted/80 focus:border-accent focus:ring-3 focus:ring-accent/20 focus:outline-none sm:text-sm"
            />
          </div>
          {/* 찾은 개수는 늘 있는 알림 칸에 써야 화면 낭독기가 바뀔 때마다 읽어 준다 */}
          <p id={statusId} role="status" className={cn('mt-1.5 px-1 text-xs text-muted', !searching && 'sr-only')}>
            {searching ? (shown.length > 0 ? `${items.length}화 중 ${shown.length}개 찾았어요` : '찾는 회차가 없어요') : `총 ${items.length}화`}
          </p>
        </div>
      ) : null}
      {shown.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line px-6 py-10 text-center text-sm text-muted">
          ‘{query.trim()}’에 맞는 회차가 없어요. 번호(예: 12)나 제목 일부로 찾아 보세요.
        </p>
      ) : (
        <ol className="divide-y divide-line border-y border-line">
          {shown.map((chapter) => {
            const publishedAt = chapter.publishedAt ? new Date(chapter.publishedAt) : null;
            const minutes = readingMinutes(chapter.charCount);
            return (
              <li key={chapter.id}>
                <Link href={`/novels/${novelId}/${chapter.id}`} className="flex items-center gap-3 px-1 py-4 transition hover:bg-surface-2/60">
                  <span className={cn('w-10 shrink-0 text-sm font-semibold tabular-nums', chapter.readByMe ? 'text-muted' : 'text-accent')}>
                    {chapter.position}화
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className={cn('min-w-0 truncate font-medium', chapter.readByMe && 'text-muted')}>
                        {chapter.title || `${chapter.position}화`}
                      </span>
                      {chapter.isNew ? (
                        <span className="shrink-0 rounded-full bg-accent px-1.5 py-px text-[10px] leading-4 font-bold tracking-wide text-accent-fg">
                          <span aria-hidden="true">NEW</span>
                          <span className="sr-only">새 회차</span>
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                      {publishedAt && !chapter.scheduled ? formatDate(publishedAt) : null}
                      {minutes !== null ? (
                        // 화면 낭독기는 '읽는 시간 약 8분' ('8분 전'과 헷갈리지 않게)
                        <span>
                          <span className="sr-only">읽는 시간 </span>
                          {formatReadingTime(minutes)}
                        </span>
                      ) : null}
                      {chapter.status === 'draft' ? <Badge tone="muted">임시저장</Badge> : null}
                      {chapter.scheduled && publishedAt ? <Badge tone="muted">예약 · {formatSchedule(publishedAt)}</Badge> : null}
                      {chapter.likeCount > 0 ? <span className="text-like">♥ {chapter.likeCount}</span> : null}
                    </span>
                  </span>
                  <ChapterReadStatus chapterId={chapter.id} readByMe={chapter.readByMe} />
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </>
  );
}

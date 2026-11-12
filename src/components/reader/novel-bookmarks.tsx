'use client';

import Link from 'next/link';
import { useState, useSyncExternalStore } from 'react';
import { readBookmarksRaw, saveBookmarks, subscribeBookmarks } from '@/components/reader/bookmarks-store';
import { bookmarksOf, parseBookmarks, removeBookmark } from '@/lib/bookmarks';
import { formatDate } from '@/lib/format';

// 처음에 보이는 책갈피 수. 이보다 두 개 넘게 많으면 나머지는 '+N개 더 보기'로 (책갈피가 많아도 회차 목록이 한참 밀리지 않게)
const SHOWN = 5;

/** 작품 화면 '책갈피': 이 기기에서 이 작품에 꽂은 책갈피 (최근 것부터). 누르면 그 회차 그 문단으로, ✕로 빼기. 없으면 안 보임 */
export function NovelBookmarks({ novelId }: { novelId: number }) {
  // 서버에서는 기기 기록을 모르므로 아무것도 안 그린다 (하이드레이션 불일치 없음)
  const raw = useSyncExternalStore(subscribeBookmarks, readBookmarksRaw, () => null);
  const [all, setAll] = useState(false);
  const items = raw === null ? [] : bookmarksOf(parseBookmarks(raw), novelId);
  if (items.length === 0) return null;
  const folds = items.length > SHOWN + 2;
  const shown = folds && !all ? items.slice(0, SHOWN) : items;

  return (
    <section aria-labelledby="novel-bookmarks-title" className="mt-6 rounded-2xl border border-line bg-surface">
      <h2 id="novel-bookmarks-title" className="flex items-baseline gap-1.5 px-4 pt-3.5 text-sm font-semibold">
        책갈피 <span className="font-normal text-muted">{items.length}개 · 이 기기</span>
      </h2>
      <ul className="mt-1.5 divide-y divide-line border-t border-line">
        {shown.map((item) => {
          const chapter = item.title ? `${item.position}화 ${item.title}` : `${item.position}화`;
          return (
            <li key={`${item.chapterId}:${item.index}`} className="flex items-center gap-1 pr-2">
              <Link
                href={`/novels/${novelId}/${item.chapterId}#bm-${item.index}`}
                className="min-w-0 flex-1 px-4 py-2.5 transition hover:bg-surface-2/60"
              >
                <span className="block truncate text-sm font-semibold">{chapter}</span>
                <span className="block truncate text-xs text-muted">
                  ‘{item.snippet}’ · {formatDate(new Date(item.at))}
                </span>
              </Link>
              <button
                type="button"
                onClick={() => saveBookmarks(removeBookmark(parseBookmarks(readBookmarksRaw()), item.chapterId, item.index))}
                aria-label={`${chapter} 책갈피 빼기`}
                title="책갈피 빼기"
                className="grid size-9 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-fg"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" className="size-4">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </li>
          );
        })}
      </ul>
      {folds ? (
        <button
          type="button"
          aria-expanded={all}
          onClick={() => setAll(!all)}
          className="flex h-11 w-full items-center justify-center rounded-b-2xl border-t border-line text-sm font-semibold text-accent transition hover:bg-surface-2/60"
        >
          {all ? '접기' : `+${items.length - SHOWN}개 더 보기`}
        </button>
      ) : null}
    </section>
  );
}

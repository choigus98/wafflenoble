'use client';

import { useSyncExternalStore } from 'react';
import { isPartlyRead, readSavedRatio } from '@/lib/reading-position';

// 작품 목차 오른쪽 칸: 이 기기에서 읽다 만 회차면 '40%까지 읽음' + 막대, 아니면 서버 기록으로 '✓ 읽음'
// 서버에서는 기기 기록을 모르므로 '✓ 읽음'(또는 빈칸)으로 그리고, 브라우저에서 기록이 있으면 바꾼다 (하이드레이션 불일치 없음)

function subscribe(onChange: () => void) {
  window.addEventListener('storage', onChange);
  return () => window.removeEventListener('storage', onChange);
}

export function ChapterReadStatus({ chapterId, readByMe }: { chapterId: number; readByMe: boolean }) {
  const ratio = useSyncExternalStore(
    subscribe,
    () => readSavedRatio(chapterId),
    () => null,
  );

  if (isPartlyRead(ratio)) {
    const percent = Math.round(ratio * 100);
    return (
      <span className="flex shrink-0 flex-col items-end gap-1 text-xs font-semibold text-accent">
        <span>{percent}%까지 읽음</span>
        <span aria-hidden="true" className="block h-1 w-12 overflow-hidden rounded-full bg-surface-2">
          <span className="block h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
        </span>
      </span>
    );
  }

  if (!readByMe) return null;
  return (
    <span className="flex shrink-0 items-center gap-1 text-xs text-muted">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-3.5">
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </svg>
      읽음
    </span>
  );
}

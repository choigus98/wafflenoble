'use client';

import { useEffect, useRef, useState } from 'react';
import { copyToClipboard } from '@/lib/clipboard';
import { shareText } from '@/lib/share-text';
import { cn } from '@/lib/utils';

type CopyState = 'idle' | 'copied' | 'failed';

/**
 * '링크 복사': 단톡방에 붙여 넣기 좋게 『제목』(회차면 'N화 「제목」'까지)과 링크를 복사한다.
 * 입장 전인 길드원이 링크를 누르면 입장 화면을 거쳐 그 화면으로 온다 (proxy의 next).
 * variant: inline(작품 화면 제목 아래) · block(회차 화면 읽기 설정 안, 꽉 찬 폭)
 */
export function CopyLinkButton({
  path,
  title,
  chapterLabel,
  variant = 'inline',
  label = '링크 복사',
}: {
  path: string;
  title: string;
  chapterLabel?: string;
  variant?: 'inline' | 'block';
  label?: string;
}) {
  const [state, setState] = useState<CopyState>('idle');
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  async function copy() {
    const url = new URL(path, window.location.origin).toString();
    const ok = await copyToClipboard(shareText(title, url, chapterLabel));
    if (!ok) {
      // 그래도 안 되면 직접 복사할 수 있게 링크를 보여 준다
      window.prompt('아래 링크를 길게 눌러 복사해 주세요', url);
    }
    setState(ok ? 'copied' : 'failed');
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setState('idle'), 2500);
  }

  return (
    <>
      <button
        type="button"
        onClick={copy}
        className={cn(
          'items-center gap-1.5 rounded-lg border border-line text-[13px] font-semibold transition hover:bg-surface-2',
          variant === 'block' ? 'flex h-9 w-full justify-center' : 'inline-flex h-8 bg-surface px-2.5',
        )}
      >
        {state === 'copied' ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-4 text-accent">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-4">
            <path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1" />
            <path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1" />
          </svg>
        )}
        {state === 'copied' ? '복사했어요' : label}
      </button>
      {/* 화면 낭독기 알림 (칸은 늘 두고 글자만 바꾼다) */}
      <span role="status" className="sr-only">
        {state === 'copied'
          ? `${chapterLabel ? '회차' : '작품'} 링크를 복사했어요. 단톡방에 붙여 넣으면 돼요`
          : state === 'failed'
            ? '자동으로 복사하지 못했어요'
            : ''}
      </span>
    </>
  );
}

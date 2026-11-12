'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { moveChapter } from '@/app/admin/actions';

type Direction = 'up' | 'down';

/**
 * 관리자 회차 목록의 위/아래 옮기기 버튼.
 * 옮긴 뒤 목록이 새로 그려져도 키보드 포커스를 같은 버튼에 돌려주고, 화면 낭독기에 새 번호를 알려 준다.
 */
export function ChapterMoveButtons({
  chapterId,
  label,
  isFirst,
  isLast,
}: {
  chapterId: number;
  label: string; // 예: '3화 「템플릿 예시」'
  isFirst: boolean;
  isLast: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [announcement, setAnnouncement] = useState('');
  const upRef = useRef<HTMLButtonElement>(null);
  const downRef = useRef<HTMLButtonElement>(null);
  const lastMove = useRef<Direction | null>(null);

  function move(direction: Direction) {
    lastMove.current = direction;
    startTransition(async () => {
      const result = await moveChapter(chapterId, direction);
      setAnnouncement(result ? `${result.position}화로 옮겼어요` : '옮기지 못했어요');
    });
  }

  useEffect(() => {
    if (pending || lastMove.current === null) return;
    const direction = lastMove.current;
    lastMove.current = null;
    const preferred = direction === 'up' ? upRef.current : downRef.current;
    const fallback = direction === 'up' ? downRef.current : upRef.current;
    // 맨 위·맨 아래에 닿아 그 버튼이 꺼졌으면 반대쪽 버튼으로
    (preferred && !preferred.disabled ? preferred : fallback)?.focus();
  }, [pending]);

  const button =
    'grid h-7 w-9 place-items-center rounded-md text-muted transition hover:bg-surface-2 hover:text-fg disabled:pointer-events-none disabled:opacity-30';

  return (
    <div className="flex shrink-0 flex-col justify-center gap-0.5 border-l border-line px-1.5" aria-busy={pending}>
      <button
        ref={upRef}
        type="button"
        onClick={() => move('up')}
        disabled={isFirst || pending}
        aria-label={`${label} 위로 옮기기`}
        title="위로 옮기기"
        className={button}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-4">
          <path d="M6 15l6-6 6 6" />
        </svg>
      </button>
      <button
        ref={downRef}
        type="button"
        onClick={() => move('down')}
        disabled={isLast || pending}
        aria-label={`${label} 아래로 옮기기`}
        title="아래로 옮기기"
        className={button}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-4">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>
    </div>
  );
}

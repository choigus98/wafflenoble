'use client';

import { useOptimistic, useState, useTransition } from 'react';
import { setLike } from '@/app/(reader)/actions';
import type { LikeSummary } from '@/lib/queries/reactions';
import { cn } from '@/lib/utils';

const NAMES_SHOWN = 5;

export function LikeButton({
  chapterId,
  initial,
  disabledReason,
}: {
  chapterId: number;
  initial: LikeSummary;
  disabledReason: string | null;
}) {
  const [summary, setSummary] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [optimistic, setOptimistic] = useOptimistic(summary, (current, liked: boolean) => ({
    ...current,
    liked,
    count: Math.max(0, current.count + (liked ? 1 : -1)),
  }));
  const [, startTransition] = useTransition();

  function toggle() {
    const liked = !optimistic.liked;
    startTransition(async () => {
      setOptimistic(liked);
      const result = await setLike(chapterId, liked);
      if ('error' in result) {
        setError(result.error);
        return;
      }
      setError(null);
      setSummary(result);
    });
  }

  const shown = summary.names.slice(0, NAMES_SHOWN);
  const rest = summary.names.length - shown.length;

  return (
    <div className="flex flex-col items-center gap-2.5">
      <button
        type="button"
        onClick={toggle}
        disabled={Boolean(disabledReason)}
        title={disabledReason ?? undefined}
        aria-pressed={optimistic.liked}
        className={cn(
          'flex h-12 min-w-28 items-center justify-center gap-2 rounded-full border px-5 text-[15px] font-semibold transition active:scale-95',
          optimistic.liked
            ? 'border-like bg-like text-white shadow-sm shadow-like/30'
            : 'border-line bg-surface text-fg hover:border-like/50 hover:text-like',
          disabledReason && 'cursor-not-allowed opacity-60 active:scale-100',
        )}
      >
        <span aria-hidden="true" className="text-lg leading-none">
          {optimistic.liked ? '♥' : '♡'}
        </span>
        좋아요 {optimistic.count > 0 ? optimistic.count : ''}
      </button>
      {shown.length > 0 ? (
        <p className="max-w-xs text-center text-[13px] leading-relaxed text-muted break-keep">
          {shown.join(', ')}
          {rest > 0 ? ` 외 ${rest}명` : ''}님이 좋아해요
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-[13px] text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

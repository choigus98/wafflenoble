'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { TOC_ORDER_COOKIE, type TocOrder } from '@/lib/toc-order';
import { cn } from '@/lib/utils';

/** 이 기기에 1년 기억 (서버가 다음에 그릴 때 읽는다) */
function rememberOrder(order: TocOrder) {
  document.cookie = `${TOC_ORDER_COOKIE}=${order}; path=/; max-age=31536000; samesite=lax`;
}

const OPTIONS: Array<[TocOrder, string]> = [
  ['asc', '1화부터'],
  ['desc', '최신 화부터'],
];

/** 목차 정렬 바꾸기: 쿠키에 1년 기억하고, 서버가 그 순서로 다시 그리게 새로고침 */
export function TocOrderToggle({ order }: { order: TocOrder }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(next: TocOrder) {
    if (next === order) return;
    rememberOrder(next);
    startTransition(() => router.refresh());
  }

  return (
    <div role="group" aria-label="목차 정렬" aria-busy={pending} className="flex rounded-lg bg-surface-2 p-0.5 text-xs font-semibold">
      {OPTIONS.map(([value, label]) => (
        <button
          key={value}
          type="button"
          aria-pressed={order === value}
          onClick={() => choose(value)}
          className={cn(
            'h-7 rounded-md px-2.5 transition',
            order === value ? 'bg-surface text-fg shadow-sm' : 'text-muted hover:text-fg',
            pending && 'opacity-60',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

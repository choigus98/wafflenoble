'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { deleteComment } from '@/app/(reader)/actions';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';

export type AdminComment = {
  id: number;
  author: string;
  body: string;
  createdAt: string; // ISO
  chapter?: { label: string; href: string; readerHref: string }; // '댓글' 화면에서만 (어느 회차인지)
};

/**
 * 작가가 보는 댓글 목록: 쓴 사람 이름 · 시각 · 내용 · 지우기.
 * 회차 관리 화면 옆 칸(compact)과 '댓글' 화면에서 같이 쓴다
 */
export function AdminCommentList({ items, compact = false, empty }: { items: AdminComment[]; compact?: boolean; empty: string }) {
  const router = useRouter();
  const [list, setList] = useState(items);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [pending, startTransition] = useTransition();

  function remove(item: AdminComment) {
    if (!window.confirm(`${item.author}님의 댓글을 지울까요? 길드원 화면에서도 사라져요.`)) return;
    startTransition(async () => {
      const result = await deleteComment(item.id);
      if ('error' in result && result.error !== '이미 지워진 댓글이에요') {
        setError(result.error);
        return;
      }
      setError(null);
      setList((current) => current.filter((comment) => comment.id !== item.id));
      setStatus('댓글을 지웠어요');
      router.refresh();
    });
  }

  if (list.length === 0) {
    return (
      <>
        <p className={cn('text-muted', compact ? 'text-[13px]' : 'rounded-2xl border border-dashed border-line px-6 py-12 text-center')}>{empty}</p>
        <p role="status" className="sr-only">
          {status}
        </p>
      </>
    );
  }

  return (
    <div className="space-y-2">
      <ul className={cn(compact ? 'space-y-3' : 'divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface')}>
        {list.map((item) => (
          <li key={item.id} className={cn('space-y-1', compact ? 'rounded-xl bg-surface-2 px-3 py-2.5' : 'px-4 py-3.5 sm:px-5')}>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
              <span className="font-semibold text-fg">{item.author}</span>
              {item.chapter ? (
                <Link href={item.chapter.href} className="font-medium text-accent underline-offset-2 hover:underline">
                  {item.chapter.label}
                </Link>
              ) : null}
              <time dateTime={item.createdAt} className="text-muted tabular-nums">
                {formatDateTime(new Date(item.createdAt))}
              </time>
              <span className="ml-auto flex items-center gap-1">
                {item.chapter ? (
                  <Link
                    href={item.chapter.readerHref}
                    className="rounded-md px-1.5 py-0.5 text-muted hover:text-fg focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
                  >
                    회차 보기
                  </Link>
                ) : null}
                <button
                  type="button"
                  onClick={() => remove(item)}
                  disabled={pending}
                  aria-label={`${item.author}님의 댓글 지우기`}
                  className="rounded-md px-1.5 py-0.5 text-muted hover:text-danger focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none disabled:opacity-50"
                >
                  지우기
                </button>
              </span>
            </div>
            <p className={cn('leading-relaxed whitespace-pre-line break-words break-keep', compact ? 'text-sm' : 'text-[15px]')}>{item.body}</p>
          </li>
        ))}
      </ul>
      {error ? (
        <p role="alert" className="text-[13px] text-danger">
          {error}
        </p>
      ) : null}
      <p role="status" className="sr-only">
        {status}
      </p>
    </div>
  );
}

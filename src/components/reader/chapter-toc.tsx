'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { useDismiss } from '@/components/use-dismiss';
import { cn } from '@/lib/utils';

export type TocItem = {
  id: number;
  position: number;
  title: string;
  read: boolean; // 이 길드원이 읽은 회차
  note: string | null; // 관리자 미리보기: '임시저장' · '예약'
};

/**
 * 회차 화면 머리의 '목차' 단추. 누르면 이 작품의 회차 목록이 펼쳐지고 지금 회차에 포커스가 간다.
 * ↑/↓·Home/End로 옮기고 Enter로 이동, Esc나 바깥을 누르면 닫힌다 (Esc는 포커스를 단추로 돌려줌).
 * 목록 위치는 이 단추를 감싼 칸(머리 오른쪽 단추 묶음)의 오른쪽 끝에 맞춘다.
 */
export function ChapterToc({ novelId, currentId, items }: { novelId: number; currentId: number; items: TocItem[] }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const headingId = useId();
  useDismiss({ open, onClose: () => setOpen(false), rootRef, triggerRef });

  // 열리면 지금 회차를 목록 가운데에 두고 포커스 (페이지는 움직이지 않게 목록 안에서만 스크롤)
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const current = panel?.querySelector<HTMLAnchorElement>('[aria-current="page"]');
    if (!panel || !current) return;
    panel.scrollTop = Math.max(0, current.offsetTop - (panel.clientHeight - current.offsetHeight) / 2);
    current.focus({ preventScroll: true });
  }, [open]);

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    // 목록이 열려 있을 때는 ←/→로 이전·다음 화로 넘어가지 않게 (회차 화면의 화살표 이동)
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      return;
    }
    const links = [...(panelRef.current?.querySelectorAll<HTMLAnchorElement>('a[href]') ?? [])];
    const index = links.indexOf(document.activeElement as HTMLAnchorElement);
    const target =
      event.key === 'ArrowDown'
        ? Math.min(index + 1, links.length - 1)
        : event.key === 'ArrowUp'
          ? Math.max(index - 1, 0)
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? links.length - 1
              : null;
    if (target === null) return;
    event.preventDefault();
    links[target]?.focus();
  }

  return (
    <div ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label="목차"
        title="목차"
        className="grid size-10 place-items-center rounded-xl border border-line bg-surface transition hover:bg-surface-2"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="size-5">
          <path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />
        </svg>
      </button>
      {open ? (
        <div
          ref={panelRef}
          id={panelId}
          onKeyDown={onKeyDown}
          className="absolute top-12 right-0 z-40 max-h-[min(28rem,calc(100dvh-8rem))] w-[min(20rem,calc(100vw-2rem))] overflow-y-auto overscroll-contain rounded-2xl border border-line bg-surface p-1.5 shadow-lg shadow-black/5"
        >
          <nav aria-labelledby={headingId}>
            <div className="flex items-baseline justify-between px-3 pt-1.5 pb-2">
              <h2 id={headingId} className="text-xs font-semibold text-muted">
                목차
              </h2>
              <span className="text-xs text-muted">총 {items.length}화</span>
            </div>
            <ol>
              {items.map((item) => {
                const current = item.id === currentId;
                return (
                  <li key={item.id}>
                    <Link
                      href={`/novels/${novelId}/${item.id}`}
                      aria-current={current ? 'page' : undefined}
                      onClick={() => setOpen(false)}
                      className={cn(
                        'flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm transition hover:bg-surface-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent',
                        current && 'bg-accent-soft hover:bg-accent-soft',
                      )}
                    >
                      <span className={cn('w-9 shrink-0 font-semibold tabular-nums', item.read && !current ? 'text-muted' : 'text-accent')}>
                        {item.position}화
                      </span>
                      <span className={cn('min-w-0 flex-1 truncate', current ? 'font-semibold' : item.read && 'text-muted')}>
                        {item.title || `${item.position}화`}
                      </span>
                      {item.note ? <span className="shrink-0 rounded-full bg-surface-2 px-2 py-px text-[11px] text-muted">{item.note}</span> : null}
                      {current ? (
                        <span className="shrink-0 text-xs font-semibold text-accent">읽는 중</span>
                      ) : item.read ? (
                        <span className="shrink-0 text-xs text-muted">
                          <span aria-hidden="true">✓</span>
                          <span className="sr-only">읽음</span>
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ol>
          </nav>
        </div>
      ) : null}
    </div>
  );
}

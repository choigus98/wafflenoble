'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { popupIsOpen } from '@/components/use-dismiss';
import { keyNavTarget } from '@/lib/key-nav';

/** 화살표를 스스로 쓰는 곳 (안에서 ←/→를 누르면 그쪽 몫) */
const ARROW_OWNERS = '[role="menu"], [role="menubar"], [role="listbox"], [role="radiogroup"], [role="slider"], [role="tablist"], [role="tree"], [role="grid"], [role="dialog"], dialog';

/** 포커스가 옆으로 스크롤되는 칸 안인지 (그 칸을 ←/→로 넘겨 보는 중일 수 있어서) */
function scrollsSideways(element: HTMLElement | null): boolean {
  for (let node = element; node && node !== document.body && node !== document.documentElement; node = node.parentElement) {
    const { overflowX } = getComputedStyle(node);
    if ((overflowX === 'auto' || overflowX === 'scroll') && node.scrollWidth > node.clientWidth) return true;
  }
  return false;
}

/**
 * ←/→ 키로 이전·다음 화 (넘길지 말지는 lib/key-nav.ts). 회차 끝 줄에 작은 안내가 있다 (키보드가 있는 기기에서만).
 * 입력칸에 쓰는 중 · 보조 키 · 누르고 있는 중 · 메뉴나 팝오버를 쓰는 중 · 본문 글을 고른 채면 넘기지 않는다
 */
export function ChapterKeyNav({ prevHref, nextHref }: { prevHref: string | null; nextHref: string | null }) {
  const router = useRouter();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      const target = event.target instanceof HTMLElement ? event.target : null;
      const selection = window.getSelection();
      const direction = keyNavTarget({
        key: event.key,
        repeat: event.repeat,
        composing: event.isComposing,
        modified: event.altKey || event.ctrlKey || event.metaKey || event.shiftKey,
        handled: event.defaultPrevented,
        typing: Boolean(target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))),
        arrowsOwned: Boolean(target?.closest(ARROW_OWNERS)) || document.querySelector('dialog[open]') !== null || scrollsSideways(target),
        popupOpen: popupIsOpen(),
        selecting: Boolean(selection && !selection.isCollapsed && selection.toString().trim()),
      });
      const href = direction === 'prev' ? prevHref : direction === 'next' ? nextHref : null;
      if (!href) return;
      event.preventDefault();
      router.push(href);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [router, prevHref, nextHref]);

  return null;
}

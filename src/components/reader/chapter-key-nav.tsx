'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/** ←/→ 키로 이전·다음 화. 입력칸에 쓰는 중이거나 보조 키를 같이 누르면 무시한다 */
export function ChapterKeyNav({ prevHref, nextHref }: { prevHref: string | null; nextHref: string | null }) {
  const router = useRouter();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return;
      const href = event.key === 'ArrowLeft' ? prevHref : event.key === 'ArrowRight' ? nextHref : null;
      if (!href) return;
      event.preventDefault();
      router.push(href);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [router, prevHref, nextHref]);

  return null;
}

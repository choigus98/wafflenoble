'use client';

import { useEffect, useState } from 'react';
import { scrollBehavior } from '@/lib/motion';

// 회차 화면 '맨 위로': 화면 한 개 반쯤 내려 읽었을 때만 오른쪽 아래에 나온다.
// 누르면 맨 위로 가고, 키보드·화면 낭독기 사용자를 위해 포커스를 회차 제목으로 옮긴다
const SHOW_AFTER_SCREENS = 1.5;

export function BackToTop({ targetId }: { targetId: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let frame = 0;
    const check = () => {
      frame = 0;
      setVisible(window.scrollY > window.innerHeight * SHOW_AFTER_SCREENS);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(check);
    };
    check();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  if (!visible) return null;
  return (
    <button
      type="button"
      onClick={() => {
        window.scrollTo({ top: 0, behavior: scrollBehavior() });
        document.getElementById(targetId)?.focus({ preventScroll: true });
      }}
      aria-label="맨 위로"
      title="맨 위로"
      className="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-30 grid size-11 place-items-center rounded-full border border-line bg-surface/95 text-fg shadow-lg shadow-black/10 backdrop-blur transition hover:bg-surface-2 sm:right-6 sm:bottom-6"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-5">
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
    </button>
  );
}

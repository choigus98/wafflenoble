'use client';

import { useEffect, useRef, useState } from 'react';
import { scrollBehavior } from '@/lib/motion';
import { RESUME_MAX, RESUME_MIN, positionKey as storageKey, readSavedRatio as readSaved } from '@/lib/reading-position';

// 회차 읽기 진행 막대 + 읽던 위치 기억 (이 기기의 localStorage에만, 회차마다)
// - 스크롤할 때마다 React를 다시 그리지 않도록 막대는 DOM 스타일만 직접 바꾼다
// - 다시 열었을 때 읽던 곳이 있으면 바로 옮기지 않고 '이어서 읽기'를 권한다

const CONTENT_ID = 'chapter-content';
const SAVE_INTERVAL_MS = 700;
const OFFER_TIMEOUT_MS = 10_000;

/** 본문 영역 기준 진행률 0~1 (본문 끝이 화면 아래에 닿으면 1) */
function measure(): { ratio: number; top: number; span: number } | null {
  const content = document.getElementById(CONTENT_ID);
  if (!content) return null;
  const top = content.getBoundingClientRect().top + window.scrollY;
  const span = Math.max(1, content.offsetHeight - window.innerHeight * 0.6);
  const ratio = Math.min(1, Math.max(0, (window.scrollY - top + window.innerHeight * 0.2) / span));
  return { ratio, top, span };
}

export function ReadingProgress({ chapterId }: { chapterId: number }) {
  const barRef = useRef<HTMLDivElement>(null);
  const [offer, setOffer] = useState<number | null>(null);

  // 진행 막대 갱신 + 위치 저장
  useEffect(() => {
    let frame = 0;
    let lastSaved = 0;
    const update = () => {
      frame = 0;
      const result = measure();
      if (!result) return;
      if (barRef.current) barRef.current.style.transform = `scaleX(${result.ratio})`;
      const now = Date.now();
      // 맨 앞(5% 이내)에서는 저장하지 않는다: 회차를 열자마자 생기는 스크롤 이벤트가 읽던 위치를 0%로 덮어쓰지 않게
      if (result.ratio >= RESUME_MIN && now - lastSaved > SAVE_INTERVAL_MS) {
        lastSaved = now;
        try {
          localStorage.setItem(storageKey(chapterId), JSON.stringify({ ratio: result.ratio, at: now }));
        } catch {
          // 저장 공간이 막혀 있어도 읽기에는 지장 없음
        }
      }
      if (result.ratio > RESUME_MIN * 2) setOffer(null); // 직접 읽어 내려가면 권유는 접는다
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    // 처음 그릴 때: 막대 위치를 맞추고, 읽던 곳이 있으면 이어서 읽기를 권한다
    const saved = readSaved(chapterId);
    const initial = requestAnimationFrame(() => {
      const result = measure();
      if (barRef.current && result) barRef.current.style.transform = `scaleX(${result.ratio})`;
      if (saved !== null && saved > RESUME_MIN && saved < RESUME_MAX && (result?.ratio ?? 0) < RESUME_MIN) {
        setOffer(saved);
      }
    });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(frame);
      cancelAnimationFrame(initial);
    };
  }, [chapterId]);

  // 권유는 잠시 뒤 저절로 사라진다
  useEffect(() => {
    if (offer === null) return;
    const timer = window.setTimeout(() => setOffer(null), OFFER_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [offer]);

  function resume() {
    const result = measure();
    if (result && offer !== null) {
      window.scrollTo({ top: result.top + offer * result.span - window.innerHeight * 0.2, behavior: scrollBehavior() });
    }
    setOffer(null);
  }

  return (
    <>
      <div aria-hidden="true" className="fixed inset-x-0 top-0 z-40 h-[3px]">
        {/* scale-x-0 클래스는 Tailwind 4에서 CSS scale 속성이라 아래 transform과 곱해져 막대가 안 보인다 → 처음 값은 인라인으로 */}
        <div
          ref={barRef}
          style={{ transform: 'scaleX(0)' }}
          className="h-full origin-left bg-accent transition-transform duration-150 ease-out"
        />
      </div>
      {offer !== null ? (
        <div
          role="status"
          className="fixed inset-x-0 bottom-5 z-40 mx-auto flex w-fit max-w-[calc(100%-2rem)] items-center gap-1 rounded-full border border-line bg-surface py-1.5 pr-1.5 pl-4 text-sm shadow-lg shadow-black/10"
        >
          <span className="text-muted">지난번 {Math.round(offer * 100)}%까지 읽었어요</span>
          <button
            type="button"
            onClick={resume}
            className="h-8 rounded-full bg-accent px-3.5 font-semibold text-accent-fg transition hover:brightness-95"
          >
            이어서 읽기
          </button>
          <button
            type="button"
            onClick={() => setOffer(null)}
            aria-label="닫기"
            className="grid size-8 place-items-center rounded-full text-muted transition hover:bg-surface-2 hover:text-fg"
          >
            ✕
          </button>
        </div>
      ) : null}
    </>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { readingMinutes, remainingChars, remainingLabel, type ReadUnit } from '@/lib/reading-time';
import { cn } from '@/lib/utils';

// 회차 화면 '남은 읽는 시간': 읽어 내려가면 오른쪽 위(머리 바로 아래)에 '약 3분 남음'을 조용히 보여 준다.
// - 머리의 '약 N분'과 같은 셈 (1분에 600자, 템플릿 안의 글은 안 셈). 계산은 lib/reading-time.ts
// - 스크롤하는 동안 보였다가 멈추면 잠시 뒤 흐려진다 (글을 가리지 않게, 누를 수 없는 표시)
// - 본문 앞(머리의 '약 N분'이 보이는 곳)과 회차 끝이 화면에 들어온 뒤에는 안 보이고, 3분이 안 되는 짧은 회차에서는 아예 안 띄운다
// - 스크롤할 때마다 문단을 다시 재지 않도록 문단 위치는 처음 · 본문 크기가 바뀔 때(글자 크기 설정 등)만 잰다

const CONTENT_ID = 'chapter-content';
const MIN_TOTAL_MINUTES = 3;
const SHOW_MS = 1500;

/** 문단 덩어리의 문서 기준 위치와 글자수 (책갈피 · 소리 내어 듣기와 같은 덩어리) */
function measureUnits(content: HTMLElement): ReadUnit[] {
  return [...content.querySelectorAll<HTMLElement>(':scope > .contents > *, :scope > :not(.contents)')].map((element) => {
    const rect = element.getBoundingClientRect();
    const chars = element.dataset.speech !== undefined || element.tagName === 'HR' ? 0 : [...(element.textContent ?? '')].length;
    return { top: rect.top + window.scrollY, bottom: rect.bottom + window.scrollY, chars };
  });
}

export function RemainingTime({ charCount }: { charCount: number }) {
  const [label, setLabel] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [top, setTop] = useState(0);
  const enabled = (readingMinutes(charCount) ?? 0) >= MIN_TOTAL_MINUTES;

  useEffect(() => {
    const content = document.getElementById(CONTENT_ID);
    if (!enabled || !content) return;
    let units = measureUnits(content);
    let frame = 0;
    let hideTimer = 0;

    const update = () => {
      frame = 0;
      const headerBottom = Math.max(0, document.querySelector('header')?.getBoundingClientRect().bottom ?? 0);
      const line = window.scrollY + headerBottom + 8;
      const box = content.getBoundingClientRect();
      const contentTop = box.top + window.scrollY;
      const contentBottom = box.bottom + window.scrollY;
      // 아직 본문 앞이거나, 회차 끝이 화면에 들어왔으면 숨김
      if (line < contentTop || contentBottom <= window.scrollY + window.innerHeight) {
        setLabel(null);
        return;
      }
      setLabel(remainingLabel(remainingChars(units, line)));
      setTop(Math.round(headerBottom + 8));
      setVisible(true);
      window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => setVisible(false), SHOW_MS);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    // 글자 크기 · 줄 간격 · 본문 폭 설정이나 창 크기가 바뀌면 문단 위치를 다시 잰다
    const observer = new ResizeObserver(() => {
      units = measureUnits(content);
    });
    observer.observe(content);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      window.cancelAnimationFrame(frame);
      window.clearTimeout(hideTimer);
    };
  }, [enabled]);

  if (!label) return null;
  return (
    <p
      aria-hidden="true"
      data-print-hide=""
      style={{ top }}
      className={cn(
        'pointer-events-none fixed right-4 z-30 rounded-full border border-line bg-surface px-2.5 py-1 text-xs text-muted tabular-nums shadow-sm transition-opacity duration-300 motion-reduce:transition-none sm:right-6',
        visible ? 'opacity-100' : 'opacity-0',
      )}
    >
      {label}
    </p>
  );
}

'use client';

import { useEffect } from 'react';
import { activeSeconds, addReadTime, parseReadTime, READ_TICK_MS, READ_TIME_KEY } from '@/lib/read-time';
import { dayKey } from '@/lib/today-chars';

const ACTIVITY_EVENTS = ['scroll', 'pointerdown', 'keydown', 'wheel', 'touchstart'] as const;

/** 지금 '소리 내어 듣기'로 듣는 중인지 (멈춤 단추는 읽는 동안에만 있다) */
function listening(): boolean {
  return document.querySelector('[role="group"][aria-label="소리 내어 듣기"] button[aria-label="멈춤"]') !== null;
}

/**
 * 회차 화면에서 읽은 시간을 이 기기에 센다 (그리는 것 없음, 서버로 보내지 않음). 세는 규칙은 lib/read-time.ts.
 * 15초마다 세고, 탭이 숨는 순간 · 다른 화면으로 가는 순간까지의 몫도 센다
 */
export function ReadTimeTracker() {
  useEffect(() => {
    // 회차를 연 것도 움직임으로
    let lastActive = Date.now();
    let lastTick = Date.now();
    const mark = () => {
      lastActive = Date.now();
    };
    const tick = (visible = document.visibilityState === 'visible') => {
      const now = Date.now();
      const seconds = activeSeconds({ now, lastTick, lastActive, visible, listening: listening() });
      lastTick = now;
      if (seconds <= 0) return;
      try {
        const store = parseReadTime(localStorage.getItem(READ_TIME_KEY));
        localStorage.setItem(READ_TIME_KEY, JSON.stringify(addReadTime(store, dayKey(new Date(now)), seconds)));
      } catch {
        // 저장 공간이 막혀 있어도 읽기에는 지장 없음
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        // 숨어 있던 동안은 세지 않고 지금부터 다시
        lastTick = Date.now();
        mark();
      } else {
        // 숨기 직전까지는 보이던 시간
        tick(true);
      }
    };
    const onPageHide = () => tick(true);
    const timer = window.setInterval(() => tick(), READ_TICK_MS);
    for (const name of ACTIVITY_EVENTS) window.addEventListener(name, mark, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      // 다른 화면으로 갈 때 마지막 몫
      tick();
      window.clearInterval(timer);
      for (const name of ACTIVITY_EVENTS) window.removeEventListener(name, mark);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, []);
  return null;
}

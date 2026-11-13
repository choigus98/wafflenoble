'use client';

import { useSyncExternalStore } from 'react';
import { formatReadDuration, parseReadTime, READ_TIME_KEY, readTimeSummary } from '@/lib/read-time';
import { dayKey } from '@/lib/today-chars';

// 다른 탭에서 읽은 시간이 늘면 따라간다
function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

/** 오늘(한국 날짜)과 저장값을 한 글로 (값이 같으면 같은 글이라 다시 그리지 않음) */
function snapshot(): string {
  try {
    return `${dayKey(new Date())}|${localStorage.getItem(READ_TIME_KEY) ?? ''}`;
  } catch {
    return `${dayKey(new Date())}|`;
  }
}

/**
 * '내 기록'의 '이 기기에서 오늘 읽은 시간': 오늘 · 최근 7일 합계 (회차 화면에서 센 값, lib/read-time.ts).
 * 이 기기에만 있는 값이라 서버에서는 그리지 않고 브라우저에서 읽은 뒤 보여 준다
 */
export function TodayReadTime() {
  const value = useSyncExternalStore(subscribe, snapshot, () => null);
  if (value === null) return null;
  const split = value.indexOf('|');
  const date = value.slice(0, split);
  // 날짜 글의 그날 정오(한국 시간)를 기준으로 오늘 · 최근 7일
  const { today, week } = readTimeSummary(parseReadTime(value.slice(split + 1)), new Date(`${date}T12:00:00+09:00`));

  return (
    <section aria-labelledby="read-time-title" className="mt-3 rounded-2xl border border-line bg-surface px-4 py-3.5">
      <h2 id="read-time-title" className="text-xs font-semibold text-muted">
        이 기기에서 오늘 읽은 시간
      </h2>
      <p className="mt-1 text-2xl font-bold tabular-nums">{formatReadDuration(today)}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted">
        최근 7일 {formatReadDuration(week)} · 회차 화면이 보이고 스크롤하거나 소리 내어 듣는 동안만 세요. 이 기기에만 남아요.
      </p>
    </section>
  );
}

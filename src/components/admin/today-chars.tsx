'use client';

import { useEffect, useRef, useState } from 'react';
import { dayKey, msUntilNextDay, noteCount, openChapter, parseTodayStore, signedCount, TODAY_CHARS_KEY, type TodayStore } from '@/lib/today-chars';
import { cn } from '@/lib/utils';

function readStore(): TodayStore {
  try {
    return parseTodayStore(localStorage.getItem(TODAY_CHARS_KEY));
  } catch {
    return {};
  }
}

function writeStore(store: TodayStore) {
  try {
    localStorage.setItem(TODAY_CHARS_KEY, JSON.stringify(store));
  } catch {}
}

type Day = { date: string; base: number; others: number };

/** 오늘(한국 시간) 이 회차를 세기 시작: 기준 글자수와 다른 회차 몫 (에디터는 브라우저에서만 그려져서 바로 읽어도 됨) */
function startDay(id: string, count: number): Day {
  const date = dayKey(new Date());
  return { date, ...openChapter(readStore(), date, id, count) };
}

/**
 * 에디터 글자수 줄 옆 '오늘 +1,234자': 이 기기에서 오늘 늘어난 글자수 (공백 포함, 지운 만큼 뺌, 모든 회차를 더함).
 * 다른 회차도 오늘 고쳤으면 이 회차 몫을 괄호로 덧붙인다. 오늘 아직 바뀐 게 없으면 안 보인다.
 * count는 에디터가 본문을 다 읽은 뒤의 글자수여야 한다 (처음 값이 그날의 기준이 되므로)
 */
export function TodayChars({ chapterId, count }: { chapterId: number; count: number }) {
  const id = String(chapterId);
  const [day, setDay] = useState(() => startDay(id, count));
  // 자정·다른 탭 알림처럼 나중에 불리는 곳에서 쓰는 지금 글자수
  const countRef = useRef(count);

  // 글자수가 바뀔 때마다 이 기기에 기억 (다른 탭에서 다른 회차를 고쳤을 수 있어서 매번 새로 읽고 이 회차 줄만 바꿈)
  useEffect(() => {
    countRef.current = count;
    writeStore(noteCount(readStore(), day.date, id, day.base, count));
  }, [count, day, id]);

  // 다른 탭에서 다른 회차를 고치면 합계를 다시 셈
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== TODAY_CHARS_KEY) return;
      setDay((current) => ({ ...current, others: openChapter(readStore(), current.date, id, countRef.current).others }));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [id]);

  // 한국 시간 자정이 지나면 새로 셈 (그때의 글자수가 새 기준)
  useEffect(() => {
    const timer = window.setTimeout(() => setDay(startDay(id, countRef.current)), msUntilNextDay(new Date()) + 1000);
    return () => window.clearTimeout(timer);
  }, [day.date, id]);

  const mine = count - day.base;
  const total = day.others + mine;
  if (total === 0 && mine === 0) return null;
  return (
    <p className="text-[13px] text-muted tabular-nums" title="이 기기에서 오늘 늘어난 글자수 (공백 포함, 지운 만큼은 뺌, 모든 회차를 더함)">
      오늘 <span className={cn(total > 0 && 'font-semibold text-accent')}>{signedCount(total)}자</span>
      {day.others !== 0 ? ` (이 회차 ${signedCount(mine)}자)` : null}
    </p>
  );
}

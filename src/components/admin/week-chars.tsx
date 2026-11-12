'use client';

import { useRef, useState, useSyncExternalStore } from 'react';
import { dayLabel, parseTodayStore, signedCount, TODAY_CHARS_KEY, weekCounts } from '@/lib/today-chars';
import { cn } from '@/lib/utils';

// 관리자 홈 '최근 7일 쓴 글자수': 에디터의 '오늘 쓴 글자수'가 이 기기에 남긴 기록(최근 7일)으로 날마다 막대 하나.
// - 하나의 값이라 범례 없이, 고른 날(처음엔 오늘)만 강조색이고 나머지는 회색. 막대를 누르거나 가리키거나 포커스하면 위 줄에 그날 값
// - 지운 게 더 많은 날은 기준선 아래로 (글은 −로)
// - 이 기기 기록이라 서버에서는 그리지 않고 브라우저에서 읽는다 (다른 탭에서 쓰면 따라감)

const PLOT_HEIGHT = 96;

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

function readRaw(): string {
  try {
    return localStorage.getItem(TODAY_CHARS_KEY) ?? '';
  } catch {
    return '';
  }
}

export function WeekChars() {
  const raw = useSyncExternalStore(subscribe, readRaw, () => null);
  // 막대로 고른 날 (없으면 오늘)
  const [picked, setPicked] = useState<number | null>(null);
  const groupRef = useRef<HTMLDivElement>(null);
  if (raw === null) return null;

  const days = weekCounts(parseTodayStore(raw), new Date());
  const today = days.length - 1;
  const shown = picked ?? today;
  const total = days.reduce((sum, day) => sum + day.count, 0);
  const max = Math.max(0, ...days.map((day) => day.count));
  const min = Math.min(0, ...days.map((day) => day.count));
  const span = max - min || 1;
  // 기준선 자리 (막대 칸 위에서부터 px)
  const baseline = (max / span) * PLOT_HEIGHT;
  const label = (index: number) => `${dayLabel(days[index].date).long}${index === today ? ' 오늘' : ''}`;
  const leave = () => {
    if (!groupRef.current?.contains(document.activeElement)) setPicked(null);
  };

  return (
    <section aria-labelledby="week-chars-title">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id="week-chars-title" className="font-bold">
          최근 7일 쓴 글자수
        </h2>
        <p className="text-[13px] text-muted">
          이 기기 · 7일 합계 <span className="font-semibold text-fg tabular-nums">{signedCount(total)}자</span>
        </p>
      </div>
      {days.every((day) => day.count === 0) ? (
        <p className="mt-2 text-[13px] leading-relaxed text-muted">이 기기에서 최근 7일 동안 에디터로 쓴 글이 없어요. 쓰면 날마다 여기 쌓여요.</p>
      ) : (
        <div className="mt-3 rounded-2xl border border-line bg-surface p-4 sm:max-w-xl">
          <p className="text-sm">
            <span className="text-muted">{label(shown)}</span> <span className="font-semibold">{signedCount(days[shown].count)}자</span>
          </p>
          <div
            ref={groupRef}
            role="group"
            aria-label="날마다 쓴 글자수"
            onMouseLeave={leave}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setPicked(null);
            }}
            className="relative mt-3 grid grid-cols-7 gap-1"
          >
            {/* 기준선 (0자): 막대 칸 위 여백 4px + 기준선 자리 */}
            <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 h-px bg-line" style={{ top: 4 + baseline }} />
            {days.map((day, index) => {
              const up = (Math.max(0, day.count) / span) * PLOT_HEIGHT;
              const down = (Math.max(0, -day.count) / span) * PLOT_HEIGHT;
              const active = index === shown;
              return (
                <button
                  key={day.date}
                  type="button"
                  aria-pressed={active}
                  aria-label={`${label(index)}, ${signedCount(day.count)}자`}
                  onMouseEnter={() => setPicked(index)}
                  onFocus={() => setPicked(index)}
                  onClick={() => setPicked(index)}
                  className="flex flex-col items-center gap-1.5 rounded-lg pt-1 pb-0.5 transition hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-accent"
                >
                  <span aria-hidden="true" className="relative block w-full" style={{ height: PLOT_HEIGHT }}>
                    {day.count !== 0 ? (
                      <span
                        className={cn(
                          'absolute left-1/2 w-[min(24px,70%)] -translate-x-1/2 transition-colors',
                          day.count > 0 ? 'rounded-t-[4px]' : 'rounded-b-[4px]',
                          active ? 'bg-accent' : 'bg-muted/50',
                        )}
                        // 아주 적은 날도 보이게 2px은 그린다
                        style={day.count > 0 ? { top: baseline - Math.max(2, up), height: Math.max(2, up) } : { top: baseline, height: Math.max(2, down) }}
                      />
                    ) : null}
                  </span>
                  <span aria-hidden="true" className={cn('text-[11px] leading-none', index === today ? 'font-bold text-fg' : 'text-muted')}>
                    {index === today ? '오늘' : dayLabel(day.date).weekday}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

'use client';

import Link from 'next/link';
import { useId, useState, type ReactNode } from 'react';
import { Badge } from '@/components/ui';
import { addMonths, compareMonths, groupByDay, kstDayKey, kstMonthOf, monthGrid, type Month } from '@/lib/calendar';
import { formatTime } from '@/lib/format';
import { cn } from '@/lib/utils';

export type CalendarItem = { chapterId: number; novelId: number; novelTitle: string; novelPublished: boolean; position: number; title: string; at: string };

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/** 관리자 홈 '예약된 회차'의 목록 · 달력 바꾸기 (처음엔 목록) */
export function ScheduleViews({ heading, list, calendar }: { heading: ReactNode; list: ReactNode; calendar: ReactNode }) {
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const option = (value: 'list' | 'calendar', label: string) => (
    <button
      type="button"
      aria-pressed={view === value}
      onClick={() => setView(value)}
      className={cn(
        'h-8 rounded-md px-3 text-[13px] font-semibold transition',
        view === value ? 'bg-surface text-fg shadow-sm' : 'text-muted hover:text-fg',
      )}
    >
      {label}
    </button>
  );
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {heading}
        <div role="group" aria-label="보기" className="flex rounded-lg bg-surface-2 p-0.5">
          {option('list', '목록')}
          {option('calendar', '달력')}
        </div>
      </div>
      {view === 'list' ? list : calendar}
    </>
  );
}

/**
 * 예약 달력: 이번 달부터 마지막 예약이 있는 달까지 넘겨 보고, 예약이 있는 날을 누르면 그날 회차를 아래에 (시각 순).
 * 날짜는 한국 시간. 예약이 있는 날만 단추라서 탭으로 그날들만 돈다
 */
export function ScheduleCalendar({ items, now }: { items: CalendarItem[]; now: string }) {
  const first = kstMonthOf(new Date(now));
  const lastAt = items.reduce((latest, item) => (item.at > latest ? item.at : latest), now);
  const last = kstMonthOf(new Date(lastAt));
  const byDay = groupByDay(items, (item) => new Date(item.at));
  const todayKey = kstDayKey(new Date(now));
  const firstDayOf = (month: Month) => [...byDay.keys()].find((key) => key.startsWith(`${month.year}-${String(month.month).padStart(2, '0')}`)) ?? null;
  const [month, setMonth] = useState<Month>(first);
  const [selected, setSelected] = useState<string | null>(() => firstDayOf(first));
  const captionId = useId();
  const detailId = useId();

  function move(step: number) {
    const next = addMonths(month, step);
    setMonth(next);
    setSelected(firstDayOf(next));
  }

  const chosen = selected ? (byDay.get(selected) ?? []) : [];
  const [, chosenMonth, chosenDay] = selected?.split('-').map(Number) ?? [];
  const canBack = compareMonths(month, first) > 0;
  const canForward = compareMonths(month, last) < 0;
  const arrow = 'grid size-9 place-items-center rounded-lg text-fg transition hover:bg-surface-2 disabled:pointer-events-none disabled:opacity-30';

  return (
    <div className="rounded-2xl border border-line bg-surface p-3 sm:max-w-xl sm:p-4">
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={() => move(-1)} disabled={!canBack} aria-label="이전 달" className={arrow}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-4">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
        <p id={captionId} aria-live="polite" className="text-sm font-bold tabular-nums">
          {month.year}년 {month.month}월
        </p>
        <button type="button" onClick={() => move(1)} disabled={!canForward} aria-label="다음 달" className={arrow}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-4">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </div>
      <table aria-labelledby={captionId} className="mt-2 w-full table-fixed border-collapse text-center">
        <thead>
          <tr>
            {WEEKDAYS.map((weekday, index) => (
              <th key={weekday} scope="col" className={cn('pb-1 text-[11px] font-semibold text-muted', index === 0 && 'text-danger')}>
                {weekday}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {monthGrid(month).map((week) => (
            <tr key={week[0].key}>
              {week.map((cell) => {
                const count = cell.inMonth ? (byDay.get(cell.key)?.length ?? 0) : 0;
                const today = cell.key === todayKey;
                const label = `${month.month}월 ${cell.day}일${today ? ' 오늘' : ''}${count ? `, 예약 ${count}개` : ''}`;
                return (
                  <td key={cell.key} className="p-0.5">
                    {count > 0 ? (
                      <button
                        type="button"
                        aria-pressed={selected === cell.key}
                        aria-controls={detailId}
                        aria-label={label}
                        onClick={() => setSelected(cell.key)}
                        className={cn(
                          'flex h-11 w-full flex-col items-center justify-center gap-0.5 rounded-lg text-sm font-semibold tabular-nums transition',
                          selected === cell.key ? 'bg-accent text-accent-fg' : 'bg-accent-soft text-accent hover:brightness-95',
                          today && 'ring-2 ring-accent ring-offset-1 ring-offset-surface',
                        )}
                      >
                        {cell.day}
                        <span aria-hidden="true" className="text-[10px] leading-none font-bold">
                          {count}개
                        </span>
                      </button>
                    ) : (
                      <span
                        aria-hidden={cell.inMonth ? undefined : true}
                        className={cn(
                          'flex h-11 items-center justify-center rounded-lg text-sm tabular-nums',
                          cell.inMonth ? 'text-fg' : 'text-muted/60',
                          today && 'font-bold ring-2 ring-accent ring-offset-1 ring-offset-surface',
                        )}
                      >
                        {cell.day}
                        {today ? <span className="sr-only"> 오늘</span> : null}
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div id={detailId} aria-live="polite" className="mt-3 border-t border-line pt-3">
        {selected && chosen.length > 0 ? (
          <>
            <p className="text-xs font-semibold text-muted">
              {chosenMonth}월 {chosenDay}일 예약 {chosen.length}개
            </p>
            <ul className="mt-1.5 space-y-1">
              {chosen.map((item) => (
                <li key={item.chapterId}>
                  <Link
                    href={`/admin/novels/${item.novelId}/chapters/${item.chapterId}`}
                    className="flex items-start gap-3 rounded-lg px-2 py-2 transition hover:bg-surface-2"
                  >
                    <time dateTime={item.at} className="w-11 shrink-0 pt-px text-sm font-semibold text-accent tabular-nums">
                      {formatTime(new Date(item.at))}
                    </time>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {item.position}화 {item.title || '(제목 없음)'}
                      </span>
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                        <span className="min-w-0 truncate">{item.novelTitle}</span>
                        {item.novelPublished ? null : <Badge tone="danger">작품 비공개라 안 보여요</Badge>}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-xs text-muted">이 달에는 예약이 없어요.</p>
        )}
      </div>
    </div>
  );
}

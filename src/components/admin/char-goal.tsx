'use client';

import { useState, type KeyboardEvent } from 'react';
import { charGoalPercent, isCharGoal, parseCharGoal } from '@/lib/char-goal';
import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';

// 회차 글자수 목표 (공백 포함 기준). 회차마다가 아니라 이 기기에 하나만 기억한다 (보통 회차 분량이 비슷하니까)
const STORAGE_KEY = 'wn:char-goal';

function readGoal(): number | null {
  try {
    const value = Number(localStorage.getItem(STORAGE_KEY));
    return isCharGoal(value) ? value : null;
  } catch {
    return null;
  }
}

function writeGoal(goal: number | null) {
  try {
    if (goal === null) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, String(goal));
  } catch {}
}

/** 에디터 글자수 줄 옆: 목표가 없으면 '＋ 글자수 목표', 있으면 진행 막대와 % (에디터는 브라우저에서만 그려져서 바로 읽어도 됨) */
export function CharGoal({ count }: { count: number }) {
  const [goal, setGoal] = useState<number | null>(readGoal);
  const [editing, setEditing] = useState(false);

  function save(raw: string) {
    setEditing(false);
    const next = parseCharGoal(raw);
    setGoal(next);
    writeGoal(next);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      save(event.currentTarget.value);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setEditing(false);
    }
  }

  if (editing) {
    return (
      <label className="flex items-center gap-1.5 text-[13px] text-muted">
        목표
        <input
          autoFocus
          defaultValue={goal ?? ''}
          inputMode="numeric"
          placeholder="5000"
          aria-label="글자수 목표 (공백 포함, 비우면 없음)"
          onKeyDown={onKeyDown}
          onBlur={(event) => save(event.currentTarget.value)}
          className="h-8 w-24 rounded-lg border border-line bg-surface px-2 text-right text-base text-fg tabular-nums focus:border-accent focus:ring-3 focus:ring-accent/20 focus:outline-none sm:text-sm"
        />
        자
      </label>
    );
  }

  if (goal === null) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="h-7 rounded-lg px-2 text-[13px] font-semibold text-muted transition hover:bg-surface-2 hover:text-fg"
      >
        ＋ 글자수 목표
      </button>
    );
  }

  const percent = charGoalPercent(count, goal);
  const done = count >= goal;
  return (
    <span className="flex items-center gap-2 text-[13px] text-muted tabular-nums">
      <span
        role="progressbar"
        aria-label="글자수 목표"
        aria-valuemin={0}
        aria-valuemax={goal}
        aria-valuenow={Math.min(count, goal)}
        aria-valuetext={`${formatNumber(goal)}자 중 ${formatNumber(count)}자`}
        className="block h-1.5 w-20 overflow-hidden rounded-full bg-surface-2"
      >
        <span className="block h-full rounded-full bg-accent transition-[width]" style={{ width: `${percent}%` }} />
      </span>
      <span className={cn(done && 'font-semibold text-accent')}>{done ? '목표 달성' : `${percent}%`}</span>
      <button
        type="button"
        onClick={() => setEditing(true)}
        title="글자수 목표 바꾸기"
        className="rounded-md px-1 transition hover:bg-surface-2 hover:text-fg"
      >
        목표 {formatNumber(goal)}자
      </button>
    </span>
  );
}

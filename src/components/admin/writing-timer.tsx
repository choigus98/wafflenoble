'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { useDismiss } from '@/components/use-dismiss';
import { announce } from '@/lib/announce';
import { parseTodayStore, TODAY_CHARS_KEY, type TodayStore } from '@/lib/today-chars';
import { cn } from '@/lib/utils';
import {
  parseSprint,
  remainingClock,
  remainingWords,
  SPRINT_KEY,
  SPRINT_MINUTES,
  SPRINT_STALE_MS,
  sprintMessage,
  sprintResultLabel,
  sprintWritten,
  startSprint,
  type Sprint,
} from '@/lib/writing-timer';

// 에디터는 브라우저에서만 그려져서(chapter-editor-loader) 처음 그릴 때 이 기기 저장값을 바로 읽어도 된다
function readSprint(): Sprint | null {
  try {
    return parseSprint(localStorage.getItem(SPRINT_KEY));
  } catch {
    return null;
  }
}

function writeSprint(sprint: Sprint | null) {
  try {
    if (sprint) localStorage.setItem(SPRINT_KEY, JSON.stringify(sprint));
    else localStorage.removeItem(SPRINT_KEY);
  } catch {}
}

function readToday(): TodayStore {
  try {
    return parseTodayStore(localStorage.getItem(TODAY_CHARS_KEY));
  } catch {
    return {};
  }
}

const HINTS: Record<number, string> = { 15: '짧게 몰아 쓰기', 25: '한 번 집중하기', 50: '길게 이어 쓰기' };
const MENU_WIDTH = 232;

/** 결과를 낭독기용 말로: '412자 씀' · '늘어난 글자 없음' · '120자 줄어듦' */
function resultWords(result: number): string {
  if (result > 0) return `${result.toLocaleString('ko-KR')}자 씀`;
  if (result < 0) return `${Math.abs(result).toLocaleString('ko-KR')}자 줄어듦`;
  return '늘어난 글자 없음';
}

/**
 * 에디터 도구 막대의 '글쓰기 타이머': 누르면 15 · 25 · 50분 중 골라 시작.
 * 도는 동안 단추에 남은 시간(24:13), 끝나면 단추가 채워진 색으로 바뀌며 그동안 쓴 글자수(+412자)를 보여 주고 낭독기에도 알린다.
 * 결과는 닫거나 새로 시작할 때까지 남는다. 새로 고침하거나 다른 회차로 가도 이 기기에서 이어진다 (계산은 lib/writing-timer.ts)
 */
export function WritingTimer() {
  const [sprint, setSprint] = useState<Sprint | null>(readSprint);
  const [now, setNow] = useState(() => Date.now());
  const [open, setOpen] = useState(false);
  const [place, setPlace] = useState({ left: 0, width: MENU_WIDTH });
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  useDismiss({ open, onClose: () => setOpen(false), rootRef, triggerRef });

  // 도는 동안 1초마다 남은 시간을 그리고, 끝나면 그동안 쓴 글자수를 적어 둔 뒤 알린다.
  // 새로 고침했을 때 이미 끝나 있으면 바로, 다른 탭을 보다 돌아오면 그때 바로 (숨은 탭은 타이머가 느려져서)
  useEffect(() => {
    if (!sprint || sprint.result !== null) return;
    const tick = () => {
      const current = Date.now();
      setNow(current);
      if (current < sprint.endsAt) return;
      if (current - sprint.endsAt > SPRINT_STALE_MS) {
        writeSprint(null);
        setSprint(null);
        return;
      }
      const result = sprintWritten(readToday(), sprint);
      const done = { ...sprint, result };
      writeSprint(done);
      setSprint(done);
      announce(sprintMessage(sprint.minutes, result));
    };
    const first = window.setTimeout(tick, 0);
    const timer = window.setInterval(tick, 1000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [sprint]);

  // 다른 탭(다른 회차 에디터)에서 시작하거나 멈추면 따라간다
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== SPRINT_KEY) return;
      setSprint(readSprint());
      setNow(Date.now());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const items = () => [...(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [])];

  useEffect(() => {
    if (open) items()[0]?.focus();
  }, [open]);

  function toggle(next: boolean) {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (next && rect) {
      const viewport = document.documentElement.clientWidth;
      const width = Math.min(MENU_WIDTH, viewport - 16);
      // 오른쪽이 넘치면 그만큼 왼쪽으로, 그래도 왼쪽 여백(8px)보다 더 가지는 않게
      const left = Math.max(8 - rect.left, Math.min(0, viewport - 8 - (rect.left + width)));
      setPlace({ left, width });
      setNow(Date.now());
    }
    setOpen(next);
  }

  function finish(next: Sprint | null, message: string | null) {
    writeSprint(next);
    setSprint(next);
    // 새로 시작했으면 지금 = 시작 시각 (다음 1초 틱 전까지 '25:00'으로)
    if (next) setNow(next.endsAt - next.minutes * 60_000);
    setOpen(false);
    triggerRef.current?.focus();
    if (message) announce(message);
  }

  function onMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const list = items();
    if (list.length === 0) return;
    if (event.key === 'Tab') {
      setOpen(false);
      return;
    }
    const index = list.indexOf(document.activeElement as HTMLButtonElement);
    const next =
      event.key === 'ArrowDown'
        ? (index + 1) % list.length
        : event.key === 'ArrowUp'
          ? (index - 1 + list.length) % list.length
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? list.length - 1
              : null;
    if (next === null) return;
    event.preventDefault();
    list[next]?.focus();
  }

  const running = sprint !== null && sprint.result === null;
  const left = running ? sprint.endsAt - now : 0;
  const result = sprint?.result ?? null;
  const label = running ? `글쓰기 타이머, ${Math.max(1, Math.ceil(left / 60_000))}분 남음` : result !== null ? `글쓰기 타이머 끝, ${resultWords(result)}` : '글쓰기 타이머';
  const status = running ? `${remainingWords(left)} 남았어요` : result !== null && sprint ? `${sprint.minutes}분 동안 ${sprintResultLabel(result)}` : '끝나면 그동안 쓴 글자수를 알려 줘요';

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={label}
        title={running ? '남은 시간 · 눌러서 멈출 수 있어요' : result !== null ? '타이머 끝 · 그동안 쓴 글자수 (누르면 다시 시작하거나 닫기)' : '글쓰기 타이머 (15 · 25 · 50분)'}
        onClick={() => toggle(!open)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            toggle(true);
          }
        }}
        className={cn(
          'flex h-8 min-w-8 items-center justify-center gap-1 rounded-lg px-2 text-[13px] font-semibold tabular-nums transition',
          result !== null ? 'bg-accent text-accent-fg hover:brightness-95' : running || open ? 'bg-accent-soft text-accent' : 'text-fg hover:bg-surface-2',
        )}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-4 shrink-0">
          {result !== null ? (
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          ) : (
            <>
              <circle cx="12" cy="13.5" r="7.5" />
              <path d="M12 9.5v4l2.5 2M9.5 2.5h5M12 2.5V6" />
            </>
          )}
        </svg>
        {running ? <span aria-hidden="true">{remainingClock(left)}</span> : result !== null ? <span aria-hidden="true">{sprintResultLabel(result)}</span> : null}
      </button>
      {open ? (
        <div style={{ left: place.left, width: place.width }} className="absolute top-10 z-30 rounded-xl border border-line bg-surface p-1 shadow-lg shadow-black/10">
          <p id={`${menuId}-status`} className="px-2.5 pt-1.5 pb-1 text-xs text-muted tabular-nums">
            {status}
          </p>
          <div ref={menuRef} id={menuId} role="menu" aria-label="글쓰기 타이머" aria-describedby={`${menuId}-status`} onKeyDown={onMenuKeyDown}>
            {running ? (
              <button
                type="button"
                role="menuitem"
                onClick={() => finish(null, '타이머를 멈췄어요')}
                className="flex w-full items-center rounded-lg px-2.5 py-2 text-left text-sm font-semibold text-fg transition hover:bg-surface-2"
              >
                타이머 멈추기
              </button>
            ) : (
              <>
                {SPRINT_MINUTES.map((minutes) => (
                  <button
                    key={minutes}
                    type="button"
                    role="menuitem"
                    aria-label={`${minutes}분 쓰기`}
                    aria-describedby={`${menuId}-${minutes}`}
                    onClick={() => finish(startSprint(minutes, new Date(), readToday()), `${minutes}분 타이머를 시작했어요`)}
                    className="flex w-full items-baseline justify-between gap-2 rounded-lg px-2.5 py-2 text-left transition hover:bg-surface-2"
                  >
                    <span className="text-sm font-semibold text-fg tabular-nums">{minutes}분</span>
                    <span id={`${menuId}-${minutes}`} className="text-xs text-muted">
                      {HINTS[minutes]}
                    </span>
                  </button>
                ))}
                {result !== null ? (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => finish(null, null)}
                    className="mt-0.5 flex w-full items-center rounded-lg border-t border-line px-2.5 py-2 text-left text-sm text-muted transition hover:bg-surface-2 hover:text-fg"
                  >
                    결과 닫기
                  </button>
                ) : null}
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

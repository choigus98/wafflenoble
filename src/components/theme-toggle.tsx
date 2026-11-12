'use client';

import { useEffect, useId, useRef, useState, useSyncExternalStore, type KeyboardEvent, type ReactNode } from 'react';
import { useDismiss } from '@/components/use-dismiss';
import { parseReaderPrefs, readReaderPrefsRaw, saveThemeChoice, subscribeReaderPrefs, type ThemeChoice } from '@/lib/reader-prefs';
import { cn } from '@/lib/utils';

type Mode = 'auto' | ThemeChoice;

const OPTIONS: Array<{ mode: Mode; label: string }> = [
  { mode: 'auto', label: '자동 (기기 설정)' },
  { mode: 'light', label: '밝게' },
  { mode: 'dark', label: '어둡게' },
];
const SHORT: Record<Mode, string> = { auto: '자동', light: '밝게', dark: '어둡게' };

function ModeIcon({ mode, className }: { mode: Mode; className?: string }) {
  const paths: Record<Mode, ReactNode> = {
    // 반쯤 칠한 동그라미: 기기 설정을 따름
    auto: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor" stroke="none" />
      </>
    ),
    light: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4" />
      </>
    ),
    dark: <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />,
  };
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      {paths[mode]}
    </svg>
  );
}

/**
 * 위쪽 바의 화면 모드 단추 (자동 · 밝게 · 어둡게). 회차 화면 '가'의 '화면' 설정과 같은 값이라 어디서 바꿔도 같이 바뀐다.
 * 열면 지금 모드에 포커스, ↑/↓로 고르고 Enter, Esc는 닫고 단추로 돌아간다.
 * 메뉴는 이 단추를 감싼 단추 묶음(relative)의 오른쪽 끝에 맞춘다 — 좁은 화면에서 왼쪽 밖으로 나가지 않게
 */
export function ThemeToggle() {
  // 서버에서는 '자동'으로 그리고 브라우저에서 저장값으로 바꾼다 (화면 색 자체는 첫 그리기 전에 이미 반영됨)
  const raw = useSyncExternalStore(subscribeReaderPrefs, readReaderPrefsRaw, () => null);
  const mode: Mode = parseReaderPrefs(raw).theme ?? 'auto';
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  useDismiss({ open, onClose: () => setOpen(false), rootRef, triggerRef });

  useEffect(() => {
    if (open) menuRef.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus();
  }, [open]);

  function choose(next: Mode) {
    saveThemeChoice(next === 'auto' ? undefined : next);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function onMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Tab') {
      setOpen(false);
      return;
    }
    const items = [...(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]') ?? [])];
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    const next =
      event.key === 'ArrowDown'
        ? (index + 1) % items.length
        : event.key === 'ArrowUp'
          ? (index - 1 + items.length) % items.length
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? items.length - 1
              : null;
    if (next === null) return;
    event.preventDefault();
    items[next]?.focus();
  }

  return (
    <div ref={rootRef} className="shrink-0">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`화면 모드: ${SHORT[mode]}`}
        title={`화면 모드: ${SHORT[mode]}`}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className="grid size-9 place-items-center rounded-xl border border-line bg-surface text-fg transition hover:bg-surface-2"
      >
        <ModeIcon mode={mode} className="size-[18px]" />
      </button>
      {open ? (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label="화면 모드"
          onKeyDown={onMenuKeyDown}
          className="absolute top-11 right-0 z-40 w-52 max-w-[calc(100vw-2rem)] rounded-2xl border border-line bg-surface p-1.5 shadow-lg shadow-black/10"
        >
          {OPTIONS.map((option) => (
            <button
              key={option.mode}
              type="button"
              role="menuitemradio"
              aria-checked={mode === option.mode}
              onClick={() => choose(option.mode)}
              className={cn(
                'flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm font-medium transition hover:bg-surface-2',
                mode === option.mode && 'bg-accent-soft text-accent hover:bg-accent-soft',
              )}
            >
              <ModeIcon mode={option.mode} className="size-4 shrink-0" />
              <span className="flex-1 whitespace-nowrap">{option.label}</span>
              {mode === option.mode ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-4 shrink-0">
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

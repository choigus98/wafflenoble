'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { useDismiss } from '@/components/use-dismiss';
import { cn } from '@/lib/utils';

/** 도구 막대 아래에 여는 점검 창 */
export type CheckTool = 'spelling' | 'quotes' | 'repeats' | 'characters' | 'dialogue' | 'long' | 'scenes' | 'speak';

const ITEMS: Array<{ key: CheckTool | 'polish'; label: string; hint: string }> = [
  { key: 'polish', label: '문장 부호 다듬기', hint: '... → … · 곧은 따옴표 → 둥근 따옴표 (바로 바꿈)' },
  { key: 'spelling', label: '자주 틀리는 말', hint: '됬 → 됐 · 몇일 → 며칠 · 할께 → 할게' },
  { key: 'quotes', label: '따옴표 짝', hint: '여는 따옴표와 닫는 따옴표의 짝이 안 맞는 문단' },
  { key: 'repeats', label: '반복되는 말', hint: '세 번 이상 나온 낱말과 횟수' },
  { key: 'characters', label: '등장인물 횟수', hint: '작품 등장인물이 이 회차에 몇 번 나오는지' },
  { key: 'dialogue', label: '대사 모아 보기', hint: '따옴표로 시작하는 문단만 차례로 (말투 살피기)' },
  { key: 'long', label: '긴 문장', hint: '80 · 100 · 150자보다 긴 문장' },
  { key: 'scenes', label: '장면 바로가기', hint: '장면 전환(✦)으로 나뉜 장면 목록' },
  { key: 'speak', label: '소리 내어 읽기', hint: '브라우저 목소리로 지금 문단부터 (귀로 다듬기)' },
];

const MENU_WIDTH = 272;

/**
 * 에디터 도구 막대의 '글 점검' 메뉴: 문장 부호 다듬기(바로 실행)와 점검 창들(도구 막대 아래에 열림).
 * 휴대폰에서 도구 막대가 세 줄로 늘어나지 않게 하나로 묶었다. 그림 단추 대신 이름과 설명이 보여서 데스크톱에서도 알아보기 쉽다.
 * 열면 열린 창의 항목(없으면 첫 항목)에 포커스, ↑/↓·Home/End로 고르고 Enter, Esc는 닫고 단추로 돌아간다.
 * 열린 창은 체크 표시(낭독기에는 '선택됨'), 다시 고르면 닫힌다
 */
export function CheckMenu({ openTool, onPolish, onTool }: { openTool: CheckTool | null; onPolish: () => void; onTool: (tool: CheckTool) => void }) {
  const [open, setOpen] = useState(false);
  // 메뉴 자리: 단추 왼쪽 끝에서 시작하되 화면 밖으로 나가지 않게 좌우 8px 안으로 당긴다 (단추 기준 왼쪽 위치, 너비).
  // 높이는 단추 아래 남은 화면만큼 (위에 붙은 막대에 달려 있어 페이지를 스크롤해도 아래가 안 보이므로, 넘치면 메뉴 안에서 스크롤)
  const [place, setPlace] = useState({ left: 0, width: MENU_WIDTH, maxHeight: 480 });
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  useDismiss({ open, onClose: () => setOpen(false), rootRef, triggerRef });

  const items = () => [...(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role^="menuitem"]') ?? [])];

  useEffect(() => {
    if (!open) return;
    const list = items();
    (list.find((item) => item.getAttribute('aria-checked') === 'true') ?? list[0])?.focus();
  }, [open]);

  function toggle(next: boolean) {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (next && rect) {
      const viewport = document.documentElement.clientWidth;
      const width = Math.min(MENU_WIDTH, viewport - 16);
      // 오른쪽이 넘치면 그만큼 왼쪽으로, 그래도 왼쪽 여백(8px)보다 더 가지는 않게
      const left = Math.max(8 - rect.left, Math.min(0, viewport - 8 - (rect.left + width)));
      setPlace({ left, width, maxHeight: Math.max(160, window.innerHeight - rect.top - 48) });
    }
    setOpen(next);
  }

  function choose(key: CheckTool | 'polish') {
    setOpen(false);
    if (key === 'polish') {
      onPolish();
      triggerRef.current?.focus();
      return;
    }
    const closing = openTool === key;
    onTool(key);
    // 열린 창을 닫은 거면 포커스를 이 단추로 (창이 열리면 창이 자기 첫 항목으로 포커스를 가져간다)
    if (closing) triggerRef.current?.focus();
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

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        title="글 점검: 문장 부호 · 자주 틀리는 말 · 따옴표 짝 · 반복되는 말 · 등장인물 · 대사 · 긴 문장 · 장면 · 소리 내어 읽기"
        onClick={() => toggle(!open)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            toggle(true);
          }
        }}
        className={cn(
          'flex h-8 items-center gap-1 rounded-lg px-2 text-[13px] font-semibold transition',
          openTool || open ? 'bg-accent-soft text-accent' : 'text-fg hover:bg-surface-2',
        )}
      >
        글 점검
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-3.5">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open ? (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label="글 점검"
          onKeyDown={onMenuKeyDown}
          style={{ left: place.left, width: place.width, maxHeight: place.maxHeight }}
          className="absolute top-10 z-30 overflow-y-auto overscroll-contain rounded-xl border border-line bg-surface p-1 shadow-lg shadow-black/10"
        >
          {ITEMS.map((item) => {
            const checked = item.key !== 'polish' && openTool === item.key;
            return (
              <button
                key={item.key}
                type="button"
                role={item.key === 'polish' ? 'menuitem' : 'menuitemcheckbox'}
                aria-checked={item.key === 'polish' ? undefined : checked}
                // 낭독기에는 이름만 이름으로, 설명은 설명으로 (붙여 읽으면 '자주 틀리는 말됬 → 됐'처럼 들려서)
                aria-label={item.label}
                aria-describedby={`${menuId}-${item.key}`}
                onClick={() => choose(item.key)}
                className={cn('flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left transition', checked ? 'bg-accent-soft' : 'hover:bg-surface-2')}
              >
                <span aria-hidden="true" className="mt-0.5 grid size-4 shrink-0 place-items-center text-accent">
                  {checked ? (
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="size-4">
                      <path d="M5 10.5l3.2 3.2L15 7" />
                    </svg>
                  ) : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-fg">{item.label}</span>
                  <span id={`${menuId}-${item.key}`} className="block text-xs text-muted">
                    {item.hint}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

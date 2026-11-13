'use client';

import { useEffect, useId, useRef, type KeyboardEvent } from 'react';
import { useDismiss } from '@/components/use-dismiss';
import { cn } from '@/lib/utils';

export type BlockMenuAction = 'up' | 'down' | 'duplicate' | 'reset-size' | 'delete';

const ITEMS: Array<{ action: BlockMenuAction; label: string }> = [
  { action: 'up', label: '위로 옮기기' },
  { action: 'down', label: '아래로 옮기기' },
  { action: 'duplicate', label: '복제' },
  { action: 'reset-size', label: '원래 크기로' },
  { action: 'delete', label: '삭제' },
];

/**
 * 템플릿 도구 막대의 ⋯ 메뉴: 위로·아래로 옮기기, 복제, 원래 크기로(크기를 바꾼 템플릿만), 삭제.
 * 끌어서 옮기기 어려운 휴대폰과 키보드에서도 순서를 바꿀 수 있게. 열면 첫 항목에 포커스,
 * ↑/↓·Home/End로 고르고 Enter, Esc는 닫고 ⋯ 단추로 돌아간다.
 */
export function BlockMenu({
  label,
  open,
  onOpenChange,
  can,
  onAction,
}: {
  label: string; // '카톡 1:1 대화'
  open: boolean;
  onOpenChange: (open: boolean) => void;
  can: { up: boolean; down: boolean; resetSize: boolean }; // 맨 위·맨 아래면 그쪽으로는 못 옮김, 원래 크기면 '원래 크기로' 없음
  onAction: (action: BlockMenuAction) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  useDismiss({ open, onClose: () => onOpenChange(false), rootRef, triggerRef });

  const items = () => [...(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ?? [])];

  useEffect(() => {
    if (open) items()[0]?.focus();
  }, [open]);

  function onMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const list = items();
    if (list.length === 0) return;
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
    if (event.key === 'Tab') {
      onOpenChange(false);
      return;
    }
    if (next === null) return;
    event.preventDefault();
    list[next]?.focus();
  }

  const disabled = (action: BlockMenuAction) => (action === 'up' && !can.up) || (action === 'down' && !can.down);

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        data-block-menu=""
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`${label} 메뉴`}
        title="옮기기 · 복제 · 삭제"
        onClick={() => onOpenChange(!open)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            onOpenChange(true);
          }
        }}
        className={cn('grid size-7 place-items-center rounded-full text-muted transition hover:bg-surface-2 hover:text-fg', open && 'bg-surface-2 text-fg')}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="size-4">
          <circle cx="5" cy="12" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="19" cy="12" r="1.8" />
        </svg>
      </button>
      {open ? (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={`${label} 메뉴`}
          onKeyDown={onMenuKeyDown}
          className="absolute top-9 right-0 z-30 w-36 rounded-xl border border-line bg-surface p-1 shadow-lg shadow-black/10"
        >
          {ITEMS.filter((item) => item.action !== 'reset-size' || can.resetSize).map((item) => (
            <button
              key={item.action}
              type="button"
              role="menuitem"
              disabled={disabled(item.action)}
              onClick={() => {
                onOpenChange(false);
                onAction(item.action);
              }}
              className={cn(
                'flex h-9 w-full items-center rounded-lg px-3 text-left text-sm font-medium transition disabled:pointer-events-none disabled:opacity-40',
                item.action === 'delete' ? 'text-danger hover:bg-danger/10' : 'text-fg hover:bg-surface-2',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

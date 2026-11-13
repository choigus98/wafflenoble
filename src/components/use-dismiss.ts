'use client';

import { useEffect, useEffectEvent, type RefObject } from 'react';

// 이 훅으로 연 팝오버 · 메뉴 가운데 지금 열려 있는 수.
// 회차 화면 ←/→ 이동(reader/chapter-key-nav.tsx)이, 열린 읽기 설정 · 화면 모드 · 이름 메뉴를 쓰는 동안은 비켜 가게
let openPopups = 0;

/** 이 훅으로 연 팝오버 · 메뉴가 하나라도 열려 있는지 */
export function popupIsOpen(): boolean {
  return openPopups > 0;
}

/**
 * 열린 팝오버·메뉴를 바깥을 누르거나 Esc를 누르면 닫는다.
 * Esc로 닫을 때 포커스가 안에 있었으면 여는 버튼으로 돌려준다 (키보드로 쓰는 사람이 화면 맨 앞으로 튕기지 않게)
 */
export function useDismiss({
  open,
  onClose,
  rootRef,
  triggerRef,
}: {
  open: boolean;
  onClose: () => void;
  rootRef: RefObject<HTMLElement | null>;
  triggerRef?: RefObject<HTMLElement | null>;
}) {
  const handle = useEffectEvent((event: MouseEvent | KeyboardEvent) => {
    if (event instanceof KeyboardEvent) {
      if (event.key !== 'Escape') return;
      const hadFocus = rootRef.current?.contains(document.activeElement) ?? false;
      onClose();
      if (hadFocus) triggerRef?.current?.focus();
      return;
    }
    if (!rootRef.current?.contains(event.target as Node)) onClose();
  });

  useEffect(() => {
    if (!open) return;
    openPopups += 1;
    const listener = (event: MouseEvent | KeyboardEvent) => handle(event);
    document.addEventListener('mousedown', listener);
    document.addEventListener('keydown', listener);
    return () => {
      openPopups -= 1;
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('keydown', listener);
    };
  }, [open]);
}

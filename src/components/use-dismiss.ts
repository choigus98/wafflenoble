'use client';

import { useEffect, useEffectEvent, type RefObject } from 'react';

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
    const listener = (event: MouseEvent | KeyboardEvent) => handle(event);
    document.addEventListener('mousedown', listener);
    document.addEventListener('keydown', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('keydown', listener);
    };
  }, [open]);
}

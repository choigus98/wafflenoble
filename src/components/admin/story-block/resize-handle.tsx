'use client';

import { useCallback, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { BLOCK_SIZE } from '@/lib/story-blocks';
import { cn } from '@/lib/utils';

// 템플릿 크기 손잡이: 카드 오른쪽 아래 모서리를 대각선으로 끌면 비율 그대로 커지고 작아진다 (5% 단위).
// 키보드는 ←↓ 작게 · →↑ 크게 (PageUp/PageDown은 20%씩, Home은 가장 작게, End는 가장 크게), 두 번 누르면 원래 크기.
// 끄는 동안은 화면에만 보여 주고(onPreview), 손을 떼면 문서에 한 번 반영한다(onCommit, 되돌리기 한 번이면 그 전 크기로)

const STEP = 5;

function snapSize(value: number, max: number): number {
  return Math.min(max, Math.max(BLOCK_SIZE.min, Math.round(value / STEP) * STEP));
}

/**
 * 이 화면에서 키워 보일 수 있는 가장 큰 크기. 키운 템플릿은 본문 폭을 넘지 않고,
 * 좁은 화면(40rem 미만)에서는 원래 크기로 보이므로(globals.css의 .wn-size) 그만큼까지만 끌리게 한다
 */
function visibleMax(card: HTMLElement, size: number): number {
  if (!window.matchMedia('(width >= 40rem)').matches) return Math.max(BLOCK_SIZE.normal, Math.min(size, BLOCK_SIZE.normal));
  const zoom = card.closest<HTMLElement>('.wn-size-zoom');
  const parent = card.closest<HTMLElement>('.wn-size')?.parentElement;
  if (!zoom || !parent) return BLOCK_SIZE.max;
  const style = getComputedStyle(parent);
  const available = parent.clientWidth - Number.parseFloat(style.paddingLeft) - Number.parseFloat(style.paddingRight);
  const width = card.getBoundingClientRect().width;
  // 이미 본문 폭에 꽉 찼으면 지금 크기까지만
  if (width >= available - 1) return Math.min(BLOCK_SIZE.max, Math.max(BLOCK_SIZE.normal, size));
  const original = width / (Number.parseFloat(getComputedStyle(zoom).zoom) || 1); // 원래 크기(100%)일 때 너비
  return Math.min(BLOCK_SIZE.max, Math.max(BLOCK_SIZE.normal, Math.floor((available / original) * 20) * STEP));
}

// size: 끌기 시작한 크기(화면에 보이는 크기), stored: 저장돼 있던 크기, moved: 실제로 끌었는지 (눌렀다 떼기만 하면 그대로)
type Drag = { id: number; x: number; y: number; size: number; stored: number; width: number; height: number; max: number; moved: boolean };

/** 템플릿 칸(카드와 도구 막대를 감싼 relative 칸)의 바로 안쪽에 둔다. 위치는 그 칸 기준으로 잰다 */
export function BlockResizeHandle({
  size,
  label,
  className,
  onPreview,
  onCommit,
}: {
  size: number; // 문서에 저장된 크기
  label: string; // '라이브 방송창'
  className?: string;
  onPreview: (size: number | null) => void; // 끄는 동안의 크기 (null이면 끝)
  onCommit: (size: number) => void;
}) {
  const handleRef = useRef<HTMLDivElement>(null);
  const [spot, setSpot] = useState<{ left: number; top: number } | null>(null);
  const [live, setLive] = useState<number | null>(null);
  const liveRef = useRef(size);
  const dragRef = useRef<Drag | null>(null);
  const shown = live ?? size;

  // 부모 칸은 손잡이 자신에서 찾는다 (처음 그릴 때 부모의 ref는 아직 비어 있어서)
  const frameOf = useCallback(() => handleRef.current?.parentElement ?? null, []);
  const cardOf = useCallback(() => frameOf()?.querySelector<HTMLElement>('.wn-size-zoom .wn-block') ?? null, [frameOf]);

  // 카드 오른쪽 아래 모서리에 붙인다 (크기·글·화면 폭이 바뀌면 다시)
  useLayoutEffect(() => {
    const frame = frameOf();
    if (!frame) return;
    const place = () => {
      const card = cardOf();
      if (!card) {
        setSpot(null);
        return;
      }
      const outer = frame.getBoundingClientRect();
      const rect = card.getBoundingClientRect();
      const next = { left: Math.round(rect.right - outer.left), top: Math.round(rect.bottom - outer.top) };
      setSpot((prev) => (prev && prev.left === next.left && prev.top === next.top ? prev : next));
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(frame);
    const card = cardOf();
    if (card) observer.observe(card);
    return () => observer.disconnect();
  }, [frameOf, cardOf, shown]);

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    const card = cardOf();
    if (!card) return;
    // 기본 동작을 막으면 뒤따르는 mousedown이 안 생겨서, ProseMirror가 이걸 템플릿 고르기·끌어 옮기기로 받지 않는다
    event.preventDefault();
    const rect = card.getBoundingClientRect();
    // 휴대폰에서 키운 템플릿은 원래 크기로 보이므로, 보이는 크기부터 끈다 (손가락을 그대로 따라오게)
    const zoom = card.closest<HTMLElement>('.wn-size-zoom');
    const shownSize = zoom ? Math.round((Number.parseFloat(getComputedStyle(zoom).zoom) || 1) * 100) : size;
    const base = Math.min(size, shownSize);
    dragRef.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      size: base,
      stored: size,
      width: rect.width,
      height: rect.height,
      max: Math.max(visibleMax(card, base), base),
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    liveRef.current = base;
    setLive(base);
    onPreview(base);
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || event.pointerId !== drag.id) return;
    // 카드는 가운데 정렬이라 크기가 f배가 되면 오른쪽 아래 모서리는 (너비/2, 높이)·(f−1)만큼 움직인다.
    // 끈 거리를 그 방향으로 재서 f를 구한다 (대각선으로 끌면 손가락을 그대로 따라온다)
    const ax = drag.width / 2;
    const ay = drag.height;
    const factor = 1 + ((event.clientX - drag.x) * ax + (event.clientY - drag.y) * ay) / (ax * ax + ay * ay);
    const next = snapSize(drag.size * factor, drag.max);
    if (next === liveRef.current) return;
    drag.moved = true;
    liveRef.current = next;
    setLive(next);
    onPreview(next);
  }

  function finish(event: PointerEvent<HTMLDivElement>, commit: boolean) {
    const drag = dragRef.current;
    if (!drag || event.pointerId !== drag.id) return;
    dragRef.current = null;
    setLive(null);
    onPreview(null);
    if (commit && drag.moved && liveRef.current !== drag.stored) onCommit(liveRef.current);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const card = cardOf();
    const max = card ? Math.max(visibleMax(card, size), size) : BLOCK_SIZE.max;
    const next =
      event.key === 'ArrowRight' || event.key === 'ArrowUp'
        ? size + STEP
        : event.key === 'ArrowLeft' || event.key === 'ArrowDown'
          ? size - STEP
          : event.key === 'PageUp'
            ? size + STEP * 4
            : event.key === 'PageDown'
              ? size - STEP * 4
              : event.key === 'Home'
                ? BLOCK_SIZE.min
                : event.key === 'End'
                  ? max
                  : null;
    if (next === null) return;
    event.preventDefault();
    const snapped = snapSize(next, max);
    if (snapped !== size) onCommit(snapped);
  }

  return (
    <div
      ref={handleRef}
      role="slider"
      tabIndex={0}
      aria-label={`${label} 크기`}
      aria-valuemin={BLOCK_SIZE.min}
      aria-valuemax={BLOCK_SIZE.max}
      aria-valuenow={shown}
      aria-valuetext={shown === BLOCK_SIZE.normal ? '원래 크기' : `${shown}%`}
      title="끌어서 크기 바꾸기 · 두 번 누르면 원래 크기"
      data-block-resize=""
      draggable={false}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(event) => finish(event, true)}
      onPointerCancel={(event) => finish(event, false)}
      onLostPointerCapture={(event) => finish(event, true)}
      onDragStart={(event) => event.preventDefault()}
      onDoubleClick={() => {
        if (size !== BLOCK_SIZE.normal) onCommit(BLOCK_SIZE.normal);
      }}
      onKeyDown={onKeyDown}
      style={spot ? { left: spot.left, top: spot.top } : { display: 'none' }}
      className={cn(
        'absolute z-10 grid size-8 -translate-x-3/4 -translate-y-3/4 cursor-nwse-resize touch-none place-items-center rounded-full border border-line bg-surface text-muted shadow-sm transition-opacity select-none hover:text-fg focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none pointer-coarse:size-10',
        live !== null && 'border-accent text-accent',
        className,
      )}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-4">
        <path d="M8 8l8 8M8 8h5M8 8v5M16 16h-5M16 16v-5" />
      </svg>
      {live !== null ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-full left-1/2 mt-1.5 -translate-x-1/2 rounded-full bg-fg px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-bg tabular-nums"
        >
          {live === BLOCK_SIZE.normal ? '원래 크기' : `${live}%`}
        </span>
      ) : null}
    </div>
  );
}

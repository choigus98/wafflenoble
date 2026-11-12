'use client';

import { useEffect, useRef, useState } from 'react';
import { copyToClipboard } from '@/lib/clipboard';
import { quoteText } from '@/lib/share-text';

// 회차 화면 '출처와 함께 복사': 본문 글을 고르면(드래그·길게 눌러 고르기) 고른 곳 바로 아래에 단추가 뜨고,
// 누르면 고른 글 + 『작품』 N화 「제목」 + 링크를 복사한다 (단톡방에 인용해 붙이기 좋게).
// 휴대폰은 고른 글 위에 기본 메뉴(복사·공유)가 뜨므로 단추는 아래에, 화면 아래 끝이면 위에

const CONTENT_ID = 'chapter-content';
const BUTTON_HEIGHT = 40;
const BUTTON_WIDTH = 168;
const TOAST_MS = 2500;

type Spot = { top: number; left: number; text: string };

/** 지금 고른 글이 본문 안이면 단추 자리와 글 (아니면 null) */
function measure(): Spot | null {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  const content = document.getElementById(CONTENT_ID);
  if (!content || !content.contains(range.commonAncestorContainer)) return null;
  const text = selection.toString().trim();
  if (!text) return null;
  const rects = [...range.getClientRects()].filter((rect) => rect.width > 0 && rect.height > 0);
  const first = rects[0] ?? range.getBoundingClientRect();
  const last = rects.at(-1) ?? first;
  const below = last.bottom + 8;
  const top = below + BUTTON_HEIGHT <= window.innerHeight - 8 ? below : Math.max(8, first.top - 8 - BUTTON_HEIGHT);
  const center = last.left + last.width / 2;
  const left = Math.min(Math.max(8, center - BUTTON_WIDTH / 2), window.innerWidth - BUTTON_WIDTH - 8);
  return { top, left, text };
}

export function QuoteCopy({ title, chapterLabel, path }: { title: string; chapterLabel: string; path: string | null }) {
  const [spot, setSpot] = useState<Spot | null>(null);
  const [toast, setToast] = useState('');
  const toastTimerRef = useRef<number | null>(null);

  // 고른 글이 바뀌면 바로, 화면이 움직이면 한 프레임에 한 번 단추 자리를 다시 잰다
  // (고르기는 프레임을 기다리지 않는다 — 프레임이 멈춘 사이에 고르면 단추가 안 뜨는 일이 없게)
  useEffect(() => {
    let frame = 0;
    const measureNow = () => setSpot(measure());
    const onMove = () => {
      if (!frame)
        frame = window.requestAnimationFrame(() => {
          frame = 0;
          measureNow();
        });
    };
    document.addEventListener('selectionchange', measureNow);
    window.addEventListener('scroll', onMove, { passive: true });
    window.addEventListener('resize', onMove);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      document.removeEventListener('selectionchange', measureNow);
      window.removeEventListener('scroll', onMove);
      window.removeEventListener('resize', onMove);
      if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  async function copy() {
    if (!spot) return;
    const url = path ? new URL(path, window.location.origin).toString() : null;
    const text = quoteText(spot.text, title, chapterLabel, url);
    const ok = await copyToClipboard(text);
    if (!ok) window.prompt('아래 글을 길게 눌러 복사해 주세요', text);
    window.getSelection()?.removeAllRanges();
    setSpot(null);
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    setToast(ok ? '출처와 함께 복사했어요. 단톡방에 붙여 넣으면 돼요' : '자동으로 복사하지 못했어요');
    toastTimerRef.current = window.setTimeout(() => {
      toastTimerRef.current = null;
      setToast('');
    }, TOAST_MS);
  }

  return (
    <>
      {spot ? (
        <button
          type="button"
          // 누르는 순간 고른 글이 풀리지 않게 (마우스 누름의 기본 동작 막기)
          onPointerDown={(event) => event.preventDefault()}
          onMouseDown={(event) => event.preventDefault()}
          onClick={copy}
          data-print-hide=""
          style={{ top: spot.top, left: spot.left, width: BUTTON_WIDTH, height: BUTTON_HEIGHT }}
          className="fixed z-40 inline-flex items-center justify-center gap-1.5 rounded-full border border-line bg-surface text-[13px] font-semibold text-fg shadow-lg shadow-black/15 transition hover:bg-surface-2"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="size-4 text-accent">
            <path d="M9.5 6C6.5 7 4.5 9.6 4.5 13v5h6v-6h-3c0-2 1.2-3.5 3-4.2zM19.5 6c-3 1-5 3.6-5 7v5h6v-6h-3c0-2 1.2-3.5 3-4.2z" />
          </svg>
          출처와 함께 복사
        </button>
      ) : null}
      {/* 알림 칸은 늘 두고 글자만 바꿔야 화면 낭독기가 읽어 준다 */}
      <div role="status" data-print-hide="" className="pointer-events-none fixed inset-x-0 bottom-[calc(max(1rem,env(safe-area-inset-bottom))+6.75rem)] z-40 flex justify-center px-4 empty:hidden">
        {toast ? <p className="max-w-full rounded-full border border-line bg-surface px-4 py-2 text-sm break-keep shadow-lg shadow-black/10">{toast}</p> : null}
      </div>
    </>
  );
}

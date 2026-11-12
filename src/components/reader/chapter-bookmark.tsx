'use client';

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { readBookmarksRaw, saveBookmarks, subscribeBookmarks } from '@/components/reader/bookmarks-store';
import { bookmarkSnippet, findBookmarkTarget, parseBookmarks, toggleBookmark } from '@/lib/bookmarks';

// 회차 화면 '책갈피': 오른쪽 아래 단추(맨 위로 단추 위)로 지금 읽는 곳(위쪽 바 바로 아래 첫 문단)에 꽂고, 같은 곳에서 다시 누르면 뺀다.
// 꽂아 둔 문단은 왼쪽 여백에 강조색 줄. 작품 화면 책갈피 목록에서 오면(#bm-순번) 그 문단으로 옮기고 잠깐 칠한다

const CONTENT_ID = 'chapter-content';
const SHOW_AFTER_PX = 80;
const TOAST_MS = 3500;
const FLASH_MS = 2000;

/** 본문 덩어리들: 문단·인용·장면 전환(저장된 HTML 그대로)과 템플릿 카드, 화면 순서대로 */
function contentUnits(): HTMLElement[] {
  const content = document.getElementById(CONTENT_ID);
  if (!content) return [];
  return [...content.querySelectorAll<HTMLElement>(':scope > .contents > *, :scope > :not(.contents)')];
}

/** 덩어리 첫머리: 화면에 보이는 글 그대로(카드 안 줄바꿈은 띄어쓰기로), 템플릿은 이름을 앞에 ('라이브 방송창 · 하연화 LIVE …') */
const unitText = (unit: HTMLElement) => bookmarkSnippet(unit.dataset.template ? `${unit.dataset.template} · ${unit.innerText}` : unit.innerText);

/** 위쪽에 붙은 바의 아래 끝 (그 아래부터가 읽는 자리) */
function barBottom(): number {
  return document.querySelector('header')?.getBoundingClientRect().bottom ?? 0;
}

function flash(unit: HTMLElement) {
  unit.classList.remove('wn-bookmark-flash');
  // 다시 칠할 때 애니메이션이 처음부터 돌게 한 번 그린 뒤 붙인다
  requestAnimationFrame(() => {
    unit.classList.add('wn-bookmark-flash');
    window.setTimeout(() => unit.classList.remove('wn-bookmark-flash'), FLASH_MS);
  });
}

export function ChapterBookmark({ novelId, chapterId, position, title }: { novelId: number; chapterId: number; position: number; title: string }) {
  const raw = useSyncExternalStore(subscribeBookmarks, readBookmarksRaw, () => null);
  const mine = useMemo(() => (raw === null ? [] : parseBookmarks(raw).filter((item) => item.chapterId === chapterId)), [raw, chapterId]);
  const [visible, setVisible] = useState(false);
  const [toast, setToast] = useState('');
  const toastTimerRef = useRef<number | null>(null);

  // 본문을 읽기 시작하면(조금 내려가면) 단추가 나온다
  useEffect(() => {
    let frame = 0;
    const check = () => {
      frame = 0;
      setVisible(window.scrollY > SHOW_AFTER_PX);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(check);
    };
    check();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  // 꽂아 둔 문단 표시 (왼쪽 여백 줄)
  useEffect(() => {
    const units = contentUnits();
    const snippets = units.map(unitText);
    const marked = new Set(mine.map((item) => findBookmarkTarget(snippets, item.index, item.snippet)).filter((at) => at >= 0));
    units.forEach((unit, at) => unit.classList.toggle('wn-bookmarked', marked.has(at)));
  }, [mine]);

  // 책갈피 목록에서 왔으면(#bm-순번) 그 문단으로
  useEffect(() => {
    const match = window.location.hash.match(/^#bm-(\d+)$/);
    if (!match) return;
    const index = Number(match[1]);
    const units = contentUnits();
    const saved = parseBookmarks(readBookmarksRaw()).find((item) => item.chapterId === chapterId && item.index === index);
    const target = units[findBookmarkTarget(units.map(unitText), index, saved?.snippet ?? '')];
    if (!target) return;
    window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - barBottom() - 16 });
    target.tabIndex = -1;
    target.focus({ preventScroll: true });
    flash(target);
  }, [chapterId]);

  function say(text: string) {
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    setToast(text);
    toastTimerRef.current = window.setTimeout(() => {
      toastTimerRef.current = null;
      setToast('');
    }, TOAST_MS);
  }

  function toggle() {
    const units = contentUnits();
    const top = barBottom() + 8;
    const index = units.findIndex((unit) => unit.getBoundingClientRect().bottom > top && unitText(unit) !== '');
    if (index === -1) return;
    const snippet = unitText(units[index]);
    const { list, added } = toggleBookmark(parseBookmarks(readBookmarksRaw()), { novelId, chapterId, position, title, index, snippet, at: Date.now() });
    saveBookmarks(list);
    flash(units[index]);
    const short = [...snippet].length > 16 ? `${[...snippet].slice(0, 16).join('')}…` : snippet;
    say(added ? `‘${short}’에 책갈피를 꽂았어요. 작품 화면에서 볼 수 있어요` : `‘${short}’ 책갈피를 뺐어요`);
  }

  return (
    <>
      {visible ? (
        <button
          type="button"
          onClick={toggle}
          aria-label="지금 읽는 곳에 책갈피 (꽂혀 있으면 빼기)"
          title="지금 읽는 곳에 책갈피"
          data-print-hide=""
          className="fixed right-4 bottom-[calc(max(1rem,env(safe-area-inset-bottom))+3.25rem)] z-30 grid size-11 place-items-center rounded-full border border-line bg-surface/95 text-fg shadow-lg shadow-black/10 backdrop-blur transition hover:bg-surface-2 sm:right-6 sm:bottom-[4.75rem]"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-5">
            <path d="M6 3h12v18l-6-4-6 4z" />
          </svg>
        </button>
      ) : null}
      {/* 알림 칸은 늘 두고 글자만 바꿔야 화면 낭독기가 읽어 준다 */}
      <div
        role="status"
        data-print-hide=""
        className="pointer-events-none fixed inset-x-0 bottom-[calc(max(1rem,env(safe-area-inset-bottom))+6.75rem)] z-40 flex justify-center px-4 empty:hidden"
      >
        {toast ? <p className="max-w-full rounded-full border border-line bg-surface px-4 py-2 text-sm break-keep shadow-lg shadow-black/10">{toast}</p> : null}
      </div>
    </>
  );
}

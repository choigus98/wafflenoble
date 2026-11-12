'use client';

import { NodeSelection, Selection, type Transaction } from '@tiptap/pm/state';
import type { Editor } from '@tiptap/react';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { clearFlash, FLASH_MS, withFlash } from '@/components/admin/paragraph-flash';
import { EDIT_SPOT_KEY, editSpotAt, editSpotPosition, noteEditSpot, parseEditSpots, type EditSpot } from '@/lib/edit-spot';
import { afterScroll, scrollBehavior } from '@/lib/motion';

// 회차 에디터 '쓰던 곳으로': 본문에 글을 쓸 때마다 그 자리를 이 기기에 기억해 두고(lib/edit-spot.ts),
// 회차를 다시 열었을 때 그 자리가 첫 화면에 안 보이면 화면 아래에 단추를 띄운다.
// 누르면 그 자리에 커서를 두고(바로 이어 쓰게) 도구 막대 아래로 보이게 옮긴 뒤, 스크롤이 멈추면 그 문단을 잠깐 칠한다

const SAVE_DELAY_MS = 600;
// 열고 나서 템플릿·글꼴이 자리를 잡은 뒤에 잰다
const MEASURE_DELAY_MS = 200;
// 간 자리(커서 줄)는 도구 막대 아래 남은 칸의 위에서 1/3쯤 (휴대폰 자판이 올라와도 가리지 않게)
const LANDING = 0.33;

function readSpots() {
  try {
    return parseEditSpots(localStorage.getItem(EDIT_SPOT_KEY));
  } catch {
    return {};
  }
}

function writeSpot(chapterId: number, spot: EditSpot) {
  // 다른 탭에서 다른 회차 자리를 바꿨을 수 있어서 매번 새로 읽고 이 회차만 바꾼다
  try {
    localStorage.setItem(EDIT_SPOT_KEY, JSON.stringify(noteEditSpot(readSpots(), chapterId, spot)));
  } catch {
    // 저장이 막힌 브라우저(비공개 모드 등)에서는 기억하지 않음
  }
}

/** 기억한 자리에 둘 선택 (글자 자리가 없으면 가까운 템플릿 고르기) */
function selectionFor(editor: Editor, spot: EditSpot): Selection {
  const { doc } = editor.state;
  return Selection.near(doc.resolve(editSpotPosition(doc, spot)));
}

export function EditSpotOffer({ editor, chapterId, barRef }: { editor: Editor; chapterId: number; barRef: RefObject<HTMLDivElement | null> }) {
  const [offer, setOffer] = useState<EditSpot | null>(null);
  // 이번에 연 뒤로 본문에 글을 썼는지 (썼으면 권하지 않는다)
  const wroteRef = useRef(false);
  const flashTimerRef = useRef<number | null>(null);
  const cancelScrollWaitRef = useRef<(() => void) | null>(null);

  // 본문에 글을 쓸 때마다 그 자리를 기억 (본문에 포커스가 있을 때만 — 불러오기·복구·찾아 바꾸기·문장부호 다듬기처럼
  // 단추로 한꺼번에 바꾼 것과 템플릿 칸 고치기는 빼고). 입력이 잠깐 멈추면 저장, 화면을 떠날 때도 저장
  useEffect(() => {
    let timer: number | null = null;
    let pending: EditSpot | null = null;
    const flush = () => {
      if (timer !== null) {
        window.clearTimeout(timer);
        timer = null;
      }
      if (pending) {
        writeSpot(chapterId, pending);
        pending = null;
      }
    };
    const onUpdate = ({ transaction }: { transaction: Transaction }) => {
      if (!transaction.docChanged || !editor.view.hasFocus()) return;
      const { selection, doc } = editor.state;
      pending = editSpotAt(doc, selection instanceof NodeSelection ? selection.from : selection.head, Date.now());
      wroteRef.current = true;
      setOffer(null);
      if (timer !== null) window.clearTimeout(timer);
      timer = window.setTimeout(flush, SAVE_DELAY_MS);
    };
    editor.on('update', onUpdate);
    window.addEventListener('pagehide', flush);
    return () => {
      editor.off('update', onUpdate);
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [editor, chapterId]);

  // 열 때: 기억한 자리가 첫 화면(도구 막대 아래)에 안 보이면 권한다
  useEffect(() => {
    const spot = readSpots()[String(chapterId)];
    if (!spot) return;
    let frame = 0;
    const timer = window.setTimeout(() => {
      frame = requestAnimationFrame(() => {
        if (editor.isDestroyed || wroteRef.current) return;
        const selection = selectionFor(editor, spot);
        if (selection.from <= 1) return; // 맨 앞이면 권할 필요 없음
        try {
          const coords = editor.view.coordsAtPos(selection.from);
          const barBottom = barRef.current?.getBoundingClientRect().bottom ?? 0;
          if (coords.top >= barBottom && coords.bottom <= window.innerHeight) return;
        } catch {
          return;
        }
        setOffer(spot);
      });
    }, MEASURE_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
  }, [editor, chapterId, barRef]);

  // 칠하려고 기다리거나 칠하던 중에 화면을 떠나면 그만두고 칠한 것도 지움
  useEffect(() => {
    return () => {
      cancelScrollWaitRef.current?.();
      if (flashTimerRef.current === null) return;
      window.clearTimeout(flashTimerRef.current);
      clearFlash(editor);
    };
  }, [editor]);

  function go() {
    if (!offer || editor.isDestroyed) return;
    setOffer(null);
    const { view, state } = editor;
    const selection = selectionFor(editor, offer);
    const { $from } = selection;
    // 칠할 덩어리: 커서가 든 문단(인용 안 문단도), 템플릿을 골랐으면 그 템플릿
    const flashPos = selection instanceof NodeSelection ? selection.from : $from.depth > 0 ? $from.before($from.depth) : null;
    view.dispatch(state.tr.setSelection(selection));
    view.focus();
    // 커서 줄이 도구 막대 아래 남은 칸의 위쪽 1/3쯤 오게
    const coords = view.coordsAtPos(selection.from);
    const barHeight = barRef.current?.offsetHeight ?? 0;
    const room = window.innerHeight - barHeight;
    const top = Math.max(0, window.scrollY + coords.top - barHeight - room * LANDING);
    window.scrollTo({ top, behavior: scrollBehavior() });
    if (flashPos === null) return;
    // 멀리 갈 때는 부드러운 스크롤이 1초 넘게 걸려서, 멈춘 뒤에 칠한다
    cancelScrollWaitRef.current?.();
    cancelScrollWaitRef.current = afterScroll(top, () => {
      cancelScrollWaitRef.current = null;
      if (editor.isDestroyed) return;
      editor.view.dispatch(withFlash(editor.state.tr, flashPos));
      if (flashTimerRef.current !== null) window.clearTimeout(flashTimerRef.current);
      flashTimerRef.current = window.setTimeout(() => {
        flashTimerRef.current = null;
        clearFlash(editor);
      }, FLASH_MS);
    });
  }

  if (!offer) return null;
  return (
    <div
      role="status"
      data-print-hide=""
      className="fixed inset-x-0 bottom-5 z-40 mx-auto flex w-fit max-w-[calc(100%-2rem)] items-center gap-1 rounded-2xl border border-line bg-surface p-1.5 shadow-lg shadow-black/10"
    >
      <button type="button" onClick={go} className="flex min-w-0 items-center gap-2.5 rounded-xl py-1 pr-3 pl-1.5 text-left transition hover:bg-surface-2">
        <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-accent-fg">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="size-4">
            <path d="M15.5 5.5l3 3M4 20l1-4L16 5a2.1 2.1 0 0 1 3 3L8 19l-4 1z" />
          </svg>
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold">쓰던 곳으로</span>
          <span className="block truncate text-xs text-muted">
            <span className="sr-only">, 마지막으로 쓴 글: </span>
            {offer.before || '지난번에 쓰던 자리'}
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={(event) => {
          setOffer(null);
          // 키보드로 닫았으면 다음 자리인 본문으로 (누르거나 탭해서 닫았으면 휴대폰 자판이 뜨지 않게 그대로)
          if (event.detail === 0 && !editor.isDestroyed) editor.view.focus();
        }}
        aria-label="쓰던 곳 안내 닫기"
        className="grid size-9 shrink-0 place-items-center rounded-xl text-muted transition hover:bg-surface-2 hover:text-fg"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" className="size-4">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  );
}

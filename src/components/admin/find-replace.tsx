'use client';

import { TextSelection, Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Node as PMNode } from '@tiptap/pm/model';
import { Extension, useEditorState, type Editor } from '@tiptap/react';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { findMatches, type FindMatch } from '@/lib/find';
import { scrollBelowBar } from '@/lib/motion';

// ─── 찾은 곳 칠하기 (ProseMirror 플러그인) ─────────────────────
// 검색어·현재 위치는 트랜잭션 메타로 받고, 문서가 바뀔 때마다 다시 찾는다.
// 메타만 있는 트랜잭션은 문서를 바꾸지 않아서 자동저장·되돌리기 기록에 남지 않는다.

type FindState = { query: string; current: number; matches: FindMatch[]; decorations: DecorationSet };
type FindMeta = { query?: string; current?: number };

export const findKey = new PluginKey<FindState>('wn-find');

function buildState(doc: PMNode, query: string, current: number): FindState {
  const matches = findMatches(doc, query);
  const index = matches.length === 0 ? 0 : Math.min(Math.max(current, 0), matches.length - 1);
  const decorations = DecorationSet.create(
    doc,
    matches.map((match, i) =>
      Decoration.inline(match.from, match.to, { class: i === index ? 'wn-find-match wn-find-current' : 'wn-find-match' }),
    ),
  );
  return { query, current: index, matches, decorations };
}

export const FindReplace = Extension.create<{ onOpen: () => void }>({
  name: 'findReplace',

  addOptions() {
    return { onOpen: () => {} };
  },

  // 본문에 커서가 있을 때 Cmd/Ctrl+F → 찾기 창 (브라우저 찾기 대신)
  addKeyboardShortcuts() {
    return {
      'Mod-f': () => {
        this.options.onOpen();
        return true;
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin<FindState>({
        key: findKey,
        state: {
          init: (_config, state) => buildState(state.doc, '', 0),
          apply(tr, previous, _oldState, newState) {
            const meta = tr.getMeta(findKey) as FindMeta | undefined;
            if (!meta && !tr.docChanged) return previous;
            const query = meta?.query ?? previous.query;
            if (!query && !previous.query) return previous;
            return buildState(newState.doc, query, meta?.current ?? previous.current);
          },
        },
        props: {
          decorations: (state) => findKey.getState(state)?.decorations,
        },
      }),
    ];
  },
});

// ─── 찾기·바꾸기 창 ──────────────────────────────────────────

export function FindBar({ editor, initialQuery, onClose }: { editor: Editor; initialQuery?: string; onClose: () => void }) {
  // 처음 찾을 말: '반복되는 말'에서 고른 낱말, 아니면 본문에서 고른 글자
  const [query, setQuery] = useState(() => {
    if (initialQuery) return initialQuery.slice(0, 100);
    const { from, to, empty } = editor.state.selection;
    return empty ? '' : editor.state.doc.textBetween(from, to, ' ').slice(0, 100);
  });
  const [replacement, setReplacement] = useState('');
  const [notice, setNotice] = useState('');
  const noticeTimerRef = useRef<number | null>(null);
  const findInputRef = useRef<HTMLInputElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  // 검색어를 바꾼 뒤 첫 Enter는 첫 번째 찾은 곳으로, 그다음부터 다음 곳으로
  const revealedRef = useRef(false);
  const { count, current } = useEditorState({
    editor,
    selector: ({ editor: current }) => {
      const state = findKey.getState(current.state);
      return { count: state?.matches.length ?? 0, current: state?.current ?? 0 };
    },
  });

  useEffect(() => {
    findInputRef.current?.focus();
    findInputRef.current?.select();
  }, []);

  // 검색어가 바뀌면 처음 찾은 곳부터. 창이 닫히면 칠한 것 지우기
  useEffect(() => {
    if (editor.isDestroyed) return;
    revealedRef.current = false;
    editor.view.dispatch(editor.state.tr.setMeta(findKey, { query, current: 0 } satisfies FindMeta));
  }, [editor, query]);
  useEffect(() => {
    return () => {
      if (noticeTimerRef.current !== null) window.clearTimeout(noticeTimerRef.current);
      if (!editor.isDestroyed) editor.view.dispatch(editor.state.tr.setMeta(findKey, { query: '' } satisfies FindMeta));
    };
  }, [editor]);

  /** '3곳을 바꿨어요' 같은 알림은 잠깐 보여 주고 지운다 (되돌리기 뒤에 남아 있으면 헷갈려서) */
  function announce(text: string) {
    if (noticeTimerRef.current !== null) window.clearTimeout(noticeTimerRef.current);
    setNotice(text);
    noticeTimerRef.current = window.setTimeout(() => {
      noticeTimerRef.current = null;
      setNotice('');
    }, 4000);
  }

  // dispatch 직후 ProseMirror가 화면을 바로 고쳐 두므로 기다리지 않고 스크롤한다
  // (requestAnimationFrame은 뒤에 숨은 탭에서는 돌지 않는다)
  function reveal() {
    const current = editor.view.dom.querySelector('.wn-find-current');
    if (current) scrollBelowBar(current, barRef.current?.closest<HTMLElement>('[data-editor-bar]') ?? null, 'center');
  }

  function goTo(index: number) {
    const state = findKey.getState(editor.state);
    if (!state || state.matches.length === 0) return;
    const next = (index + state.matches.length) % state.matches.length;
    const match = state.matches[next];
    editor.view.dispatch(
      editor.state.tr
        .setMeta(findKey, { current: next } satisfies FindMeta)
        .setSelection(TextSelection.create(editor.state.doc, match.from, match.to)),
    );
    revealedRef.current = true;
    reveal();
  }

  const goNext = () => goTo(revealedRef.current ? current + 1 : current);
  const goPrevious = () => goTo(current - 1);

  /** 지금 칠해진 곳 하나를 바꾸고, 바꾼 글자 다음의 찾은 곳으로 넘어간다 */
  function replaceCurrent() {
    const state = findKey.getState(editor.state);
    if (!state || state.matches.length === 0) return;
    const match = state.matches[state.current];
    const tr = editor.state.tr;
    if (replacement) tr.insertText(replacement, match.from, match.to);
    else tr.delete(match.from, match.to);
    editor.view.dispatch(tr);
    announce('1곳을 바꿨어요');
    // 바꾼 말에 찾는 말이 들어 있어도(예: 지은 → 지은이) 같은 곳을 다시 고르지 않게, 바꾼 글자 뒤부터
    const after = match.from + replacement.length;
    const nextState = findKey.getState(editor.state);
    if (!nextState || nextState.matches.length === 0) return;
    const nextIndex = nextState.matches.findIndex((candidate) => candidate.from >= after);
    goTo(nextIndex === -1 ? 0 : nextIndex);
  }

  /** 모두 바꾸기: 한 번에 바꿔서 되돌리기(Cmd+Z) 한 번이면 전부 돌아온다 */
  function replaceAll() {
    const state = findKey.getState(editor.state);
    if (!state || state.matches.length === 0) return;
    const tr = editor.state.tr;
    for (const match of [...state.matches].reverse()) {
      if (replacement) tr.insertText(replacement, match.from, match.to);
      else tr.delete(match.from, match.to);
    }
    editor.view.dispatch(tr);
    announce(`${state.matches.length}곳을 바꿨어요`);
  }

  function close() {
    onClose();
    // 고른 곳(찾은 글자)에 커서를 둔 채 본문으로 돌아간다. commands.focus()는 한 박자 늦게 잡아서 바로 view.focus()
    editor.view.focus();
  }

  function onFindKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing || event.keyCode === 229) return; // 한글 조합 중 Enter는 무시
    if (event.key === 'Enter') {
      event.preventDefault();
      if (event.shiftKey) goPrevious();
      else goNext();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  }

  function onReplaceKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      replaceCurrent();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  }

  const status = !query ? '' : count === 0 ? '없어요' : `${current + 1} / ${count}`;
  const input =
    'h-9 min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 text-base text-fg placeholder:text-muted/70 focus:border-accent focus:ring-3 focus:ring-accent/20 focus:outline-none sm:text-sm';
  const iconButton =
    'grid size-9 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-fg disabled:pointer-events-none disabled:opacity-40';
  const textButton =
    'h-9 shrink-0 rounded-lg px-3 text-sm font-semibold transition disabled:pointer-events-none disabled:opacity-40';

  return (
    <div ref={barRef} role="search" aria-label="본문에서 찾기" className="mt-2 flex flex-col gap-2 rounded-xl border border-line bg-surface p-2 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-1">
        <input
          ref={findInputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onFindKeyDown}
          aria-label="찾을 말"
          placeholder="찾을 말"
          maxLength={100}
          className={input}
        />
        <span aria-live="polite" className="w-14 shrink-0 text-center text-xs text-muted tabular-nums">
          {status}
        </span>
        <button type="button" onClick={goPrevious} disabled={count === 0} aria-label="이전 찾기" title="이전 (Shift+Enter)" className={iconButton}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-4">
            <path d="M6 15l6-6 6 6" />
          </svg>
        </button>
        <button type="button" onClick={goNext} disabled={count === 0} aria-label="다음 찾기" title="다음 (Enter)" className={iconButton}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-4">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-1">
        <input
          value={replacement}
          onChange={(event) => setReplacement(event.target.value)}
          onKeyDown={onReplaceKeyDown}
          aria-label="바꿀 말"
          placeholder="바꿀 말"
          maxLength={100}
          className={input}
        />
        <button type="button" onClick={replaceCurrent} disabled={count === 0} className={`${textButton} text-fg hover:bg-surface-2`}>
          바꾸기
        </button>
        <button type="button" onClick={replaceAll} disabled={count === 0} className={`${textButton} bg-accent-soft text-accent hover:brightness-95`}>
          모두 바꾸기
        </button>
        <button type="button" onClick={close} aria-label="찾기 닫기" title="닫기 (Esc)" className={iconButton}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" className="size-4">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
      {/* 알림 칸은 늘 두고 글자만 바꿔야 화면 낭독기가 읽어 준다 */}
      <span role="status" className="shrink-0 text-xs font-semibold text-accent empty:hidden">
        {notice}
      </span>
    </div>
  );
}

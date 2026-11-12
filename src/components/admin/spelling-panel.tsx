'use client';

import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Node as PMNode } from '@tiptap/pm/model';
import { Extension, useEditorState, type Editor } from '@tiptap/react';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { scrollBelowBar } from '@/lib/motion';
import { objectParticle, spellingMatches, toParticle, type SpellingMatch } from '@/lib/spelling';
import { SPELLING_KEEP_KEY, addSpellingKeep, parseSpellingKeep, removeSpellingKeep } from '@/lib/spelling-keep';

// ─── 틀린 곳 칠하기 (ProseMirror 플러그인) ─────────────────────
// 창이 열려 있을 때만 찾고(물결 밑줄), 문서가 바뀔 때마다 다시 찾는다.
// 켜고 끄기·지금 고른 곳·'그대로 두기'한 낱말은 트랜잭션 메타로 받아서 자동저장·되돌리기 기록에 남지 않는다.

type SpellState = { active: boolean; current: number; keep: string[]; matches: SpellingMatch[]; decorations: DecorationSet };
type SpellMeta = { active?: boolean; current?: number; keep?: string[] };

export const spellingKey = new PluginKey<SpellState>('wn-spelling');

const OFF: SpellState = { active: false, current: -1, keep: [], matches: [], decorations: DecorationSet.empty };

function buildState(doc: PMNode, current: number, keep: string[]): SpellState {
  const matches = spellingMatches(doc, new Set(keep));
  const decorations = DecorationSet.create(
    doc,
    matches.map((match, index) =>
      Decoration.inline(match.from, match.to, { class: index === current ? 'wn-spell-issue wn-spell-current' : 'wn-spell-issue' }),
    ),
  );
  return { active: true, current, keep, matches, decorations };
}

export const SpellingCheck = Extension.create({
  name: 'spellingCheck',

  addProseMirrorPlugins() {
    return [
      new Plugin<SpellState>({
        key: spellingKey,
        state: {
          init: () => OFF,
          apply(tr, previous, _oldState, newState) {
            const meta = tr.getMeta(spellingKey) as SpellMeta | undefined;
            const active = meta?.active ?? previous.active;
            if (!active) return previous.active ? OFF : previous;
            if (!meta && !tr.docChanged) return previous;
            // 글을 고치거나 그대로 둘 말이 바뀌면 고른 곳이 어긋나므로 고른 표시는 지운다
            const keep = meta?.keep ?? previous.keep;
            return buildState(newState.doc, meta?.current ?? (tr.docChanged || meta?.keep ? -1 : previous.current), keep);
          },
        },
        props: {
          decorations: (state) => spellingKey.getState(state)?.decorations,
        },
      }),
    ];
  },
});

// ─── 자주 틀리는 말 창 ─────────────────────────────────────────

function readKeep(): string[] {
  try {
    return parseSpellingKeep(localStorage.getItem(SPELLING_KEEP_KEY));
  } catch {
    return [];
  }
}

function writeKeep(list: string[]) {
  try {
    if (list.length === 0) localStorage.removeItem(SPELLING_KEEP_KEY);
    else localStorage.setItem(SPELLING_KEEP_KEY, JSON.stringify(list));
  } catch {}
}

export function SpellingPanel({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const { active, matches } = useEditorState({
    editor,
    selector: ({ editor: current }) => {
      const state = spellingKey.getState(current.state);
      return { active: state?.active ?? false, matches: state?.matches ?? [] };
    },
  }) ?? { active: false, matches: [] };
  // '그대로 두기'한 낱말 (이 기기에 하나, 회차가 바뀌어도 그대로)
  const [keep, setKeep] = useState<string[]>(readKeep);
  const [notice, setNotice] = useState('');
  const noticeTimerRef = useRef<number | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const emptyRef = useRef<HTMLParagraphElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const keepSummaryRef = useRef<HTMLElement>(null);
  // 처음 찾은 뒤 한 번: 첫 항목으로(없으면 '찾은 곳이 없어요'로) 포커스
  const initialFocusRef = useRef(true);
  // 하나를 고친 뒤 포커스를 둘 자리 (같은 순번의 다음 항목, 없으면 닫기 단추)
  const focusAfterFixRef = useRef<number | null>(null);
  // 그대로 두던 마지막 낱말을 다시 점검하면 '그대로 두는 말' 칸이 사라지므로, 되살아난 첫 항목으로
  const focusFirstRef = useRef(false);

  // 열면 칠하기 시작(그대로 둘 말은 빼고), 닫으면 칠한 것 지우기
  useEffect(() => {
    if (editor.isDestroyed) return;
    editor.view.dispatch(editor.state.tr.setMeta(spellingKey, { active: true, current: -1, keep: readKeep() } satisfies SpellMeta));
    return () => {
      if (noticeTimerRef.current !== null) window.clearTimeout(noticeTimerRef.current);
      if (!editor.isDestroyed) editor.view.dispatch(editor.state.tr.setMeta(spellingKey, { active: false } satisfies SpellMeta));
    };
  }, [editor]);

  // 그대로 둘 말이 바뀌면 이 기기에 기억하고 다시 찾는다 (처음 열 때는 위에서 같은 값으로 이미 찾음)
  useEffect(() => {
    writeKeep(keep);
    if (editor.isDestroyed) return;
    const state = spellingKey.getState(editor.state);
    if (!state?.active || state.keep.join('\n') === keep.join('\n')) return;
    editor.view.dispatch(editor.state.tr.setMeta(spellingKey, { keep } satisfies SpellMeta));
  }, [editor, keep]);

  useEffect(() => {
    if (!active) return;
    if (initialFocusRef.current) {
      initialFocusRef.current = false;
      (listRef.current?.querySelector<HTMLButtonElement>('button[data-reveal]') ?? emptyRef.current)?.focus();
      return;
    }
    if (focusFirstRef.current) {
      focusFirstRef.current = false;
      (listRef.current?.querySelector<HTMLButtonElement>('button[data-reveal]') ?? closeRef.current)?.focus();
      return;
    }
    const index = focusAfterFixRef.current;
    if (index === null) return;
    focusAfterFixRef.current = null;
    const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>('button[data-fix]') ?? [];
    (buttons[Math.min(index, buttons.length - 1)] ?? closeRef.current)?.focus();
  }, [active, matches]);

  /** '2곳을 고쳤어요' 같은 알림은 잠깐 보여 주고 지운다 */
  function announce(text: string) {
    if (noticeTimerRef.current !== null) window.clearTimeout(noticeTimerRef.current);
    setNotice(text);
    noticeTimerRef.current = window.setTimeout(() => {
      noticeTimerRef.current = null;
      setNotice('');
    }, 4000);
  }

  /** 본문에서 그 자리를 칠하고 보이게 (포커스는 목록에 둔 채) */
  function reveal(index: number) {
    const match = matches[index];
    if (!match) return;
    editor.view.dispatch(
      editor.state.tr
        .setMeta(spellingKey, { current: index } satisfies SpellMeta)
        .setSelection(TextSelection.create(editor.state.doc, match.from, match.to)),
    );
    // 이 창은 도구 막대와 함께 화면 위에 붙어 있어서, 가운데로만 옮기면 휴대폰에서는 창 밑에 가린다 → 막대 아래 남은 칸의 가운데로
    const current = editor.view.dom.querySelector('.wn-spell-current');
    if (current) scrollBelowBar(current, sectionRef.current?.closest<HTMLElement>('[data-editor-bar]') ?? null, 'center');
  }

  function fix(index: number) {
    const match = matches[index];
    if (!match) return;
    focusAfterFixRef.current = index;
    editor.view.dispatch(editor.state.tr.insertText(match.right, match.from, match.to));
    announce(`'${match.word}'${objectParticle(match.word)} '${match.fixedWord}'${toParticle(match.fixedWord)} 고쳤어요`);
  }

  /** 그대로 두기: 일부러 쓴 말(사투리·말투)은 이 기기에서 점검에서 뺀다. 같은 모양의 낱말은 모두 빠진다 */
  function keepWord(index: number) {
    const match = matches[index];
    if (!match) return;
    focusAfterFixRef.current = index;
    setKeep((list) => addSpellingKeep(list, match.word));
    announce(`'${match.word}'${objectParticle(match.word)} 그대로 둘게요. 아래 '그대로 두는 말'에서 다시 점검할 수 있어요`);
  }

  function unkeepWord(word: string) {
    const last = keep.length === 1;
    setKeep((list) => removeSpellingKeep(list, word));
    announce(`'${word}'${objectParticle(word)} 다시 점검해요`);
    // 지운 칩 자리 대신 '그대로 두는 말' 제목으로 (마지막 하나였으면 그 칸이 사라지니 되살아난 첫 항목으로)
    if (last) focusFirstRef.current = true;
    else keepSummaryRef.current?.focus();
  }

  /** 모두 고치기: 한 번에 바꿔서 되돌리기 한 번이면 전부 돌아온다 */
  function fixAll() {
    if (matches.length === 0) return;
    const tr = editor.state.tr;
    for (const match of [...matches].reverse()) tr.insertText(match.right, match.from, match.to);
    editor.view.dispatch(tr);
    announce(`${matches.length}곳을 고쳤어요. 되돌리려면 되돌리기(⌘Z / Ctrl+Z)`);
    closeRef.current?.focus();
  }

  function close() {
    onClose();
    editor.view.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  }

  const textButton = 'h-9 shrink-0 rounded-lg px-3 text-sm font-semibold transition disabled:pointer-events-none disabled:opacity-40';

  return (
    <section ref={sectionRef} aria-label="자주 틀리는 말" onKeyDown={onKeyDown} className="mt-2 rounded-xl border border-line bg-surface p-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="pl-1.5 text-sm font-semibold">
          자주 틀리는 말 <span className="font-normal text-muted tabular-nums">{matches.length > 0 ? `${matches.length}곳` : ''}</span>
        </h2>
        <div className="flex items-center gap-1">
          <button type="button" onClick={fixAll} disabled={matches.length === 0} className={`${textButton} bg-accent-soft text-accent hover:brightness-95`}>
            모두 고치기
          </button>
          <button
            ref={closeRef}
            type="button"
            onClick={close}
            aria-label="자주 틀리는 말 닫기"
            title="닫기 (Esc)"
            className="grid size-9 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-fg"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" className="size-4">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      </div>
      {matches.length > 0 ? (
        // 화면이 낮으면 목록도 낮게 (위에 붙은 막대가 본문을 너무 많이 가리지 않게)
        <ul ref={listRef} className="mt-1 max-h-[min(15rem,26vh)] space-y-0.5 overflow-y-auto overscroll-contain">
          {matches.map((match, index) => (
            <li key={`${match.from}:${match.wrong}`} className="flex items-center gap-1 rounded-lg hover:bg-surface-2">
              {/* 누르면 본문의 그 자리를 칠하고 보여 준다 */}
              <button type="button" data-reveal onClick={() => reveal(index)} className="min-w-0 flex-1 rounded-lg px-2 py-1.5 text-left">
                <span className="flex flex-wrap items-baseline gap-x-1.5 text-sm">
                  <span className="break-all line-through decoration-danger/70">{match.word}</span>
                  <span aria-hidden="true" className="text-muted">
                    →
                  </span>
                  <span className="sr-only">바르게는</span>
                  <span className="font-semibold break-all text-accent">{match.fixedWord}</span>
                </span>
                <span className="block text-xs text-muted">{match.why}</span>
              </button>
              <button
                type="button"
                data-fix
                onClick={() => fix(index)}
                aria-label={`${match.word} 고치기`}
                className={`${textButton} text-fg hover:bg-surface`}
              >
                고치기
              </button>
              {/* 일부러 쓴 말이면 그대로 두기 (같은 모양은 모두, 이 기기에서) */}
              <button
                type="button"
                onClick={() => keepWord(index)}
                aria-label={`${match.word} 그대로 두기`}
                title="일부러 쓴 말이면 그대로 두기 (이 기기에서 점검에서 빼요)"
                className={`${textButton} px-2 text-muted hover:bg-surface hover:text-fg`}
              >
                그대로
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p ref={emptyRef} tabIndex={-1} className="px-1.5 pt-1 pb-1.5 text-sm text-muted outline-none">
          {active ? '찾은 곳이 없어요. ' : ''}틀림이 확실한 말(됬 → 됐, 몇일 → 며칠, 할께 → 할게 …)만 찾아요.
        </p>
      )}
      {keep.length > 0 ? (
        <details className="group mt-1 px-1.5 text-xs">
          <summary
            ref={keepSummaryRef}
            className="flex min-h-8 cursor-pointer list-none items-center gap-1 rounded-md font-semibold text-muted hover:text-fg [&::-webkit-details-marker]:hidden"
          >
            그대로 두는 말 {keep.length}개 <span className="font-normal">(이 기기)</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-3.5 transition group-open:rotate-180">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </summary>
          {/* 많이 두면 목록 안에서 스크롤 (이 창은 도구 막대와 함께 화면 위에 붙어 있어서, 길어지면 아래가 화면 밖으로 나가 닿을 수 없음) */}
          <ul className="flex max-h-[min(8rem,18vh)] flex-wrap gap-1 overflow-y-auto overscroll-contain pt-1 pb-1.5">
            {keep.map((word) => (
              <li key={word}>
                <button
                  type="button"
                  onClick={() => unkeepWord(word)}
                  aria-label={`${word} 다시 점검하기`}
                  title="다시 점검하기"
                  className="inline-flex h-7 items-center gap-1 rounded-full border border-line bg-surface px-2.5 text-xs font-semibold break-all text-fg transition hover:bg-surface-2"
                >
                  {word}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true" className="size-3 text-muted">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      {/* 알림 칸은 늘 두고 글자만 바꿔야 화면 낭독기가 읽어 준다 */}
      <span role="status" className="block px-1.5 text-xs font-semibold text-accent empty:hidden">
        {notice}
      </span>
    </section>
  );
}

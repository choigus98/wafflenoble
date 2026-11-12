'use client';

import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Node as PMNode } from '@tiptap/pm/model';
import { Extension, useEditorState, type Editor } from '@tiptap/react';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { formatNumber } from '@/lib/format';
import { longSentences, SENTENCE_LIMITS, type LongSentence, type SentenceLimit } from '@/lib/long-sentences';
import { scrollBelowBar } from '@/lib/motion';
import { cn } from '@/lib/utils';

// ─── 긴 문장 칠하기 (ProseMirror 플러그인) ─────────────────────
// 창이 열려 있을 때만 찾아서 옅게 칠하고, 문서가 바뀔 때마다 다시 찾는다.
// 켜고 끄기·기준·지금 고른 곳은 트랜잭션 메타로 받아서 자동저장·되돌리기 기록에 남지 않는다.

type LongState = { active: boolean; limit: number; current: number; items: LongSentence[]; decorations: DecorationSet };
type LongMeta = { active?: boolean; limit?: number; current?: number };

export const longSentenceKey = new PluginKey<LongState>('wn-long-sentence');

const OFF: LongState = { active: false, limit: 100, current: -1, items: [], decorations: DecorationSet.empty };

function buildState(doc: PMNode, limit: number, current: number): LongState {
  const items = longSentences(doc, limit);
  const decorations = DecorationSet.create(
    doc,
    items.map((item, index) => Decoration.inline(item.from, item.to, { class: index === current ? 'wn-long-sentence wn-long-current' : 'wn-long-sentence' })),
  );
  return { active: true, limit, current, items, decorations };
}

export const LongSentenceMarks = Extension.create({
  name: 'longSentenceMarks',

  addProseMirrorPlugins() {
    return [
      new Plugin<LongState>({
        key: longSentenceKey,
        state: {
          init: () => OFF,
          apply(tr, previous, _oldState, newState) {
            const meta = tr.getMeta(longSentenceKey) as LongMeta | undefined;
            const active = meta?.active ?? previous.active;
            if (!active) return previous.active ? OFF : previous;
            if (!meta && !tr.docChanged) return previous;
            return buildState(newState.doc, meta?.limit ?? previous.limit, meta?.current ?? (tr.docChanged || meta?.limit ? -1 : previous.current));
          },
        },
        props: {
          decorations: (state) => longSentenceKey.getState(state)?.decorations,
        },
      }),
    ];
  },
});

// ─── 긴 문장 창 ─────────────────────────────────────────────

const LIMIT_KEY = 'wn:long-sentence';

/** 이 기기에 기억해 둔 기준 (없거나 이상하면 100자) */
function savedLimit(): SentenceLimit {
  try {
    const value = Number(localStorage.getItem(LIMIT_KEY));
    return (SENTENCE_LIMITS as readonly number[]).includes(value) ? (value as SentenceLimit) : 100;
  } catch {
    return 100;
  }
}

export function LongSentencePanel({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const [limit, setLimit] = useState<SentenceLimit>(savedLimit);
  const { active, items, current } = useEditorState({
    editor,
    selector: ({ editor: now }) => {
      const state = longSentenceKey.getState(now.state);
      return { active: state?.active ?? false, items: state?.items ?? [], current: state?.current ?? -1 };
    },
  }) ?? { active: false, items: [], current: -1 };
  const sectionRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const emptyRef = useRef<HTMLParagraphElement>(null);
  // 처음 찾은 뒤 한 번: 첫 문장으로(없으면 안내 글로) 포커스
  const initialFocusRef = useRef(true);

  // 열면 칠하기 시작, 닫으면 칠한 것 지우기
  useEffect(() => {
    if (editor.isDestroyed) return;
    editor.view.dispatch(editor.state.tr.setMeta(longSentenceKey, { active: true, limit: savedLimit(), current: -1 } satisfies LongMeta));
    return () => {
      if (!editor.isDestroyed) editor.view.dispatch(editor.state.tr.setMeta(longSentenceKey, { active: false } satisfies LongMeta));
    };
  }, [editor]);

  useEffect(() => {
    if (!active || !initialFocusRef.current) return;
    initialFocusRef.current = false;
    (listRef.current?.querySelector<HTMLButtonElement>('button') ?? emptyRef.current)?.focus();
  }, [active, items]);

  function changeLimit(next: SentenceLimit) {
    setLimit(next);
    try {
      localStorage.setItem(LIMIT_KEY, String(next));
    } catch {}
    editor.view.dispatch(editor.state.tr.setMeta(longSentenceKey, { limit: next, current: -1 } satisfies LongMeta));
  }

  /** 그 문장을 고르고 칠해서, 위에 붙은 막대 아래 남은 칸의 가운데로 (포커스는 목록에 둔 채) */
  function reveal(index: number) {
    const item = items[index];
    if (!item) return;
    editor.view.dispatch(
      editor.state.tr
        .setMeta(longSentenceKey, { current: index } satisfies LongMeta)
        .setSelection(TextSelection.create(editor.state.doc, item.from, item.to)),
    );
    const element = editor.view.dom.querySelector('.wn-long-current');
    if (element) scrollBelowBar(element, sectionRef.current?.closest<HTMLElement>('[data-editor-bar]') ?? null, 'center');
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

  return (
    <section ref={sectionRef} aria-label="긴 문장" onKeyDown={onKeyDown} className="mt-2 rounded-xl border border-line bg-surface p-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="pl-1.5 text-sm font-semibold">
          긴 문장 <span className="font-normal text-muted tabular-nums">{active && items.length > 0 ? `${items.length}곳` : ''}</span>
        </h2>
        <div className="flex items-center gap-1">
          {/* 기준 글자 수: 이 기기에 기억 */}
          <div role="group" aria-label="긴 문장 기준" className="flex rounded-lg bg-surface-2 p-0.5">
            {SENTENCE_LIMITS.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={limit === value}
                onClick={() => changeLimit(value)}
                className={cn('h-8 rounded-md px-2.5 text-xs font-semibold tabular-nums transition', limit === value ? 'bg-surface text-fg shadow-sm' : 'text-muted hover:text-fg')}
              >
                {value}자
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="긴 문장 닫기"
            title="닫기 (Esc)"
            className="grid size-9 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-fg"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" className="size-4">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      </div>
      {items.length > 0 ? (
        // 화면이 낮으면 목록도 낮게 (위에 붙은 막대가 본문을 너무 많이 가리지 않게)
        <ol ref={listRef} className="mt-1 max-h-[min(15rem,26vh)] space-y-0.5 overflow-y-auto overscroll-contain">
          {items.map((item, index) => (
            <li key={`${item.from}:${item.length}`}>
              <button
                type="button"
                aria-current={index === current ? 'true' : undefined}
                onClick={() => reveal(index)}
                className={cn('flex w-full items-start gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition', index === current ? 'bg-accent-soft' : 'hover:bg-surface-2')}
              >
                <span className="min-w-0 flex-1 break-all">{item.preview}</span>
                <span className="shrink-0 text-xs font-semibold text-accent tabular-nums">{formatNumber(item.length)}자</span>
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <p ref={emptyRef} tabIndex={-1} className="px-1.5 pt-1 pb-1.5 text-sm text-muted outline-none">
          {active ? `${limit}자 넘는 문장이 없어요.` : ''} 문장은 마침표·물음표·느낌표·말줄임표나 줄바꿈으로 나눠서 세요.
        </p>
      )}
    </section>
  );
}

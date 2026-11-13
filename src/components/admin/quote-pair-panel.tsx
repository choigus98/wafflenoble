'use client';

import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Node as PMNode } from '@tiptap/pm/model';
import { Extension, useEditorState, type Editor } from '@tiptap/react';
import { useEffect, useRef, type KeyboardEvent } from 'react';
import { scrollBelowBar } from '@/lib/motion';
import { quoteIssues, quoteProblemLabel, type QuoteIssue } from '@/lib/quote-pairs';
import { cn } from '@/lib/utils';

// ─── 짝이 안 맞는 따옴표 칠하기 (ProseMirror 플러그인) ─────────────────────
// 창이 열려 있을 때만 찾아서 칠하고, 문서가 바뀔 때마다 다시 찾는다 (고치면 목록에서 바로 빠짐).
// 켜고 끄기·지금 고른 문단은 트랜잭션 메타로 받아서 자동저장·되돌리기 기록에 남지 않는다.

type QuoteState = { active: boolean; current: number; issues: QuoteIssue[]; decorations: DecorationSet };
type QuoteMeta = { active?: boolean; current?: number };

export const quotePairKey = new PluginKey<QuoteState>('wn-quote-pairs');

const OFF: QuoteState = { active: false, current: -1, issues: [], decorations: DecorationSet.empty };

function buildState(doc: PMNode, current: number): QuoteState {
  const issues = quoteIssues(doc);
  const decorations = DecorationSet.create(
    doc,
    issues.flatMap((issue, index) => {
      // 한 따옴표에 문제가 둘이어도(방향도 반대고 닫지도 않음) 한 번만 칠한다
      const spots = [...new Map(issue.problems.map((problem) => [problem.from, problem])).values()];
      return spots.map((spot) => Decoration.inline(spot.from, spot.to, { class: index === current ? 'wn-quote-issue wn-quote-current' : 'wn-quote-issue' }));
    }),
  );
  return { active: true, current, issues, decorations };
}

export const QuotePairMarks = Extension.create({
  name: 'quotePairMarks',

  addProseMirrorPlugins() {
    return [
      new Plugin<QuoteState>({
        key: quotePairKey,
        state: {
          init: () => OFF,
          apply(tr, previous, _oldState, newState) {
            const meta = tr.getMeta(quotePairKey) as QuoteMeta | undefined;
            const active = meta?.active ?? previous.active;
            if (!active) return previous.active ? OFF : previous;
            if (!meta && !tr.docChanged) return previous;
            // 글을 고치면 문단 순서가 어긋날 수 있어서 고른 표시는 지운다
            return buildState(newState.doc, meta?.current ?? (tr.docChanged ? -1 : previous.current));
          },
        },
        props: {
          decorations: (state) => quotePairKey.getState(state)?.decorations,
        },
      }),
    ];
  },
});

// ─── 따옴표 짝 창 ─────────────────────────────────────────────

/**
 * '글 점검 → 따옴표 짝': 여는 따옴표와 닫는 따옴표의 짝이 안 맞는 문단 목록 (규칙은 lib/quote-pairs.ts).
 * 본문의 그 따옴표를 칠해 두고, 줄을 누르면 그 문단의 첫 문제 따옴표를 골라 도구 막대 아래로 보이게 (포커스는 목록에 둔 채, Esc면 본문의 그 자리로).
 * 고치면 목록에서 바로 빠진다
 */
export function QuotePairPanel({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const { active, issues, current } = useEditorState({
    editor,
    selector: ({ editor: now }) => {
      const state = quotePairKey.getState(now.state);
      return { active: state?.active ?? false, issues: state?.issues ?? [], current: state?.current ?? -1 };
    },
  }) ?? { active: false, issues: [], current: -1 };
  const sectionRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const emptyRef = useRef<HTMLParagraphElement>(null);
  // 처음 찾은 뒤 한 번: 첫 문단으로(없으면 안내 글로) 포커스
  const initialFocusRef = useRef(true);

  // 열면 칠하기 시작, 닫으면 칠한 것 지우기
  useEffect(() => {
    if (editor.isDestroyed) return;
    editor.view.dispatch(editor.state.tr.setMeta(quotePairKey, { active: true, current: -1 } satisfies QuoteMeta));
    return () => {
      if (!editor.isDestroyed) editor.view.dispatch(editor.state.tr.setMeta(quotePairKey, { active: false } satisfies QuoteMeta));
    };
  }, [editor]);

  useEffect(() => {
    if (!active || !initialFocusRef.current) return;
    initialFocusRef.current = false;
    (listRef.current?.querySelector<HTMLButtonElement>('button') ?? emptyRef.current)?.focus();
  }, [active, issues]);

  /** 그 문단의 첫 문제 따옴표를 고르고 칠해서, 위에 붙은 막대 아래 남은 칸의 가운데로 */
  function reveal(index: number) {
    const first = issues[index]?.problems[0];
    if (!first) return;
    editor.view.dispatch(
      editor.state.tr
        .setMeta(quotePairKey, { current: index } satisfies QuoteMeta)
        .setSelection(TextSelection.create(editor.state.doc, first.from, first.to)),
    );
    const element = editor.view.dom.querySelector('.wn-quote-current');
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
    <section ref={sectionRef} aria-label="따옴표 짝" onKeyDown={onKeyDown} className="mt-2 rounded-xl border border-line bg-surface p-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="pl-1.5 text-sm font-semibold">
          따옴표 짝 <span className="font-normal text-muted tabular-nums">{active && issues.length > 0 ? `${issues.length}문단` : ''}</span>
        </h2>
        <button
          type="button"
          onClick={close}
          aria-label="따옴표 짝 닫기"
          title="닫기 (Esc)"
          className="grid size-9 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-fg"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" className="size-4">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
      {issues.length > 0 ? (
        // 화면이 낮으면 목록도 낮게 (위에 붙은 막대가 본문을 너무 많이 가리지 않게)
        <ol ref={listRef} className="mt-1 max-h-[min(15rem,26vh)] space-y-0.5 overflow-y-auto overscroll-contain">
          {issues.map((issue, index) => (
            <li key={issue.pos}>
              <button
                type="button"
                aria-current={index === current ? 'true' : undefined}
                onClick={() => reveal(index)}
                className={cn('flex w-full flex-col gap-0.5 rounded-lg px-2 py-1.5 text-left text-sm transition', index === current ? 'bg-accent-soft' : 'hover:bg-surface-2')}
              >
                <span className="min-w-0 break-keep wrap-anywhere">{issue.preview}</span>
                {/* 고른 줄(옅은 바탕)에서는 빨강이 어둡게 보기에서 대비 4.5:1에 못 미쳐서 본문 글자색으로 */}
                <span className={cn('text-xs font-semibold', index === current ? 'text-fg' : 'text-danger')}>{issue.problems.map(quoteProblemLabel).join(' · ')}</span>
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <p ref={emptyRef} tabIndex={-1} className="px-1.5 pt-1 pb-1.5 text-sm text-muted outline-none">
          {active ? '짝이 안 맞는 따옴표가 없어요.' : ''} 문단마다 “ ” ‘ ’ 「 」 『 』와 곧은 따옴표(&quot; &apos;)의 짝을 맞춰 봐요.
        </p>
      )}
    </section>
  );
}

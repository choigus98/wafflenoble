'use client';

import type { Node as PMNode } from '@tiptap/pm/model';
import { TextSelection } from '@tiptap/pm/state';
import { useEditorState, type Editor } from '@tiptap/react';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { clearFlash, FLASH_MS, withFlash } from '@/components/admin/paragraph-flash';
import { dialogueLines, filterDialogue, type DialogueLine } from '@/lib/dialogue';
import { particle } from '@/lib/format';
import { afterScroll, scrollBelowBar } from '@/lib/motion';

// 회차 에디터 '대사 모아 보기' 창: 따옴표로 시작하는 문단만 차례로 모아 인물 말투를 이어 읽는다.
// 낱말·이름으로 거르고(초성도), 줄을 누르면 본문의 그 대사 첫머리로 커서를 옮겨 바로 고칠 수 있게 한다 (잠깐 칠해서 어디인지 보여 줌)

// 선택만 바뀐 트랜잭션에서도 다시 모으지 않게 문서마다 한 번만
const collected = new WeakMap<PMNode, DialogueLine[]>();
function linesOf(doc: PMNode): DialogueLine[] {
  let lines = collected.get(doc);
  if (!lines) {
    lines = dialogueLines(doc);
    collected.set(doc, lines);
  }
  return lines;
}

export function DialoguePanel({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const lines = useEditorState({ editor, selector: ({ editor: now }) => linesOf(now.state.doc) }) ?? [];
  const [query, setQuery] = useState('');
  const shown = filterDialogue(lines, query);
  const sectionRef = useRef<HTMLElement>(null);
  const firstRef = useRef<HTMLParagraphElement>(null);
  const flashTimerRef = useRef<number | null>(null);
  const cancelScrollWaitRef = useRef<(() => void) | null>(null);

  // 열면 첫 줄(없으면 안내 글)에 포커스
  useEffect(() => {
    (sectionRef.current?.querySelector<HTMLElement>('ol button') ?? firstRef.current)?.focus();
  }, []);

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

  // 창을 닫거나 다른 데로 가면 칠한 것 지우기
  useEffect(() => {
    return () => {
      cancelScrollWaitRef.current?.();
      if (flashTimerRef.current !== null) window.clearTimeout(flashTimerRef.current);
      clearFlash(editor);
    };
  }, [editor]);

  /** 그 대사로: 첫머리에 커서, 도구 막대 아래로 보이게, 잠깐 칠하기 (창은 열어 둠) */
  function go(line: DialogueLine) {
    const { state, view } = editor;
    if (line.pos + 1 > state.doc.content.size) return;
    view.dispatch(state.tr.setSelection(TextSelection.create(state.doc, line.pos + 1)));
    view.focus();
    const element = view.nodeDOM(line.pos) as HTMLElement | null;
    const top = element ? scrollBelowBar(element, sectionRef.current?.closest<HTMLElement>('[data-editor-bar]') ?? null, 'center') : window.scrollY;
    // 다른 줄을 고르면 앞에 칠한 것은 지우고, 스크롤이 멈춘 뒤에 칠한다 (멀리 가면 1초 넘게 걸려서)
    clearFlash(editor);
    cancelScrollWaitRef.current?.();
    cancelScrollWaitRef.current = afterScroll(top, () => {
      cancelScrollWaitRef.current = null;
      if (editor.isDestroyed) return;
      editor.view.dispatch(withFlash(editor.state.tr, line.pos));
      if (flashTimerRef.current !== null) window.clearTimeout(flashTimerRef.current);
      flashTimerRef.current = window.setTimeout(() => {
        flashTimerRef.current = null;
        clearFlash(editor);
      }, FLASH_MS);
    });
  }

  return (
    <section ref={sectionRef} aria-label="대사 모아 보기" onKeyDown={onKeyDown} className="mt-2 rounded-xl border border-line bg-surface p-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="pl-1.5 text-sm font-semibold">
          대사 모아 보기{' '}
          <span className="font-normal text-muted tabular-nums">{query.trim() ? `${shown.length} / ${lines.length}줄` : lines.length > 0 ? `${lines.length}줄` : ''}</span>
        </h2>
        <button
          type="button"
          onClick={close}
          aria-label="대사 모아 보기 닫기"
          title="닫기 (Esc)"
          className="grid size-9 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-fg"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" className="size-4">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
      {lines.length > 0 ? (
        <>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="대사 거르기 (낱말·이름, 초성도)"
            placeholder="낱말·이름으로 거르기"
            maxLength={40}
            autoComplete="off"
            spellCheck={false}
            className="mt-1 h-9 w-full rounded-lg border border-line bg-surface px-3 text-base text-fg placeholder:text-muted focus:border-accent focus:ring-3 focus:ring-accent/20 focus:outline-none sm:h-8 sm:text-sm"
          />
          {shown.length > 0 ? (
            // 화면이 낮으면 목록도 낮게 (위에 붙은 막대가 본문을 너무 많이 가리지 않게)
            <ol className="mt-1 max-h-[min(15rem,26vh)] space-y-0.5 overflow-y-auto overscroll-contain">
              {shown.map((line) => (
                <li key={line.pos}>
                  <button
                    type="button"
                    onClick={() => go(line)}
                    className="flex w-full gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition hover:bg-surface-2"
                  >
                    <span aria-hidden="true" className="w-6 shrink-0 pt-px text-right text-xs text-muted tabular-nums">
                      {lines.indexOf(line) + 1}
                    </span>
                    <span className="line-clamp-3 min-w-0 flex-1 break-keep">{line.text}</span>
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <p className="px-1.5 pt-1.5 pb-1 text-sm text-muted">
              ‘{query.trim()}’{particle(query.trim(), '이', '가')} 든 대사가 없어요.
            </p>
          )}
        </>
      ) : (
        <p ref={firstRef} tabIndex={-1} className="px-1.5 pt-1 pb-1.5 text-sm text-muted outline-none">
          {'따옴표(" “ \' 「 『)로 시작하는 대사가 아직 없어요.'}
        </p>
      )}
    </section>
  );
}

'use client';

import type { Node as PMNode } from '@tiptap/pm/model';
import { useEditorState, type Editor } from '@tiptap/react';
import { useEffect, useRef, type KeyboardEvent } from 'react';
import { repeatedWords, type RepeatedWord } from '@/lib/repeats';

// 회차 에디터 '반복되는 말 찾기' 창: 본문에서 세 번 이상 나온 낱말(조사는 떼고 셈)을 많은 차례로.
// 낱말을 누르면 찾기 창이 그 말로 열려 본문의 모든 자리가 칠해진다 (그 자리에서 바꾸기도)

// 선택만 바뀐 트랜잭션에서도 다시 세지 않게 문서마다 한 번만
const counted = new WeakMap<PMNode, RepeatedWord[]>();
function repeatsOf(doc: PMNode): RepeatedWord[] {
  let words = counted.get(doc);
  if (!words) {
    words = repeatedWords(doc);
    counted.set(doc, words);
  }
  return words;
}

export function RepeatPanel({ editor, onFind, onClose }: { editor: Editor; onFind: (word: string) => void; onClose: () => void }) {
  const words = useEditorState({ editor, selector: ({ editor: now }) => repeatsOf(now.state.doc) }) ?? [];
  const listRef = useRef<HTMLOListElement>(null);
  const emptyRef = useRef<HTMLParagraphElement>(null);

  // 열면 첫 낱말에 포커스 (없으면 안내 글로)
  useEffect(() => {
    (listRef.current?.querySelector<HTMLButtonElement>('button') ?? emptyRef.current)?.focus();
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

  return (
    <section aria-label="반복되는 말" onKeyDown={onKeyDown} className="mt-2 rounded-xl border border-line bg-surface p-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="pl-1.5 text-sm font-semibold">
          반복되는 말 <span className="font-normal text-muted">세 번 이상 나온 낱말</span>
        </h2>
        <button
          type="button"
          onClick={close}
          aria-label="반복되는 말 닫기"
          title="닫기 (Esc)"
          className="grid size-9 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-fg"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" className="size-4">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
      {words.length > 0 ? (
        // 화면이 낮으면 목록도 낮게 (위에 붙은 막대가 본문을 너무 많이 가리지 않게)
        <ol ref={listRef} className="mt-1 max-h-[min(15rem,26vh)] space-y-0.5 overflow-y-auto overscroll-contain">
          {words.map((item) => (
            <li key={item.word}>
              <button
                type="button"
                onClick={() => onFind(item.word)}
                aria-label={`${item.word} ${item.count}번, 본문에서 찾기`}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition hover:bg-surface-2"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold break-all">{item.word}</span>
                  {/* 모양이 여럿이면 어떻게 나왔는지 (가장 많은 것부터 세 개) */}
                  {item.forms.length > 1 ? (
                    <span className="block truncate text-xs text-muted">
                      {item.forms
                        .slice(0, 3)
                        .map((form) => `${form.form} ${form.count}`)
                        .join(' · ')}
                      {item.forms.length > 3 ? ' …' : ''}
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 text-sm font-semibold text-accent tabular-nums">{item.count}번</span>
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <p ref={emptyRef} tabIndex={-1} className="px-1.5 pt-1 pb-1.5 text-sm text-muted outline-none">
          세 번 이상 나온 낱말이 없어요. (조사는 떼고 세요: ‘그녀는’ · ‘그녀가’ → ‘그녀’)
        </p>
      )}
    </section>
  );
}

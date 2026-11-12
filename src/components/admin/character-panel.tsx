'use client';

import type { Node as PMNode } from '@tiptap/pm/model';
import { useEditorState, type Editor } from '@tiptap/react';
import Link from 'next/link';
import { useEffect, useRef, type KeyboardEvent } from 'react';
import { characterCounts, type CharacterCounts } from '@/lib/character-counts';

// 회차 에디터 '등장인물 횟수' 창: 작품 정보의 등장인물이 이 회차에 몇 번 나오는지 (많이 나온 차례, 안 나온 인물은 따로).
// 이름을 누르면 찾기 창이 그 이름으로 열려 본문의 모든 자리가 칠해진다. 템플릿 안에만 나온 인물은 찾기 창이 못 찾아서 단추가 아니다

// 선택만 바뀐 트랜잭션에서도 다시 세지 않게 문서·이름 목록마다 한 번만
const counted = new WeakMap<PMNode, { names: string[]; result: CharacterCounts }>();
function countsOf(doc: PMNode, names: string[]): CharacterCounts {
  const cached = counted.get(doc);
  if (cached && cached.names === names) return cached.result;
  const result = characterCounts(doc, names);
  counted.set(doc, { names, result });
  return result;
}

export function CharacterPanel({
  editor,
  names,
  novelId,
  onFind,
  onClose,
}: {
  editor: Editor;
  names: string[];
  novelId: number;
  onFind: (word: string) => void;
  onClose: () => void;
}) {
  const { appeared, missing } = useEditorState({ editor, selector: ({ editor: now }) => countsOf(now.state.doc, names) }) ?? { appeared: [], missing: [] };
  const bodyRef = useRef<HTMLDivElement>(null);

  // 열면 첫 이름 단추에 포커스 (없으면 안내 글로)
  useEffect(() => {
    bodyRef.current?.querySelector<HTMLElement>('button, a, [tabindex="-1"]')?.focus();
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
    <section aria-label="등장인물 횟수" onKeyDown={onKeyDown} className="mt-2 rounded-xl border border-line bg-surface p-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="pl-1.5 text-sm font-semibold">
          등장인물 횟수 <span className="font-normal text-muted">작품 정보의 등장인물</span>
        </h2>
        <button
          type="button"
          onClick={close}
          aria-label="등장인물 횟수 닫기"
          title="닫기 (Esc)"
          className="grid size-9 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-fg"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" className="size-4">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
      <div ref={bodyRef}>
        {names.length === 0 ? (
          <p className="px-1.5 pt-1 pb-1.5 text-sm text-muted">
            작품 정보에 등장인물을 적어 두면 이 회차에 몇 번 나오는지 볼 수 있어요.{' '}
            <Link href={`/admin/novels/${novelId}#novel-characters`} className="font-semibold text-accent underline-offset-2 hover:underline">
              등장인물 적으러 가기
            </Link>
          </p>
        ) : (
          <>
            {appeared.length > 0 ? (
              // 화면이 낮으면 목록도 낮게 (위에 붙은 막대가 본문을 너무 많이 가리지 않게)
              <ol className="mt-1 max-h-[min(15rem,26vh)] space-y-0.5 overflow-y-auto overscroll-contain">
                {appeared.map((item) => {
                  const total = item.body + item.templates;
                  const detail = item.templates > 0 ? (item.body > 0 ? `템플릿 안 ${item.templates}번 포함` : '템플릿 안에만') : null;
                  const inner = (
                    <>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold break-all">{item.name}</span>
                        {detail ? <span className="block text-xs text-muted">{detail}</span> : null}
                      </span>
                      <span className="shrink-0 text-sm font-semibold text-accent tabular-nums">{total}번</span>
                    </>
                  );
                  return (
                    <li key={item.name}>
                      {item.body > 0 ? (
                        <button
                          type="button"
                          onClick={() => onFind(item.name)}
                          aria-label={`${item.name} ${total}번${detail ? `, ${detail}` : ''}, 본문에서 찾기`}
                          className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition hover:bg-surface-2"
                        >
                          {inner}
                        </button>
                      ) : (
                        <div className="flex w-full items-center gap-3 px-2 py-1.5">{inner}</div>
                      )}
                    </li>
                  );
                })}
              </ol>
            ) : null}
            {missing.length > 0 ? (
              <p tabIndex={appeared.length === 0 ? -1 : undefined} className="px-1.5 pt-1.5 pb-1 text-xs break-keep text-muted outline-none">
                {appeared.length === 0 ? '등장인물이 이 회차에 아직 안 나왔어요: ' : '안 나온 인물: '}
                {missing.join(', ')}
              </p>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}

'use client';

import type { Node as PMNode } from '@tiptap/pm/model';
import { NodeSelection, Selection, TextSelection } from '@tiptap/pm/state';
import { useEditorState, type Editor } from '@tiptap/react';
import { useEffect, useRef, type KeyboardEvent } from 'react';
import { formatNumber } from '@/lib/format';
import { scrollBehavior } from '@/lib/motion';
import { sceneIndexAt, sceneOutline, type Scene } from '@/lib/scenes';
import { cn } from '@/lib/utils';

// 회차 에디터 '장면 바로가기' 창: 장면 전환(✦)으로 나뉜 장면 목록 (첫 문장 · 글자 수), 누르면 그 장면 첫머리로.
// 찾기·자주 틀리는 말 창과 같은 자리에 뜨고, 고르면 닫힌다 (도구 막대가 화면 위에 붙어 있어서 본문을 가리지 않게)

// 선택만 바뀐 트랜잭션에서도 목록을 다시 세지 않게 문서마다 한 번만
const outlines = new WeakMap<PMNode, Scene[]>();
function outlineOf(doc: PMNode): Scene[] {
  let scenes = outlines.get(doc);
  if (!scenes) {
    scenes = sceneOutline(doc);
    outlines.set(doc, scenes);
  }
  return scenes;
}

/** 장면 첫머리에 커서를 두고 그 자리를 도구 막대 바로 아래로 (bar: 화면 위에 붙는 도구 막대) */
export function jumpToScene(editor: Editor, scene: Scene, bar: HTMLElement | null) {
  const { state, view } = editor;
  const { pos, kind } = scene.target;
  const selection =
    kind === 'text'
      ? TextSelection.create(state.doc, pos)
      : kind === 'node'
        ? NodeSelection.create(state.doc, pos)
        : Selection.near(state.doc.resolve(Math.min(pos, state.doc.content.size)));
  view.dispatch(state.tr.setSelection(selection));
  view.focus();
  // 템플릿·장면 전환 줄을 고른 장면은 그 블록으로, 글로 시작하는 장면은 첫 블록(문단·인용)으로
  const element = view.nodeDOM(kind === 'node' ? pos : scene.from) as HTMLElement | null;
  if (!element) return;
  const top = element.getBoundingClientRect().top + window.scrollY - (bar?.offsetHeight ?? 0) - 12;
  window.scrollTo({ top: Math.max(0, top), behavior: scrollBehavior() });
}

export function ScenePanel({ editor, onJump, onClose }: { editor: Editor; onJump: (scene: Scene) => void; onClose: () => void }) {
  const { scenes, current } = useEditorState({
    editor,
    selector: ({ editor: now }) => {
      const scenes = outlineOf(now.state.doc);
      return { scenes, current: sceneIndexAt(scenes, now.state.selection.from) };
    },
  }) ?? { scenes: [], current: 0 };
  const listRef = useRef<HTMLOListElement>(null);
  const emptyRef = useRef<HTMLParagraphElement>(null);

  // 열면 지금 장면에 포커스 (장면이 하나뿐이면 안내 글로)
  useEffect(() => {
    (listRef.current?.querySelector<HTMLButtonElement>('[aria-current="location"]') ?? emptyRef.current)?.focus();
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
    <nav aria-label="장면 바로가기" onKeyDown={onKeyDown} className="mt-2 rounded-xl border border-line bg-surface p-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="pl-1.5 text-sm font-semibold">
          장면 바로가기 <span className="font-normal text-muted tabular-nums">{scenes.length > 1 ? `${scenes.length}개` : ''}</span>
        </h2>
        <button
          type="button"
          onClick={close}
          aria-label="장면 바로가기 닫기"
          title="닫기 (Esc)"
          className="grid size-9 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-fg"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" className="size-4">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
      {scenes.length > 1 ? (
        <ol ref={listRef} className="mt-1 max-h-60 space-y-0.5 overflow-y-auto overscroll-contain">
          {scenes.map((scene, index) => (
            <li key={scene.from}>
              <button
                type="button"
                aria-current={index === current ? 'location' : undefined}
                onClick={() => onJump(scene)}
                className={cn('flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm transition', index === current ? 'bg-accent-soft' : 'hover:bg-surface-2')}
              >
                <span className="w-5 shrink-0 text-right text-xs font-semibold text-muted tabular-nums">{scene.number}</span>
                <span className={cn('min-w-0 flex-1 truncate', !scene.lead && 'text-muted')}>{scene.lead || '빈 장면'}</span>
                {index === current ? <span className="shrink-0 text-xs font-semibold text-accent">지금</span> : null}
                <span className="shrink-0 text-xs text-muted tabular-nums">{formatNumber(scene.chars)}자</span>
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <p ref={emptyRef} tabIndex={-1} className="px-1.5 pt-1 pb-1.5 text-sm text-muted outline-none">
          장면 전환(✦)이 없어서 장면이 하나예요. 도구 막대의 ✦로 장면을 나눌 수 있어요.
        </p>
      )}
    </nav>
  );
}

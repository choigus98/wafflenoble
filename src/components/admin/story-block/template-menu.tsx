'use client';

import { NodeSelection } from '@tiptap/pm/state';
import type { Editor } from '@tiptap/react';
import { useEffect, useRef, useState } from 'react';
import { TEMPLATES, createTemplate, newId, type TemplateKey } from '@/lib/story-blocks';

/** 툴바의 '＋ 템플릿' 메뉴. 고르면 커서 위치에 넣고 편집 창을 바로 연다 */
export function TemplateMenu({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === 'Escape' : !rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  function insert(key: TemplateKey) {
    const block = createTemplate(key);
    const content = {
      type: 'storyBlock',
      attrs: { kind: block.kind, data: block.data, isNew: true, uid: newId() },
    };

    // 템플릿이 선택된 상태에서 그냥 넣으면 그 템플릿이 새 것으로 바뀌어 버린다 → 선택된 템플릿 뒤에 넣기
    const { selection } = editor.state;
    const at = selection instanceof NodeSelection ? selection.to : selection.from;
    // focus()는 쓰지 않는다: Tiptap이 포커스를 한 박자 늦게 잡아서, 새 템플릿의 입력칸에 준 포커스를 빼앗아 간다
    editor.chain().insertContentAt(at, content).run();

    // 넣고 나면 새 템플릿이 선택된 상태가 되므로, 커서를 바로 뒤 문단으로 옮긴다 (없으면 빈 문단을 만든다)
    const after = editor.state.selection;
    if (after instanceof NodeSelection && after.node.type.name === 'storyBlock') {
      const position = after.to;
      if (editor.state.doc.resolve(position).nodeAfter?.isTextblock) {
        editor.commands.setTextSelection(position + 1);
      } else {
        editor.chain().insertContentAt(position, { type: 'paragraph' }).setTextSelection(position + 1).run();
      }
    }
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex h-8 items-center gap-1 rounded-lg px-2.5 text-sm font-semibold text-accent transition hover:bg-accent-soft"
      >
        ＋ 템플릿
      </button>
      {open ? (
        <div className="absolute top-10 left-0 z-30 w-64 rounded-2xl border border-line bg-surface p-1.5 shadow-lg shadow-black/10">
          {TEMPLATES.map((template) => (
            <button
              key={template.key}
              type="button"
              onClick={() => insert(template.key)}
              className="flex w-full flex-col items-start rounded-xl px-3 py-2.5 text-left transition hover:bg-surface-2"
            >
              <span className="text-sm font-semibold">{template.label}</span>
              <span className="text-xs text-muted">{template.hint}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

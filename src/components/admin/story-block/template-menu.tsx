'use client';

import { NodeSelection } from '@tiptap/pm/state';
import type { Editor } from '@tiptap/react';
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { useDismiss } from '@/components/use-dismiss';
import { announce } from '@/lib/announce';
import { TEMPLATES, createTemplate, newId, type TemplateKey } from '@/lib/story-blocks';
import { matchTemplates } from '@/lib/template-search';
import { cn } from '@/lib/utils';

/**
 * 툴바의 '＋ 템플릿' 메뉴. 고르면 커서 위치에 넣고 편집 창을 바로 연다.
 * 맨 위 찾기 칸에 이름·설명·초성으로 거르고(ㅇㅅㅈ → 영수증), ↑/↓·Home/End로 고르고 Enter로 넣는다.
 * 포커스는 찾기 칸에 둔 채 목록을 고르는 콤보 상자 방식 (화면 낭독기는 aria-activedescendant로 고른 항목을 읽음)
 */
export function TemplateMenu({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [searching, setSearching] = useState(false); // 찾기 칸에 포커스가 있을 때만 고른 항목을 칠한다
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const focusSearchRef = useRef(false);
  const id = useId();
  const listId = `${id}-list`;
  const optionId = (key: TemplateKey) => `${id}-${key}`;
  const results = useMemo(() => matchTemplates(TEMPLATES, query), [query]);
  const current = results.length > 0 ? results[Math.min(active, results.length - 1)] : null;
  useDismiss({ open, onClose: () => setOpen(false), rootRef, triggerRef });

  // 툴바가 화면 중간(제자리)에 있을 때 열면 메뉴 아래쪽이 화면 밖으로 나가서, 손가락·휠로는 메뉴 안만 스크롤되고
  // 마지막 템플릿까지 못 닿는다 → 지금 보이는 화면의 아래 끝까지만 키우고 그 안에서 스크롤.
  // 휴대폰에서 찾기 칸을 눌러 화면 키보드가 올라오면 그 위까지로 다시 잰다
  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!open || !menu) return;
    const measure = () => {
      const viewport = window.visualViewport;
      const bottom = viewport ? viewport.offsetTop + viewport.height : window.innerHeight;
      menu.style.maxHeight = `${Math.max(Math.floor(bottom - menu.getBoundingClientRect().top - 12), 160)}px`;
    };
    measure();
    window.visualViewport?.addEventListener('resize', measure);
    return () => window.visualViewport?.removeEventListener('resize', measure);
  }, [open]);

  // 키보드로 열었거나 마우스·트랙패드를 쓰면 바로 찾기 칸에서 시작 (휴대폰은 화면 키보드가 메뉴를 가리지 않게 그대로 둔다)
  useEffect(() => {
    if (open && focusSearchRef.current) inputRef.current?.focus();
  }, [open]);

  // 고른 항목이 목록 밖에 있으면 보이게
  const currentKey = current?.key;
  useEffect(() => {
    if (!open || !currentKey) return;
    document.getElementById(`${id}-${currentKey}`)?.scrollIntoView({ block: 'nearest' });
  }, [open, currentKey, id]);

  // 찾은 개수를 화면 낭독기에 (치는 동안 매번 읽지 않게 잠깐 기다렸다가)
  useEffect(() => {
    if (!open || !query.trim()) return;
    const timer = window.setTimeout(() => announce(results.length > 0 ? `템플릿 ${results.length}개` : '맞는 템플릿이 없어요'), 500);
    return () => window.clearTimeout(timer);
  }, [open, query, results.length]);

  function toggle(event: MouseEvent<HTMLButtonElement>) {
    if (open) {
      setOpen(false);
      return;
    }
    setQuery('');
    setActive(0);
    // detail이 0이면 키보드(Enter·Space)로 누른 것
    focusSearchRef.current = event.detail === 0 || window.matchMedia('(pointer: fine)').matches;
    setOpen(true);
  }

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

  function onSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    // 한글 조합 중의 Enter·화살표는 조합을 끝내는 데 쓰인다
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      if (current) insert(current.key);
      return;
    }
    if (event.key === 'Tab') {
      setOpen(false);
      return;
    }
    const count = results.length;
    if (count === 0) return;
    const index = current ? results.indexOf(current) : 0;
    const next =
      event.key === 'ArrowDown'
        ? (index + 1) % count
        : event.key === 'ArrowUp'
          ? (index - 1 + count) % count
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? count - 1
              : null;
    if (next === null) return;
    event.preventDefault();
    setActive(next);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex h-8 items-center gap-1 rounded-lg px-2.5 text-sm font-semibold text-accent transition hover:bg-accent-soft"
      >
        ＋ 템플릿
      </button>
      {open ? (
        <div
          ref={menuRef}
          role="dialog"
          aria-label="템플릿 넣기"
          className="absolute top-10 left-0 z-30 flex max-h-[calc(100dvh-6rem)] w-64 flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-lg shadow-black/10"
        >
          <div className="shrink-0 border-b border-line p-1.5">
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-label="템플릿 찾기"
              aria-expanded={results.length > 0}
              aria-controls={results.length > 0 ? listId : undefined}
              aria-autocomplete="list"
              aria-activedescendant={current ? optionId(current.key) : undefined}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(0);
              }}
              onKeyDown={onSearchKeyDown}
              onFocus={() => setSearching(true)}
              onBlur={() => setSearching(false)}
              placeholder="찾기 (예: 영수증, ㅇㅅㅈ)"
              autoComplete="off"
              spellCheck={false}
              maxLength={20}
              className="h-9 w-full rounded-lg bg-surface-2 px-3 text-base text-fg placeholder:text-muted focus:ring-2 focus:ring-accent/40 focus:outline-none sm:text-sm"
            />
          </div>
          {results.length > 0 ? (
            // 템플릿이 많아서 화면 높이 안에서 스크롤 (메뉴 높이는 위에서 열 때 잰다)
            <ul id={listId} role="listbox" aria-label="템플릿" className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5">
              {results.map((template, index) => {
                const selected = template.key === current?.key;
                return (
                  <li
                    key={template.key}
                    id={optionId(template.key)}
                    role="option"
                    aria-selected={selected}
                    // 누르는 동안 찾기 칸의 포커스를 지킨다 (빠지면 메뉴가 먼저 닫힐 수 있어서)
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseMove={() => {
                      if (!selected) setActive(index);
                    }}
                    onClick={() => insert(template.key)}
                    className={cn(
                      'flex cursor-pointer flex-col items-start rounded-xl px-3 py-2.5 text-left transition hover:bg-surface-2',
                      selected && searching && 'bg-surface-2',
                    )}
                  >
                    <span className="text-sm font-semibold">{template.label}</span>
                    <span className="text-xs text-muted">{template.hint}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="px-3 py-6 text-center text-sm text-muted">맞는 템플릿이 없어요</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

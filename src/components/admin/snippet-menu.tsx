'use client';

import { Extension, type Editor } from '@tiptap/react';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { useDismiss } from '@/components/use-dismiss';
import { Button } from '@/components/ui';
import { announce } from '@/lib/announce';
import { addSnippet, parseSnippets, SNIPPETS_KEY, snippetsFromText, snippetsToText } from '@/lib/snippets';
import { cn } from '@/lib/utils';

// 회차 에디터 '상용구': 자주 쓰는 말을 이 기기에 저장해 두고 도구 막대 메뉴에서 넣는다 (정리 규칙은 lib/snippets.ts).
// - 메뉴(⌘; · Ctrl+;): 상용구를 누르거나 앞의 아홉 개는 숫자 키 1~9로 바로 넣기, '고른 글을 상용구로', '상용구 고치기…'(한 줄에 하나)
// - 넣는 말은 글 그대로 (꺾쇠 같은 글자가 서식으로 바뀌지 않게), 고른 글이 있으면 그 자리를 바꾼다

// 에디터는 브라우저에서만 그려져서(chapter-editor-loader) 처음 그릴 때 이 기기 저장값을 바로 읽어도 된다
function readSnippets(): string[] {
  try {
    return parseSnippets(localStorage.getItem(SNIPPETS_KEY));
  } catch {
    return [];
  }
}

function writeSnippets(list: string[]) {
  try {
    localStorage.setItem(SNIPPETS_KEY, JSON.stringify(list));
  } catch {}
}

const MENU_WIDTH = 264;

// 에디터 단축키가 도구 막대의 메뉴를 열 때 보내는 신호 (한 화면에 에디터는 하나)
const OPEN_EVENT = 'wn:snippet-menu-open';

/** ⌘; (Ctrl+;)로 상용구 메뉴 열기 */
export const SnippetShortcut = Extension.create({
  name: 'snippetShortcut',
  addKeyboardShortcuts() {
    return {
      'Mod-;': () => {
        window.dispatchEvent(new Event(OPEN_EVENT));
        return true;
      },
    };
  },
});

export function SnippetMenu({ editor }: { editor: Editor }) {
  const [snippets, setSnippets] = useState<string[]>(readSnippets);
  const [open, setOpen] = useState(false);
  const [place, setPlace] = useState({ left: 0, width: MENU_WIDTH });
  // 메뉴를 연 때 고른 글 ('고른 글을 상용구로')
  const [selected, setSelected] = useState('');
  const [draft, setDraft] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const openRef = useRef<() => void>(() => {});
  const menuId = useId();
  const dialogTitleId = useId();
  const dialogHintId = useId();
  useDismiss({ open, onClose: () => setOpen(false), rootRef, triggerRef });

  const items = () => [...(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not([disabled])') ?? [])];

  useEffect(() => {
    if (open) items()[0]?.focus();
  }, [open]);

  // 다른 탭에서 고치면 따라간다
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === SNIPPETS_KEY) setSnippets(readSnippets());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  function toggle(next: boolean) {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (next && rect) {
      const viewport = document.documentElement.clientWidth;
      const width = Math.min(MENU_WIDTH, viewport - 16);
      // 오른쪽이 넘치면 그만큼 왼쪽으로, 그래도 왼쪽 여백(8px)보다 더 가지는 않게
      const left = Math.max(8 - rect.left, Math.min(0, viewport - 8 - (rect.left + width)));
      setPlace({ left, width });
      const { from, to } = editor.state.selection;
      setSelected(editor.state.doc.textBetween(from, to, ' ', ' ').trim());
    }
    setOpen(next);
  }

  // 에디터에서 ⌘;를 누르면 열기 (메뉴 자리는 단추 기준으로 재야 해서 여기서 연다)
  useEffect(() => {
    const onOpen = () => openRef.current();
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);
  useEffect(() => {
    openRef.current = () => toggle(true);
  });

  function insert(text: string) {
    setOpen(false);
    // 글 그대로 넣는다 (insertContent에 문자열을 주면 HTML로 읽어서 '<b>'가 서식이 되므로 글 조각으로)
    editor.chain().focus().insertContent({ type: 'text', text }).run();
  }

  function capture() {
    const result = addSnippet(snippets, selected);
    setOpen(false);
    triggerRef.current?.focus();
    if (!result.added) {
      announce(result.reason === 'duplicate' ? '이미 있는 상용구예요' : result.reason === 'full' ? '상용구는 30개까지예요' : '고른 글이 없어요');
      return;
    }
    writeSnippets(result.list);
    setSnippets(result.list);
    announce(`상용구에 넣었어요: ${result.text}`);
  }

  function openManage() {
    setOpen(false);
    setDraft(snippetsToText(snippets));
    dialogRef.current?.showModal();
    // 에디터는 브라우저에서만 그려져서 autoFocus가 속성으로 붙지 않는다 → 창이 '닫기' 단추가 아니라 글 칸부터 열리게 직접
    textRef.current?.focus();
  }

  function saveManage() {
    const list = snippetsFromText(draft);
    writeSnippets(list);
    setSnippets(list);
    dialogRef.current?.close();
    announce(list.length > 0 ? `상용구 ${list.length}개를 저장했어요` : '상용구를 모두 지웠어요');
  }

  function onMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    // 숫자 키 1~9: 그 번호의 상용구 바로 넣기
    if (/^[1-9]$/.test(event.key) && !event.metaKey && !event.ctrlKey && !event.altKey) {
      const text = snippets[Number(event.key) - 1];
      if (text) {
        event.preventDefault();
        insert(text);
      }
      return;
    }
    const list = items();
    if (list.length === 0) return;
    if (event.key === 'Tab') {
      setOpen(false);
      return;
    }
    const index = list.indexOf(document.activeElement as HTMLButtonElement);
    const next =
      event.key === 'ArrowDown'
        ? (index + 1) % list.length
        : event.key === 'ArrowUp'
          ? (index - 1 + list.length) % list.length
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? list.length - 1
              : null;
    if (next === null) return;
    event.preventDefault();
    list[next]?.focus();
  }

  const item = 'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition hover:bg-surface-2 disabled:pointer-events-none disabled:opacity-40';

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        title="상용구: 자주 쓰는 말 넣기 (⌘; · Ctrl+;)"
        onClick={() => toggle(!open)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            toggle(true);
          }
        }}
        className={cn('flex h-8 items-center gap-1 rounded-lg px-2 text-[13px] font-semibold transition', open ? 'bg-accent-soft text-accent' : 'text-fg hover:bg-surface-2')}
      >
        상용구
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-3.5">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open ? (
        <div style={{ left: place.left, width: place.width }} className="absolute top-10 z-30 rounded-xl border border-line bg-surface p-1 shadow-lg shadow-black/10">
          {snippets.length === 0 ? (
            <p className="px-2.5 pt-1.5 pb-1 text-xs leading-relaxed text-muted">아직 상용구가 없어요. 글을 골라 넣거나 ‘상용구 고치기’에서 한 줄에 하나씩 적어 두세요.</p>
          ) : null}
          <div ref={menuRef} id={menuId} role="menu" aria-label="상용구" onKeyDown={onMenuKeyDown} className="max-h-[min(22rem,60dvh)] overflow-y-auto overscroll-contain">
            {snippets.map((text, index) => (
              <button
                key={text}
                type="button"
                role="menuitem"
                aria-keyshortcuts={index < 9 ? String(index + 1) : undefined}
                onClick={() => insert(text)}
                className={item}
              >
                <span aria-hidden="true" className="w-3 shrink-0 text-right text-xs text-muted tabular-nums">
                  {index < 9 ? index + 1 : ''}
                </span>
                <span className="min-w-0 flex-1 truncate">{text}</span>
              </button>
            ))}
            {snippets.length > 0 ? <div role="separator" className="my-1 border-t border-line" /> : null}
            <button type="button" role="menuitem" disabled={!selected} onClick={capture} className={item}>
              고른 글을 상용구로
            </button>
            <button type="button" role="menuitem" onClick={openManage} className={item}>
              상용구 고치기…
            </button>
          </div>
        </div>
      ) : null}
      <dialog
        ref={dialogRef}
        aria-labelledby={dialogTitleId}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialogRef.current?.close();
        }}
        onClose={() => triggerRef.current?.focus()}
        className="m-auto w-[min(28rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-line bg-surface p-0 text-fg shadow-xl backdrop:bg-black/45"
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            saveManage();
          }}
          className="flex max-h-[min(40rem,calc(100dvh-2rem))] flex-col"
        >
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line py-2.5 pr-2.5 pl-5">
            <h2 id={dialogTitleId} className="font-bold">
              상용구 고치기
            </h2>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label="닫기"
              className="grid size-9 place-items-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-fg"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" className="size-4">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-5 py-4">
            <p id={dialogHintId} className="text-xs leading-relaxed text-muted">
              한 줄에 하나씩, 30개까지 적어요. 이 기기에만 저장돼요. 메뉴에서 앞의 아홉 개는 숫자 키 1~9로 바로 넣을 수 있어요.
            </p>
            <textarea
              ref={textRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              aria-label="상용구 (한 줄에 하나)"
              aria-describedby={dialogHintId}
              spellCheck={false}
              rows={8}
              placeholder={'하연화\n자정의 와플 가게\n“어서 오세요. 오늘은 무엇을 찾으세요?”'}
              className="min-h-48 w-full resize-y rounded-xl border border-line bg-surface px-3.5 py-3 text-base leading-relaxed text-fg placeholder:text-muted/60 focus:border-accent focus:ring-3 focus:ring-accent/20 focus:outline-none"
            />
          </div>
          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-line px-5 py-3">
            <Button type="button" variant="ghost" size="sm" onClick={() => dialogRef.current?.close()}>
              취소
            </Button>
            <Button type="submit" size="sm">
              저장
            </Button>
          </div>
        </form>
      </dialog>
    </div>
  );
}

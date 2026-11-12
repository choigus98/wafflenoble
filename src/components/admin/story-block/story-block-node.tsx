'use client';

import { NodeSelection } from '@tiptap/pm/state';
import { Node, NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react';
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { StoryBlockView } from '@/components/story-block-view';
import { announce } from '@/lib/announce';
import { newId, parseStoryBlock, templateLabel, type StoryBlock } from '@/lib/story-blocks';
import { cn } from '@/lib/utils';
import { ConversationEditor, InlineCardEditor } from './block-editor';
import { BlockMenu, type BlockMenuAction } from './block-menu';

// ─── 지금 편집 중인 템플릿 (에디터마다 하나) ─────────────────────
// 템플릿은 한 번에 하나만 편집한다. 회차 에디터가 이 값을 보고 편집 중에는 발행을 막는다.

export type TemplateEditingStore = {
  get: () => string | null;
  set: (uid: string | null) => void;
  subscribe: (listener: () => void) => () => void;
};

export function createTemplateEditingStore(): TemplateEditingStore {
  let current: string | null = null;
  const listeners = new Set<() => void>();
  return {
    get: () => current,
    set: (uid) => {
      if (uid === current) return;
      current = uid;
      for (const listener of listeners) listener();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export function useEditingTemplateUid(store: TemplateEditingStore): string | null {
  return useSyncExternalStore(store.subscribe, store.get, () => null);
}

// configure 없이 쓰였을 때를 위한 기본 저장소
const fallbackStore = createTemplateEditingStore();

/**
 * ProseMirror는 같은 종류의 다른 노드에 이 뷰를 재사용할 수 있다.
 * 블록마다 붙인 편집용 uid를 key로 써서, 다른 블록이 되면 상태를 새로 만든다.
 */
function StoryBlockNodeView(props: NodeViewProps) {
  return <StoryBlockItem key={String(props.node.attrs.uid ?? '')} {...props} />;
}

function StoryBlockItem({ node, editor, getPos, selected, deleteNode, extension }: NodeViewProps) {
  const store: TemplateEditingStore = extension.options.editingStore ?? fallbackStore;
  const editingUid = useEditingTemplateUid(store);
  const block = parseStoryBlock(node.attrs.kind, node.attrs.data);
  const uid = node.attrs.uid as string | null;
  const isNew = node.attrs.isNew === true;
  const isConversation =
    block?.kind === 'kakao' ||
    block?.kind === 'chat' ||
    block?.kind === 'post' ||
    block?.kind === 'system' ||
    block?.kind === 'sns' ||
    block?.kind === 'search' ||
    block?.kind === 'push' ||
    block?.kind === 'sms' ||
    block?.kind === 'receipt' ||
    block?.kind === 'poll' ||
    block?.kind === 'item' ||
    block?.kind === 'rank' ||
    block?.kind === 'todo' ||
    block?.kind === 'weather' ||
    block?.kind === 'parcel' ||
    block?.kind === 'ticket' ||
    block?.kind === 'match';
  const isPostLike = block?.kind === 'post' || block?.kind === 'sns';
  const editLabel = isPostLike
    ? '글 고치기'
    : block?.kind === 'search'
      ? '결과 고치기'
      : block?.kind === 'push'
        ? '알림 고치기'
        : block?.kind === 'receipt'
          ? '품목 고치기'
          : block?.kind === 'poll'
            ? '선택지 고치기'
            : block?.kind === 'item'
              ? '능력치 고치기'
              : block?.kind === 'rank'
                ? '순위 고치기'
                : block?.kind === 'todo'
                  ? '목록 고치기'
                  : block?.kind === 'weather'
                    ? '날씨 고치기'
                    : block?.kind === 'parcel'
                      ? '기록 고치기'
                      : block?.kind === 'ticket'
                        ? '표 고치기'
                        : block?.kind === 'match'
                          ? '결과 고치기'
                          : '대본 고치기';
  // 읽어 주는 이름: '커뮤니티 게시글 고치기', 'SNS 게시물 고치기', '검색 결과 고치기', '휴대폰 알림 고치기', '투표 고치기'
  const editName =
    isPostLike || block?.kind === 'search' || block?.kind === 'push' || block?.kind === 'receipt' || block?.kind === 'poll' || block?.kind === 'item' || block?.kind === 'rank' || block?.kind === 'todo' || block?.kind === 'weather' || block?.kind === 'parcel' || block?.kind === 'ticket' || block?.kind === 'match'
      ? '고치기'
      : '대본 고치기';
  const editing = uid !== null && editingUid === uid;
  const [menuOpen, setMenuOpen] = useState(false);
  const [canMove, setCanMove] = useState({ up: false, down: false });

  const cardRef = useRef<HTMLDivElement>(null);
  // '완료'·Esc로 편집 창을 닫으면 포커스를 이 카드로 돌려준다 (창이 사라지면서 포커스가 화면 맨 앞으로 튕기지 않게)
  const refocusCardRef = useRef(false);

  const open = () => {
    if (uid !== null) store.set(uid); // 다른 템플릿 편집 창은 닫힌다 (닫히면서 고친 내용 저장)
  };
  const close = () => {
    if (store.get() !== uid) return;
    refocusCardRef.current = true;
    store.set(null);
  };

  useEffect(() => {
    if (editing || !refocusCardRef.current) return;
    refocusCardRef.current = false;
    cardRef.current?.focus();
  }, [editing]);

  // 방금 넣은 템플릿: 대화형은 대본 편집 창을 바로 열고, 카드형은 다른 편집 창을 닫는다 (첫 칸에 커서)
  // '방금 넣음' 표시는 한 번 쓰고 지운다 (되돌리기 기록에는 남기지 않음)
  useEffect(() => {
    if (!isNew) return;
    const pos = getPos();
    if (typeof pos !== 'number') return;
    editor.view.dispatch(editor.state.tr.setNodeAttribute(pos, 'isNew', false).setMeta('addToHistory', false));
    store.set(isConversation ? uid : null);
  }, [editor, getPos, isNew, isConversation, store, uid]);

  // 지워지거나 화면에서 빠지면 '편집 중' 표시를 정리 (발행 버튼이 계속 막혀 있지 않게)
  useEffect(() => {
    return () => {
      if (uid !== null && store.get() === uid) store.set(null);
    };
  }, [store, uid]);

  /**
   * 편집 내용 반영. 이 자리에 다른 블록이 와 있으면 쓰지 않는다 (잘못된 블록에 덮어쓰기 방지).
   * 블록 안의 글은 각 입력칸의 되돌리기로 처리하고, 문서 되돌리기 기록에는 남기지 않는다.
   */
  function commit(next: StoryBlock) {
    if (editor.isDestroyed) return;
    const pos = getPos();
    if (typeof pos !== 'number' || editor.state.doc.nodeAt(pos)?.attrs.uid !== uid) return;
    editor.view.dispatch(editor.state.tr.setNodeAttribute(pos, 'data', next.data).setMeta('addToHistory', false));
  }

  function remove() {
    if (window.confirm('이 템플릿을 지울까요?')) deleteNode();
  }

  /**
   * 바로 아래에 똑같은 템플릿을 하나 더 넣고, 새 것을 고치는 상태로 연다 (대화를 이어 쓸 때).
   * 되돌리기(Ctrl/⌘+Z) 한 번이면 복제한 것이 사라진다.
   */
  function duplicate() {
    if (editor.isDestroyed) return;
    const pos = getPos();
    if (typeof pos !== 'number') return;
    // 카드 위에서 고치던 칸이 있으면 먼저 반영한다 (칸에서 벗어날 때 저장되므로)
    const active = document.activeElement;
    if (active instanceof HTMLElement && editor.view.nodeDOM(pos)?.contains(active)) active.blur();
    const current = editor.state.doc.nodeAt(pos);
    if (!current || current.attrs.uid !== uid) return;
    editor
      .chain()
      .insertContentAt(pos + current.nodeSize, {
        type: 'storyBlock',
        attrs: { kind: current.attrs.kind, data: structuredClone(current.attrs.data), isNew: true, uid: newId() },
      })
      .run();
  }

  /**
   * 아래로 옮길 자리가 있는지. 에디터는 문서 끝에 빈 문단을 늘 하나 두므로(끝에서 글을 이어 쓸 수 있게),
   * 그 빈 문단과는 자리를 바꾸지 않는다 (바꾸면 빈 문단이 또 생겨 제자리걸음)
   */
  function hasRoomBelow(index: number, parent: { childCount: number; child: (index: number) => { isTextblock: boolean; content: { size: number } } }) {
    if (index >= parent.childCount - 1) return false;
    const next = parent.child(index + 1);
    return !(index + 1 === parent.childCount - 1 && next.isTextblock && next.content.size === 0);
  }

  /** 메뉴를 열 때 지금 자리를 보고 위·아래로 옮길 수 있는지 정한다 */
  function openMenu(next: boolean) {
    if (next) {
      const pos = getPos();
      if (typeof pos === 'number') {
        const $pos = editor.state.doc.resolve(pos);
        setCanMove({ up: $pos.index() > 0, down: hasRoomBelow($pos.index(), $pos.parent) });
      }
    }
    setMenuOpen(next);
  }

  /**
   * 바로 위·아래 블록(문단이든 템플릿이든)과 자리를 바꾼다. 옮긴 템플릿은 선택된 채로 두고
   * 포커스는 다시 그 템플릿의 ⋯ 단추로 (키보드로 여러 칸 옮길 때 이어서). 되돌리기 한 번이면 제자리로.
   */
  function move(direction: 'up' | 'down') {
    if (editor.isDestroyed) return;
    const pos = getPos();
    if (typeof pos !== 'number') return;
    const { state } = editor;
    const node = state.doc.nodeAt(pos);
    if (!node || node.attrs.uid !== uid) return;
    const $pos = state.doc.resolve(pos);
    const index = $pos.index();
    let tr = state.tr;
    let target: number;
    if (direction === 'up') {
      if (index === 0) return;
      const prev = $pos.parent.child(index - 1);
      target = pos - prev.nodeSize;
      tr = tr.replaceWith(target, pos + node.nodeSize, [node, prev]);
    } else {
      if (!hasRoomBelow(index, $pos.parent)) return;
      const next = $pos.parent.child(index + 1);
      target = pos + next.nodeSize;
      tr = tr.replaceWith(pos, pos + node.nodeSize + next.nodeSize, [next, node]);
    }
    editor.view.dispatch(tr.setSelection(NodeSelection.create(tr.doc, target)).scrollIntoView());
    announce(direction === 'up' ? '템플릿을 위로 옮겼어요' : '템플릿을 아래로 옮겼어요');
    // 옮긴 자리의 템플릿 화면은 한 박자 뒤에 그려질 수 있어서 몇 번 찾아본다
    const focusMenuButton = (attempt: number) => {
      const button = (editor.view.nodeDOM(target) as HTMLElement | null)?.querySelector<HTMLButtonElement>('button[data-block-menu]');
      if (button) button.focus({ preventScroll: true });
      else if (attempt < 10) window.setTimeout(() => focusMenuButton(attempt + 1), 16);
    };
    focusMenuButton(0);
  }

  function onMenuAction(action: BlockMenuAction) {
    if (action === 'up' || action === 'down') move(action);
    else if (action === 'duplicate') duplicate();
    else remove();
  }

  if (!block) {
    return (
      <NodeViewWrapper className="my-6">
        <div contentEditable={false} className="rounded-2xl border border-danger/40 bg-danger/5 px-4 py-3 font-sans text-sm">
          템플릿 내용을 읽을 수 없어요.{' '}
          <button type="button" onClick={deleteNode} className="font-semibold text-danger underline underline-offset-2">
            지우기
          </button>
        </div>
      </NodeViewWrapper>
    );
  }

  const toolbar = (extra: ReactNode) => (
    <div
      // 카드를 눌러 편집 창을 여는 동작과 겹치지 않게
      onClick={(event) => event.stopPropagation()}
      className={cn(
        'absolute -top-4 right-4 flex items-center gap-0.5 rounded-full border border-line bg-surface p-1 shadow-sm transition',
        // 메뉴가 열려 있으면 마우스가 떠나도 보이게, 아래 템플릿의 도구 막대보다 위에
        menuOpen ? 'z-20' : 'z-10',
        selected || menuOpen ? 'opacity-100' : 'opacity-100 sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100',
      )}
    >
      <span className="px-2 text-xs font-semibold text-muted">{templateLabel(block)}</span>
      {/* 마우스로 끌어 옮기는 손잡이. 키보드·휴대폰은 ⋯ 메뉴의 '위로·아래로 옮기기'를 쓴다 */}
      <span
        data-drag-handle=""
        draggable="true"
        title="끌어서 옮기기"
        aria-hidden="true"
        className="grid size-7 cursor-grab place-items-center rounded-full text-muted hover:bg-surface-2 active:cursor-grabbing"
      >
        ⠿
      </span>
      {extra}
      <BlockMenu label={templateLabel(block)} open={menuOpen} onOpenChange={openMenu} can={canMove} onAction={onMenuAction} />
    </div>
  );

  const frame = cn('group relative rounded-[26px] p-1.5 transition', selected ? 'ring-2 ring-accent' : 'hover:ring-2 hover:ring-line');

  return (
    <NodeViewWrapper className="my-8" data-story-block="">
      {/* 본문 영역(.novel-body)의 읽기 글꼴·크기가 편집 UI에 번지지 않도록 기본값으로 되돌린다 */}
      <div contentEditable={false} className="font-sans text-[15px] leading-normal tracking-normal whitespace-normal">
        {block.kind === 'live' ||
        block.kind === 'donation' ||
        block.kind === 'news' ||
        block.kind === 'call' ||
        block.kind === 'note' ||
        block.kind === 'mail' ||
        block.kind === 'location' ||
        block.kind === 'transfer' ||
        block.kind === 'alarm' ||
        block.kind === 'event' ||
        block.kind === 'music' ||
        block.kind === 'namecard' ||
        block.kind === 'subway' ||
        block.kind === 'profile' ? (
          // 방송창·후원 알림·뉴스 기사: 카드의 글자를 눌러 그 자리에서 바로 고친다. 고치기 시작하면 열려 있던 대본 창은 닫힌다
          <div className={frame} onFocusCapture={() => store.set(null)}>
            <InlineCardEditor block={block} onChange={commit} autoFocus={isNew} />
            {toolbar(null)}
          </div>
        ) : editing ? (
          <ConversationEditor block={block} onChange={commit} onClose={close} onDelete={deleteNode} />
        ) : (
          // 카톡·채팅창·게시글: 카드를 누르면 편집 창이 열린다.
          // 도구 막대는 카드(버튼) 바깥에 둔다 — 버튼 안의 버튼은 화면 낭독기에서 묻힐 수 있어서
          <div className={cn(frame, 'has-focus-visible:ring-2 has-focus-visible:ring-accent')}>
            <div
              ref={cardRef}
              role="button"
              tabIndex={0}
              aria-label={`${templateLabel(block)} ${editName}`}
              onClick={open}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  open();
                }
              }}
              className="cursor-pointer rounded-[20px] focus-visible:outline-none"
            >
              <StoryBlockView block={block} />
            </div>
            {toolbar(
              <button type="button" onClick={open} className="h-7 rounded-full bg-accent px-3 text-xs font-semibold text-accent-fg">
                {editLabel}
              </button>,
            )}
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}

/**
 * 본문 속 템플릿 블록 노드. 문서에는 kind·data 속성만 들고, HTML로는
 * <div data-wn-block="종류" data-wn-data="JSON"></div> 한 줄로 저장된다 (lib/story-blocks.ts)
 */
export const StoryBlockNode = Node.create<{ editingStore: TemplateEditingStore | null }>({
  name: 'storyBlock',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addOptions() {
    return { editingStore: null };
  },

  addAttributes() {
    return {
      kind: {
        default: null,
        rendered: false,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-wn-block'),
      },
      data: {
        default: null,
        rendered: false,
        parseHTML: (element: HTMLElement) => {
          try {
            return JSON.parse(element.getAttribute('data-wn-data') ?? 'null');
          } catch {
            return null;
          }
        },
      },
      // 방금 넣은 템플릿인지 (편집 창을 바로 열기 위한 표시, 저장되지 않음)
      isNew: { default: false, rendered: false, parseHTML: () => false },
      // 에디터 안에서만 쓰는 블록 구분용 id (저장되지 않고, 불러올 때마다 새로 붙음)
      uid: { default: null, rendered: false, parseHTML: () => newId() },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-wn-block]' }];
  },

  renderHTML({ node }) {
    return ['div', { 'data-wn-block': node.attrs.kind ?? '', 'data-wn-data': JSON.stringify(node.attrs.data ?? null) }];
  },

  addNodeView() {
    return ReactNodeViewRenderer(StoryBlockNodeView);
  },
});

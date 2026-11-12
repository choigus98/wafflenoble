'use client';

import { Node, NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react';
import { useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { StoryBlockView } from '@/components/story-block-view';
import { newId, parseStoryBlock, templateLabel, type StoryBlock } from '@/lib/story-blocks';
import { cn } from '@/lib/utils';
import { ConversationEditor, InlineCardEditor } from './block-editor';

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
  const isConversation = block?.kind === 'kakao' || block?.kind === 'chat' || block?.kind === 'post' || block?.kind === 'system';
  const editLabel = block?.kind === 'post' ? '글 고치기' : '대본 고치기';
  const editName = block?.kind === 'post' ? '고치기' : '대본 고치기'; // 읽어 주는 이름: '커뮤니티 게시글 고치기'
  const editing = uid !== null && editingUid === uid;

  const open = () => {
    if (uid !== null) store.set(uid); // 다른 템플릿 편집 창은 닫힌다 (닫히면서 고친 내용 저장)
  };
  const close = () => {
    if (store.get() === uid) store.set(null);
  };

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
        'absolute -top-4 right-4 z-10 flex items-center gap-0.5 rounded-full border border-line bg-surface p-1 shadow-sm transition',
        selected ? 'opacity-100' : 'opacity-100 sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100',
      )}
    >
      <span className="px-2 text-xs font-semibold text-muted">{templateLabel(block)}</span>
      <button
        type="button"
        data-drag-handle=""
        draggable="true"
        title="끌어서 옮기기"
        aria-label="끌어서 옮기기"
        className="grid size-7 cursor-grab place-items-center rounded-full text-muted hover:bg-surface-2 active:cursor-grabbing"
      >
        ⠿
      </button>
      {extra}
      <button
        type="button"
        onClick={remove}
        className="h-7 rounded-full px-2.5 text-xs font-semibold text-muted hover:bg-danger/10 hover:text-danger"
      >
        삭제
      </button>
    </div>
  );

  const frame = cn('group relative rounded-[26px] p-1.5 transition', selected ? 'ring-2 ring-accent' : 'hover:ring-2 hover:ring-line');

  return (
    <NodeViewWrapper className="my-8" data-story-block="">
      {/* 본문 영역(.novel-body)의 읽기 글꼴·크기가 편집 UI에 번지지 않도록 기본값으로 되돌린다 */}
      <div contentEditable={false} className="font-sans text-[15px] leading-normal tracking-normal whitespace-normal">
        {block.kind === 'live' || block.kind === 'donation' || block.kind === 'news' ? (
          // 방송창·후원 알림·뉴스 기사: 카드의 글자를 눌러 그 자리에서 바로 고친다. 고치기 시작하면 열려 있던 대본 창은 닫힌다
          <div className={frame} onFocusCapture={() => store.set(null)}>
            <InlineCardEditor block={block} onChange={commit} autoFocus={isNew} />
            {toolbar(null)}
          </div>
        ) : editing ? (
          <ConversationEditor block={block} onChange={commit} onClose={close} onDelete={deleteNode} />
        ) : (
          // 카톡·채팅창·게시글: 카드를 누르면 편집 창이 열린다
          <div
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
            className={cn(frame, 'cursor-pointer focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none')}
          >
            <StoryBlockView block={block} />
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

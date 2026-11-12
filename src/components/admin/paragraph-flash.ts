import { Plugin, PluginKey, type Transaction } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { Extension, type Editor } from '@tiptap/react';

// 에디터 본문의 문단(템플릿)을 잠깐 칠해서 어디인지 보여 주기 — '대사 모아 보기'에서 고른 대사, '쓰던 곳으로' 간 자리.
// 에디터가 관리하는 문단에 직접 class를 붙이면 ProseMirror가 바뀐 DOM을 되돌려 버려서, 장식으로 칠한다.
// 칠할 자리는 트랜잭션 메타로 받고(되돌리기 기록·자동저장에 안 남음), 글이 바뀌면 자리를 따라간다

export const FLASH_MS = 1600;

const flashKey = new PluginKey<DecorationSet>('wn-paragraph-flash');

export const ParagraphFlash = Extension.create({
  name: 'paragraphFlash',

  addProseMirrorPlugins() {
    return [
      new Plugin<DecorationSet>({
        key: flashKey,
        state: {
          init: () => DecorationSet.empty,
          apply(tr, previous) {
            const meta = tr.getMeta(flashKey) as { pos: number } | null | undefined;
            if (meta === null) return DecorationSet.empty;
            if (meta) {
              const node = tr.doc.nodeAt(meta.pos);
              return node ? DecorationSet.create(tr.doc, [Decoration.node(meta.pos, meta.pos + node.nodeSize, { class: 'wn-paragraph-flash' })]) : DecorationSet.empty;
            }
            return previous.map(tr.mapping, tr.doc);
          },
        },
        props: {
          decorations: (state) => flashKey.getState(state),
        },
      }),
    ];
  },
});

/** tr에 'pos 자리(노드 바로 앞) 노드를 잠깐 칠하기'를 얹는다 */
export function withFlash(tr: Transaction, pos: number): Transaction {
  return tr.setMeta(flashKey, { pos });
}

/** 칠한 것 지우기 */
export function clearFlash(editor: Editor) {
  if (!editor.isDestroyed) editor.view.dispatch(editor.state.tr.setMeta(flashKey, null));
}

import type { EditorView } from '@tiptap/pm/view';
import { Extension } from '@tiptap/react';
import { announce } from '@/lib/announce';
import { moveBlockTr } from '@/lib/move-block';

// 회차 에디터 '문단 옮기기': Alt(⌥)+↑/↓로 커서가 있는 문단(고른 템플릿도)을 바로 위·아래 덩어리와 자리를 바꾼다 (계산은 lib/move-block.ts).
// 맨 위·맨 아래라 더 못 옮겨도 키는 먹는다 (Mac에서 ⌥↑가 문단 처음으로 가는 기본 동작으로 새지 않게). 낭독기에는 옮겼는지 알려 준다

/** 옮긴 덩어리(여러 개면 첫 덩어리 위 ~ 마지막 덩어리 아래)가 위에 붙은 도구 막대 밑이나 화면 아래로 나가면 그만큼만 바로 스크롤 */
function keepVisible(view: EditorView) {
  const { $from, $to } = view.state.selection;
  const blockAt = (pos: number) => view.nodeDOM(pos) as HTMLElement | null;
  // 본문 맨 위 덩어리 자리 (고른 템플릿처럼 맨 위 칸에 있는 자리는 그대로)
  const first = blockAt($from.depth > 0 ? $from.before(1) : $from.pos);
  const last = blockAt($to.depth > 0 ? $to.before(1) : $from.pos) ?? first;
  if (!first || !last) return;
  const rectTop = first.getBoundingClientRect().top;
  const rectBottom = last.getBoundingClientRect().bottom;
  const top = Math.max(0, document.querySelector('[data-editor-bar]')?.getBoundingClientRect().bottom ?? 0) + 12;
  const bottom = window.innerHeight - 12;
  if (rectTop < top) window.scrollBy({ top: rectTop - top });
  // 아래로 나가면 내리되, 덩어리가 화면보다 길면 위 끝이 막대 밑으로 들어가지 않을 만큼만
  else if (rectBottom > bottom) window.scrollBy({ top: Math.min(rectBottom - bottom, rectTop - top) });
}

export const MoveBlock = Extension.create({
  name: 'moveBlock',

  addKeyboardShortcuts() {
    const run = (direction: 'up' | 'down') => {
      const tr = moveBlockTr(this.editor.state, direction);
      if (!tr) {
        announce(direction === 'up' ? '맨 위라 더 옮길 수 없어요' : '맨 아래라 더 옮길 수 없어요');
        return true;
      }
      const view = this.editor.view;
      view.dispatch(tr);
      // 문단은 바로 그려져서 곧바로 재고, 템플릿은 옮긴 자리에 한 박자 뒤에 다시 그려질 수 있어서 다음 화면에서 한 번 더
      keepVisible(view);
      requestAnimationFrame(() => {
        if (!this.editor.isDestroyed) keepVisible(view);
      });
      announce(direction === 'up' ? '위로 옮겼어요' : '아래로 옮겼어요');
      return true;
    };
    return {
      'Alt-ArrowUp': () => run('up'),
      'Alt-ArrowDown': () => run('down'),
    };
  },
});

import { TextSelection } from '@tiptap/pm/state';
import { Extension, type Editor } from '@tiptap/react';
import { announce } from '@/lib/announce';
import { nextQuote } from '@/lib/quotes';

// 회차 에디터 '따옴표로 감싸기': ⌘' (Ctrl+')로 고른 글을 “ ”로 감싸고, 다시 누르면 ‘ ’ → 「 」 → 『 』 → 벗기기 (계산은 lib/quotes.ts).
// 감싼 뒤에는 따옴표까지 고른 채로 둬서 이어서 누르면 바로 다음 짝으로. 아무것도 안 골랐으면 빈 “ ”를 넣고 커서를 가운데에.
// 한 문단 안에서만 (여러 문단에 걸쳐 고르면 알려 주고 그대로)

/** 고른 범위를 글로 (문단 안 줄바꿈 같은 글자 아닌 것도 한 칸으로 세서 위치와 글자 수가 맞게) */
function selectedText(editor: Editor, from: number, to: number): string {
  return editor.state.doc.textBetween(from, to, '\n', '￼');
}

function wrapQuotes(editor: Editor): boolean {
  const { state, view } = editor;
  const { selection } = state;
  if (!(selection instanceof TextSelection)) return false;
  const { from, to, $from, $to } = selection;
  if ($from.parent !== $to.parent || !$from.parent.isTextblock) {
    announce('한 문단 안의 글을 골라 주세요');
    return true;
  }
  const text = selectedText(editor, from, to);
  const before = from > $from.start() ? selectedText(editor, from - 1, from) : '';
  const after = to < $to.end() ? selectedText(editor, to, to + 1) : '';
  const action = nextQuote(text, before, after);
  const tr = state.tr;
  let anchor: number;
  let head: number;
  if (action.kind === 'wrap') {
    tr.insertText(action.close, to).insertText(action.open, from);
    // 감싼 글을 따옴표까지 고른 채로 (빈 곳이었으면 커서를 가운데에)
    anchor = selection.empty ? from + action.open.length : from;
    head = selection.empty ? anchor : to + action.open.length + action.close.length;
  } else if (action.kind === 'inside') {
    tr.insertText(action.close, to - 1, to).insertText(action.open, from, from + 1);
    anchor = from;
    head = to - 2 + action.open.length + action.close.length;
  } else {
    tr.insertText(action.close, to, to + 1).insertText(action.open, from - 1, from);
    const shift = action.open.length - 1;
    anchor = from + shift;
    head = to + shift;
  }
  tr.setSelection(TextSelection.create(tr.doc, anchor, head));
  view.dispatch(tr.scrollIntoView());
  announce(action.open ? `${action.open} ${action.close}로 감쌌어요` : '따옴표를 벗겼어요');
  return true;
}

export const QuoteWrap = Extension.create({
  name: 'quoteWrap',

  addKeyboardShortcuts() {
    return {
      "Mod-'": () => wrapQuotes(this.editor),
    };
  },
});

import type { Mark, Node as PMNode } from '@tiptap/pm/model';
import { TextSelection, type EditorState, type Transaction } from '@tiptap/pm/state';
import { nextQuote } from '@/lib/quotes';

// 회차 에디터 '따옴표로 감싸기'(⌘')의 문서 바꾸기. 어떤 짝을 쓸지는 lib/quotes.ts의 nextQuote, 여기서는 넣고 바꾸고 고르기만.
// - 새로 감쌀 때 따옴표 짝은 고른 글 전체에 공통인 글자 모양을 입는다: 굵은 '안녕'을 감싸면 “안녕”이 짝째로 굵게,
//   일부만 굵으면 짝 둘 다 보통 (따옴표마다 바로 옆 글자 모양을 따라가면 “는 보통·”는 굵게처럼 짝이 어긋나서)
// - 아무것도 안 골랐으면 빈 “ ”를 넣고 커서를 가운데에 (글자 모양은 그 자리 것 그대로)
// - 이미 있는 짝을 바꾸거나 벗길 때는 그 따옴표 자리의 모양 그대로
// - 감싼 뒤에는 따옴표까지 고른 채로 둬서 이어서 누르면 바로 다음 짝으로

/** 고른 범위의 모든 글 조각에 공통으로 걸린 글자 모양 */
export function sharedMarks(doc: PMNode, from: number, to: number): readonly Mark[] {
  const sets: Array<readonly Mark[]> = [];
  doc.nodesBetween(from, to, (node) => {
    if (node.isText) sets.push(node.marks);
  });
  const [first = [], ...rest] = sets;
  return first.filter((mark) => rest.every((set) => mark.isInSet(set)));
}

/** 고른 범위를 글로 (문단 안 줄바꿈 같은 글자 아닌 것도 한 칸으로 세서 위치와 글자 수가 맞게) */
function textOf(doc: PMNode, from: number, to: number): string {
  return doc.textBetween(from, to, '\n', '￼');
}

export type QuoteWrapResult = { tr: Transaction | null; message: string };

/** 글을 고른 상태(TextSelection)가 아니면 null — 템플릿을 고른 상태 등에서는 단축키를 그냥 넘긴다 */
export function quoteWrapTr(state: EditorState): QuoteWrapResult | null {
  const { selection, doc, schema } = state;
  if (!(selection instanceof TextSelection)) return null;
  const { from, to, $from, $to } = selection;
  if ($from.parent !== $to.parent || !$from.parent.isTextblock) return { tr: null, message: '한 문단 안의 글을 골라 주세요' };

  const text = textOf(doc, from, to);
  const before = from > $from.start() ? textOf(doc, from - 1, from) : '';
  const after = to < $to.end() ? textOf(doc, to, to + 1) : '';
  const action = nextQuote(text, before, after);
  const tr = state.tr;
  let anchor: number;
  let head: number;
  if (action.kind === 'wrap' && selection.empty) {
    tr.insertText(action.close, to).insertText(action.open, from);
    anchor = from + action.open.length;
    head = anchor;
  } else if (action.kind === 'wrap') {
    const marks = sharedMarks(doc, from, to);
    tr.insert(to, schema.text(action.close, marks)).insert(from, schema.text(action.open, marks));
    anchor = from;
    head = to + action.open.length + action.close.length;
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
  return { tr: tr.scrollIntoView(), message: action.open ? `${action.open} ${action.close}로 감쌌어요` : '따옴표를 벗겼어요' };
}

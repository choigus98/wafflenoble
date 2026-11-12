import type { Node as PMNode } from '@tiptap/pm/model';
import { NodeSelection, TextSelection, type EditorState, type Transaction } from '@tiptap/pm/state';

// 회차 에디터 '문단 옮기기·복제'의 계산: 커서가 있는 문단(고른 템플릿도)을 바로 위·아래 덩어리와 자리를 바꾸거나, 위·아래에 복사한다.
// - 본문 맨 위 덩어리 단위로 옮긴다: 인용 안 문단이면 인용째로, 여러 문단에 걸쳐 고르면 그 문단들을 한꺼번에
// - 커서·고른 것은 옮긴 덩어리를 따라가고, 되돌리기 한 번이면 제자리 (템플릿 ⋯ 메뉴의 '위로·아래로 옮기기'와 같은 규칙)
// - 문서 끝의 빈 문단과는 자리를 바꾸지 않는다 (에디터가 끝에 빈 문단을 늘 하나 두어서, 바꾸면 빈 문단이 또 생김)
// 에디터(DOM) 없이 계산만 해서 테스트할 수 있다

/** 선택이 걸친 본문 맨 위 덩어리 순번 [start, end] */
export function topBlockRange(doc: PMNode, from: number, to: number): { start: number; end: number } {
  const last = doc.childCount - 1;
  const start = Math.min(doc.resolve(from).index(0), last);
  const end = Math.min(Math.max(start, doc.resolve(Math.max(from, to - 1)).index(0)), last);
  return { start, end };
}

/** 바로 위·아래 덩어리와 자리를 바꾼 트랜잭션 (못 옮기면 null). 앞 덩어리를 빼서 뒤에 넣는 식이라 선택이 저절로 따라간다 */
export function moveBlockTr(state: EditorState, direction: 'up' | 'down'): Transaction | null {
  const { doc, selection } = state;
  if (doc.childCount < 2) return null;
  const { start, end } = topBlockRange(doc, selection.from, selection.to);
  const posAt = (index: number) => {
    let pos = 0;
    for (let i = 0; i < index; i += 1) pos += doc.child(i).nodeSize;
    return pos;
  };
  const tr = state.tr;
  if (direction === 'up') {
    if (start === 0) return null;
    const prev = doc.child(start - 1);
    const prevPos = posAt(start - 1);
    tr.delete(prevPos, prevPos + prev.nodeSize);
    tr.insert(posAt(end + 1) - prev.nodeSize, prev);
    return tr;
  }
  const last = doc.childCount - 1;
  if (end >= last) return null;
  const next = doc.child(end + 1);
  if (end + 1 === last && next.isTextblock && next.content.size === 0) return null;
  const nextPos = posAt(end + 1);
  tr.delete(nextPos, nextPos + next.nodeSize);
  tr.insert(posAt(start), next);
  return tr;
}

/**
 * 고른 덩어리들을 복사해서 아래(down) 또는 위(up)에 넣은 트랜잭션. 커서·고른 것은 그 방향의 복사본으로 간다
 * (아래로 복사하면 아래 것, 위로 복사하면 위 것 — 이어서 누르면 그쪽으로 계속 늘어남).
 * renew: 덩어리를 복사할 때 바꿀 것 (템플릿은 편집용 번호를 새로)
 */
export function duplicateBlockTr(state: EditorState, direction: 'up' | 'down', renew: (block: PMNode) => PMNode = (block) => block): Transaction | null {
  const { doc, selection } = state;
  if (doc.childCount === 0) return null;
  const { start, end } = topBlockRange(doc, selection.from, selection.to);
  let rangeStart = 0;
  for (let i = 0; i < start; i += 1) rangeStart += doc.child(i).nodeSize;
  const copies: PMNode[] = [];
  let size = 0;
  for (let i = start; i <= end; i += 1) {
    copies.push(renew(doc.child(i)));
    size += doc.child(i).nodeSize;
  }
  const tr = state.tr.insert(direction === 'down' ? rangeStart + size : rangeStart, copies);
  // 아래로 복사하면 같은 자리에서 복사본 크기만큼 뒤, 위로 복사하면 원래 자리(이제 복사본)
  const shift = direction === 'down' ? size : 0;
  if (selection instanceof NodeSelection) tr.setSelection(NodeSelection.create(tr.doc, selection.from + shift));
  else if (selection instanceof TextSelection) tr.setSelection(TextSelection.create(tr.doc, selection.anchor + shift, selection.head + shift));
  return tr;
}

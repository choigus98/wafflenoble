import { Schema, type Node as PMNode } from '@tiptap/pm/model';
import { EditorState, NodeSelection, TextSelection, type Selection } from '@tiptap/pm/state';
import { describe, expect, it } from 'vitest';
import { duplicateBlockTr, moveBlockTr, topBlockRange } from '@/lib/move-block';

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { group: 'block', content: 'inline*' },
    blockquote: { group: 'block', content: 'paragraph+' },
    storyBlock: { group: 'block', atom: true, attrs: { kind: { default: null } } },
    text: { group: 'inline' },
  },
});
const p = (text: string) => schema.node('paragraph', null, text ? [schema.text(text)] : []);
// 위치: 하나 0~4 · 둘 4~7 · 템플릿 7 · 인용 8~14 · 넷 14~17 · 끝의 빈 문단 17~19
const doc = schema.node('doc', null, [p('하나'), p('둘'), schema.node('storyBlock', { kind: 'kakao' }), schema.node('blockquote', null, [p('인용')]), p('넷'), p('')]);
const names = (node: PMNode) => {
  const list: string[] = [];
  node.forEach((child) => list.push(child.type.name === 'storyBlock' ? '[템플릿]' : child.type.name === 'blockquote' ? `>${child.textContent}` : child.textContent || '(빈)'));
  return list;
};
const run = (selection: (d: PMNode) => Selection, direction: 'up' | 'down') => {
  const state = EditorState.create({ doc, selection: selection(doc) });
  const tr = moveBlockTr(state, direction);
  return tr ? state.apply(tr) : null;
};

describe('문단 옮기기', () => {
  it('커서가 있는 문단을 위·아래 덩어리와 바꾸고, 커서는 그 문단의 같은 자리를 따라감', () => {
    const up = run((d) => TextSelection.create(d, 6), 'up')!;
    expect(names(up.doc)).toEqual(['둘', '하나', '[템플릿]', '>인용', '넷', '(빈)']);
    expect([up.selection.$head.parent.textContent, up.selection.$head.parentOffset]).toEqual(['둘', 1]);
    const down = run((d) => TextSelection.create(d, 6), 'down')!;
    expect(names(down.doc)).toEqual(['하나', '[템플릿]', '둘', '>인용', '넷', '(빈)']);
    expect(down.selection.$head.parent.textContent).toBe('둘');
  });

  it('고른 템플릿은 고른 채로, 인용 안 문단은 인용째로, 여러 문단을 고르면 한꺼번에', () => {
    const template = run((d) => NodeSelection.create(d, 7), 'up')!;
    expect(names(template.doc)).toEqual(['하나', '[템플릿]', '둘', '>인용', '넷', '(빈)']);
    expect(template.selection instanceof NodeSelection && template.selection.node.type.name).toBe('storyBlock');
    const quote = run((d) => TextSelection.create(d, 10), 'up')!;
    expect(names(quote.doc)).toEqual(['하나', '둘', '>인용', '[템플릿]', '넷', '(빈)']);
    const many = run((d) => TextSelection.create(d, 2, 6), 'down')!;
    expect(names(many.doc)).toEqual(['[템플릿]', '하나', '둘', '>인용', '넷', '(빈)']);
    expect(many.doc.textBetween(many.selection.from, many.selection.to)).toBe('나둘');
    expect(topBlockRange(doc, 2, 6)).toEqual({ start: 0, end: 1 });
  });

  it('맨 위에서 위로 · 맨 아래에서 아래로는 못 옮기고, 끝의 빈 문단과도 안 바꿈 (가운데 빈 문단과는 바꿈)', () => {
    expect(run((d) => TextSelection.create(d, 1), 'up')).toBeNull();
    expect(run((d) => TextSelection.create(d, 15), 'down')).toBeNull();
    expect(run((d) => TextSelection.create(d, 18), 'down')).toBeNull();
    const withGap = schema.node('doc', null, [p('가'), p(''), p('나'), p('')]);
    const state = EditorState.create({ doc: withGap, selection: TextSelection.create(withGap, 1) });
    expect(names(state.apply(moveBlockTr(state, 'down')!).doc)).toEqual(['(빈)', '가', '나', '(빈)']);
  });
});

describe('문단 복제', () => {
  it('아래로 복사하면 커서가 아래 복사본의 같은 자리로, 위로 복사하면 위 복사본으로', () => {
    const state = EditorState.create({ doc, selection: TextSelection.create(doc, 6) });
    const down = state.apply(duplicateBlockTr(state, 'down')!);
    expect(names(down.doc)).toEqual(['하나', '둘', '둘', '[템플릿]', '>인용', '넷', '(빈)']);
    expect(down.selection.from).toBe(9); // 둘째 '둘'(7~10) 안 같은 자리
    expect([down.selection.$head.parent.textContent, down.selection.$head.index(0)]).toEqual(['둘', 2]);
    const up = state.apply(duplicateBlockTr(state, 'up')!);
    expect(names(up.doc)).toEqual(['하나', '둘', '둘', '[템플릿]', '>인용', '넷', '(빈)']);
    expect(up.selection.$head.index(0)).toBe(1);
  });

  it('고른 템플릿은 복사본이 골라지고 renew로 바꾼 속성, 여러 문단은 한꺼번에', () => {
    const state = EditorState.create({ doc, selection: NodeSelection.create(doc, 7) });
    const renew = (block: PMNode) => (block.type.name === 'storyBlock' ? block.type.create({ kind: 'kakao-copy' }) : block);
    const copied = state.apply(duplicateBlockTr(state, 'down', renew)!);
    expect(names(copied.doc)).toEqual(['하나', '둘', '[템플릿]', '[템플릿]', '>인용', '넷', '(빈)']);
    expect(copied.selection instanceof NodeSelection && [copied.selection.from, copied.selection.node.attrs.kind]).toEqual([8, 'kakao-copy']);
    const many = EditorState.create({ doc, selection: TextSelection.create(doc, 2, 6) });
    const both = many.apply(duplicateBlockTr(many, 'down')!);
    expect(names(both.doc)).toEqual(['하나', '둘', '하나', '둘', '[템플릿]', '>인용', '넷', '(빈)']);
    expect(both.doc.textBetween(both.selection.from, both.selection.to)).toBe('나둘');
    expect(both.selection.$from.index(0)).toBe(2);
  });
});

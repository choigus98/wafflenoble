import { Schema } from '@tiptap/pm/model';
import { EditorState } from '@tiptap/pm/state';
import { describe, expect, it } from 'vitest';
import { findMatches } from '@/lib/find';

// 에디터와 같은 모양의 작은 스키마: 문단, 줄바꿈, 굵게, 그리고 글이 속성에만 있는 템플릿 블록
const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { group: 'block', content: 'inline*' },
    storyBlock: { group: 'block', atom: true, attrs: { data: { default: null } } },
    text: { group: 'inline' },
    hardBreak: { group: 'inline', inline: true },
  },
  marks: { bold: {} },
});

const p = (...parts: Array<string | ReturnType<typeof schema.text> | ReturnType<typeof schema.node>>) =>
  schema.node('paragraph', null, parts.map((part) => (typeof part === 'string' ? schema.text(part) : part)));

const doc = schema.node('doc', null, [
  p('지은은 문을 열었다. 지은이 웃었다.'),
  p('그날 ', schema.text('지', [schema.mark('bold')]), '은의 우산은 Blue였다.', schema.node('hardBreak'), '지은 다음 줄'),
  schema.node('storyBlock', { data: { script: '지은: 템플릿 안 대사' } }),
  p('blue BLUE'),
]);

const textAt = (from: number, to: number) => doc.textBetween(from, to);

describe('본문 찾기', () => {
  it('문단마다 모두 찾고, 굵게로 나뉜 글자도 이어서 찾는다', () => {
    const matches = findMatches(doc, '지은');
    expect(matches).toHaveLength(4);
    for (const match of matches) expect(textAt(match.from, match.to)).toBe('지은');
  });

  it('템플릿 블록 안의 글은 찾지 않는다', () => {
    expect(findMatches(doc, '템플릿 안')).toEqual([]);
  });

  it('줄바꿈 뒤의 위치도 정확하다', () => {
    const last = findMatches(doc, '다음 줄')[0];
    expect(textAt(last.from, last.to)).toBe('다음 줄');
  });

  it('영문 대소문자는 가리지 않는다', () => {
    expect(findMatches(doc, 'blue').map((match) => textAt(match.from, match.to))).toEqual(['Blue', 'blue', 'BLUE']);
  });

  it('빈 검색어는 아무것도 찾지 않는다', () => {
    expect(findMatches(doc, '')).toEqual([]);
  });

  it('뒤에서부터 바꾸면 한 번에 모두 바뀌고 굵게도 유지된다', () => {
    const state = EditorState.create({ schema, doc });
    const tr = state.tr;
    for (const match of [...findMatches(doc, '지은')].reverse()) tr.insertText('수진', match.from, match.to);
    const next = tr.doc;
    expect(findMatches(next, '지은')).toEqual([]);
    expect(findMatches(next, '수진')).toHaveLength(4);
    // 템플릿 데이터는 그대로
    expect(next.child(2).attrs.data).toEqual({ script: '지은: 템플릿 안 대사' });
    // '지'만 굵었던 곳은 두 글자 모두에 걸친 굵게가 없으므로 굵게 없이 바뀐다 (글자가 사라지지 않음)
    expect(next.child(1).textContent).toContain('그날 수진의 우산은');
  });
});

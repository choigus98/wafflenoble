import { Schema } from '@tiptap/pm/model';
import { EditorState } from '@tiptap/pm/state';
import { describe, expect, it } from 'vitest';
import { polishPunctuation, punctuationEdits } from '@/lib/punctuation';

describe('문장 부호 다듬기 (글)', () => {
  it('점 세 개마다 … 하나', () => {
    expect(polishPunctuation('그래서... 그랬지')).toBe('그래서… 그랬지');
    expect(polishPunctuation('......음')).toBe('……음');
    expect(polishPunctuation('....')).toBe('….');
    expect(polishPunctuation('끝..')).toBe('끝..');
  });

  it('큰따옴표: 앞이 비었거나 띄어쓰기·괄호면 여는 따옴표', () => {
    expect(polishPunctuation('"안녕" 그가 말했다. "또 봐!"')).toBe('“안녕” 그가 말했다. “또 봐!”');
    expect(polishPunctuation('(“이미 둥근” 따옴표)')).toBe('(“이미 둥근” 따옴표)');
    expect(polishPunctuation('그는 "정말?"이라고')).toBe('그는 “정말?”이라고');
  });

  it("작은따옴표와 글자 사이의 '는 ’", () => {
    expect(polishPunctuation("'혼잣말'이었다. don't")).toBe('‘혼잣말’이었다. don’t');
  });

  it('바꿀 게 없으면 그대로', () => {
    expect(polishPunctuation('“이미 다듬은 글…”')).toBe('“이미 다듬은 글…”');
  });
});

// 에디터와 같은 모양의 작은 스키마 (lib/find.test.ts와 같음)
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

describe('문장 부호 다듬기 (문서)', () => {
  const doc = schema.node('doc', null, [
    p('"어디', schema.text(' 가?"', [schema.mark('bold')]), ' 그녀가 물었다...'),
    p('줄', schema.node('hardBreak'), '"바꿈 뒤"'),
    schema.node('storyBlock', { data: { script: '지은: "템플릿 안"...' } }),
  ]);

  it('뒤에서부터 한 번에 바꾸면 굵게·줄바꿈·템플릿은 그대로', () => {
    const edits = punctuationEdits(doc);
    expect(edits).toHaveLength(5);
    const state = EditorState.create({ schema, doc });
    const tr = state.tr;
    for (const edit of [...edits].reverse()) tr.insertText(edit.text, edit.from, edit.to);
    const next = tr.doc;
    expect(next.child(0).textContent).toBe('“어디 가?” 그녀가 물었다…');
    // 굵게였던 ' 가?”'는 여전히 굵게
    expect(next.child(0).child(1).marks.map((mark) => mark.type.name)).toEqual(['bold']);
    expect(next.child(0).child(1).text).toBe(' 가?”');
    // 줄바꿈 뒤 따옴표는 여는 따옴표
    expect(next.child(1).textContent).toBe('줄“바꿈 뒤”');
    // 템플릿 데이터는 손대지 않음
    expect(next.child(2).attrs.data).toEqual({ script: '지은: "템플릿 안"...' });
    // 다시 다듬어도 바뀔 게 없음
    expect(punctuationEdits(next)).toEqual([]);
  });
});

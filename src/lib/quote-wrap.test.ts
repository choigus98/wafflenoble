import { type Mark, Schema, type Node as PMNode } from '@tiptap/pm/model';
import { EditorState, NodeSelection, TextSelection, type Selection } from '@tiptap/pm/state';
import { describe, expect, it } from 'vitest';
import { quoteWrapTr, sharedMarks } from '@/lib/quote-wrap';

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { group: 'block', content: 'inline*' },
    storyBlock: { group: 'block', atom: true },
    hardBreak: { group: 'inline', inline: true, selectable: false },
    text: { group: 'inline' },
  },
  marks: { bold: {}, italic: {} },
});
const b = schema.marks.bold.create();
const i = schema.marks.italic.create();
const t = (text: string, marks: Mark[] = []) => schema.text(text, marks);
const p = (...content: PMNode[]) => schema.node('paragraph', null, content);
// 위치: ① 0~12 ('그녀가 ' 1~5 · 굵은 '안녕' 5~7 · ' 했다.' 7~11) · ② 12~24 ('그가 ' 13~16 · 굵고 기운 '정말' 16~18)
//       ③ 24~34 ('첫 줄' 25~28 · 줄바꿈 28 · '둘째 줄' 29~33) · 템플릿 34 · ④ 35~39 ('끝.')
const doc = schema.node('doc', null, [
  p(t('그녀가 '), t('안녕', [b]), t(' 했다.')),
  p(t('그가 '), t('정말', [b, i]), t(' 물었다.')),
  p(t('첫 줄'), schema.node('hardBreak'), t('둘째 줄')),
  schema.node('storyBlock'),
  p(t('끝.')),
]);
/** 문단을 <b>·<i> 표시가 든 글로 */
const show = (node: PMNode) => {
  let html = '';
  node.forEach((child) => {
    if (child.type.name === 'hardBreak') {
      html += '<br>';
      return;
    }
    let text = child.text ?? '';
    for (const mark of [...child.marks].reverse()) {
      const tag = mark.type.name === 'bold' ? 'b' : 'i';
      text = `<${tag}>${text}</${tag}>`;
    }
    html += text;
  });
  return html;
};
const press = (state: EditorState) => {
  const result = quoteWrapTr(state);
  return { result, state: result?.tr ? state.apply(result.tr) : state };
};
const at = (selection: (d: PMNode) => Selection) => EditorState.create({ doc, selection: selection(doc) });
const selected = (state: EditorState) => state.doc.textBetween(state.selection.from, state.selection.to, '\n', '￼');

describe('따옴표로 감싸기 (문서 바꾸기)', () => {
  it('굵은 글을 감싸면 따옴표 짝도 함께 굵게, 다시 누르면 짝만 바뀌고 굵기는 그대로', () => {
    const first = press(at((d) => TextSelection.create(d, 5, 7)));
    expect(show(first.state.doc.child(0))).toBe('그녀가 <b>“안녕”</b> 했다.');
    expect(selected(first.state)).toBe('“안녕”');
    expect(first.result?.message).toBe('“ ”로 감쌌어요');
    const second = press(first.state);
    expect(show(second.state.doc.child(0))).toBe('그녀가 <b>‘안녕’</b> 했다.');
  });

  it('굵고 기운 글은 둘 다, 일부만 굵으면 짝 둘 다 보통 (짝이 어긋나지 않게)', () => {
    expect(show(press(at((d) => TextSelection.create(d, 16, 18))).state.doc.child(1))).toBe('그가 <b><i>“정말”</i></b> 물었다.');
    expect(show(press(at((d) => TextSelection.create(d, 3, 7))).state.doc.child(0))).toBe('그녀“가 <b>안녕</b>” 했다.');
    expect(sharedMarks(doc, 3, 7)).toEqual([]);
    expect(sharedMarks(doc, 16, 18).map((mark) => mark.type.name)).toEqual(['bold', 'italic']);
  });

  it('아무것도 안 고르면 그 자리 모양으로 빈 짝, 커서는 가운데', () => {
    const { state } = press(at((d) => TextSelection.create(d, 6)));
    expect(show(state.doc.child(0))).toBe('그녀가 <b>안“”녕</b> 했다.');
    expect([state.selection.empty, state.selection.from]).toEqual([true, 7]);
  });

  it('문단 안 줄바꿈에 걸쳐도 짝이 제자리에, 템플릿을 고른 상태면 넘기고, 여러 문단이면 알려만 줌', () => {
    const across = press(at((d) => TextSelection.create(d, 27, 31)));
    expect(show(across.state.doc.child(2))).toBe('첫 “줄<br>둘째” 줄');
    expect(selected(across.state)).toBe('“줄￼둘째”');
    expect(quoteWrapTr(at((d) => NodeSelection.create(d, 34)))).toBeNull();
    expect(quoteWrapTr(at((d) => TextSelection.create(d, 3, 14)))).toEqual({ tr: null, message: '한 문단 안의 글을 골라 주세요' });
  });
});

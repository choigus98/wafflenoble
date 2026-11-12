import { Schema } from '@tiptap/pm/model';
import { describe, expect, it } from 'vitest';
import { dialogueLines, filterDialogue } from '@/lib/dialogue';

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { group: 'block', content: 'inline*' },
    blockquote: { group: 'block', content: 'paragraph+' },
    storyBlock: { group: 'block', atom: true, attrs: { kind: { default: null }, data: { default: null } } },
    text: { group: 'inline' },
    hardBreak: { group: 'inline', inline: true },
  },
});
const p = (text: string) => schema.node('paragraph', null, text ? [schema.text(text)] : []);

describe('대사 모아 보기', () => {
  const doc = schema.node('doc', null, [
    p('지은은 문을 열었다.'),
    p('“어서 와.” 할머니가 말했다.'),
    p(''),
    schema.node('storyBlock', { kind: 'kakao', data: {} }),
    schema.node('paragraph', null, [schema.text('"첫 줄'), schema.node('hardBreak'), schema.text('둘째 줄"')]),
    schema.node('blockquote', null, [p('「편지 속 대사」')]),
    p('  ‘혼잣말’  '),
  ]);

  it('따옴표로 시작하는 문단만 앞에서부터 (인용 안 문단도, 줄바꿈은 한 칸)', () => {
    const lines = dialogueLines(doc);
    expect(lines.map((line) => line.text)).toEqual(['“어서 와.” 할머니가 말했다.', '"첫 줄 둘째 줄"', '「편지 속 대사」', '‘혼잣말’']);
    // 자리: 그 문단 노드 바로 앞
    expect(doc.nodeAt(lines[0].pos)?.textContent).toBe('“어서 와.” 할머니가 말했다.');
    expect(doc.nodeAt(lines[2].pos)?.type.name).toBe('paragraph');
  });

  it('낱말·초성으로 거르기, 빈 칸이면 전부', () => {
    const lines = dialogueLines(doc);
    expect(filterDialogue(lines, '할머니').map((line) => line.text)).toEqual(['“어서 와.” 할머니가 말했다.']);
    expect(filterDialogue(lines, 'ㅍㅈ').map((line) => line.text)).toEqual(['「편지 속 대사」']);
    expect(filterDialogue(lines, '  ')).toHaveLength(4);
  });
});

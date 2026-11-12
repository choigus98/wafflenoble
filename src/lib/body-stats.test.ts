import { Schema } from '@tiptap/pm/model';
import { describe, expect, it } from 'vitest';
import { bodyStats, dialogueShare } from '@/lib/body-stats';

// 에디터와 같은 모양의 작은 스키마: 문단, 인용, 장면 전환, 줄바꿈, 글이 속성에만 있는 템플릿 블록
const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { group: 'block', content: 'inline*' },
    blockquote: { group: 'block', content: 'paragraph+' },
    horizontalRule: { group: 'block' },
    storyBlock: { group: 'block', atom: true, attrs: { data: { default: null } } },
    text: { group: 'inline' },
    hardBreak: { group: 'inline', inline: true },
  },
});
const p = (text = '') => schema.node('paragraph', null, text ? [schema.text(text)] : []);

describe('본문 통계', () => {
  it('글이 든 문단만 세고, 따옴표로 시작하면 대사', () => {
    const doc = schema.node('doc', null, [
      p('"어디 가?" 그녀가 물었다.'),
      p(),
      p('   “응.”'),
      p('지은은 웃었다.'),
      p("'혼잣말'"),
      p('「편지」'),
      p('『책 제목』을 펼쳤다.'),
      schema.node('horizontalRule'),
      schema.node('blockquote', null, [p('인용 문단'), p('"인용 속 대사"')]),
    ]);
    expect(bodyStats(doc)).toEqual({ paragraphs: 8, dialogue: 6, templates: 0 });
  });

  it('템플릿은 따로 세고 안의 글은 문단으로 안 셈', () => {
    const doc = schema.node('doc', null, [p('앞'), schema.node('storyBlock', { data: { script: '"대사"' } }), schema.node('storyBlock'), p('뒤')]);
    expect(bodyStats(doc)).toEqual({ paragraphs: 2, dialogue: 0, templates: 2 });
  });

  it('대사 비율: 반올림, 문단이 없으면 0', () => {
    expect(dialogueShare({ paragraphs: 3, dialogue: 1, templates: 0 })).toBe(33);
    expect(dialogueShare({ paragraphs: 0, dialogue: 0, templates: 1 })).toBe(0);
  });
});

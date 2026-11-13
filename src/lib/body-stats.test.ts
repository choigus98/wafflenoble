import { Schema } from '@tiptap/pm/model';
import { describe, expect, it } from 'vitest';
import { bodyStats, charCounts, dialogueShare, rangeCharCounts } from '@/lib/body-stats';

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

describe('글자수 · 고른 글 글자수', () => {
  // 위치: 문단 0~8('안녕 하세요' 1~7) · 템플릿 8~9 · 문단 9~18('둘째😀' 10~14 — 😀는 두 칸, 줄바꿈 14, ' 줄' 15~17)
  const doc = schema.node('doc', null, [
    p('안녕 하세요'),
    schema.node('storyBlock', { data: '{"text":"템플릿 글"}' }),
    schema.node('paragraph', null, [schema.text('둘째😀'), schema.node('hardBreak'), schema.text(' 줄')]),
  ]);

  it('글자 단위로, 공백 포함 · 제외', () => {
    expect(charCounts('안녕 하세요')).toEqual({ all: 6, noSpace: 5 });
    expect(charCounts('😀 a\n')).toEqual({ all: 4, noSpace: 2 });
    expect(charCounts('')).toEqual({ all: 0, noSpace: 0 });
  });

  it('고른 범위는 본문 글자수와 같은 셈 (문단 사이 · 템플릿 안의 글은 안 셈), 전체를 고르면 본문 글자수와 같음', () => {
    expect(rangeCharCounts(doc, 1, 3)).toEqual({ all: 2, noSpace: 2 });
    // 첫 문단 '하세요'부터 둘째 문단 '둘째😀'까지: 하세요(3) + 둘째😀(3) — 문단 사이 줄바꿈 · 템플릿은 안 셈
    expect(rangeCharCounts(doc, 4, 14)).toEqual({ all: 6, noSpace: 6 });
    expect(rangeCharCounts(doc, 0, doc.content.size)).toEqual(charCounts(doc.textContent));
  });

  it('고른 게 없거나 템플릿만 골랐으면 없음', () => {
    expect(rangeCharCounts(doc, 3, 3)).toBeNull();
    expect(rangeCharCounts(doc, 8, 9)).toBeNull();
  });
});

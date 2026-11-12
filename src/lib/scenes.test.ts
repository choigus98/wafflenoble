import { Schema } from '@tiptap/pm/model';
import { describe, expect, it } from 'vitest';
import { firstSentence, sceneIndexAt, sceneOutline } from '@/lib/scenes';
import { createTemplate } from '@/lib/story-blocks';

// 에디터와 같은 모양의 작은 스키마
const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { group: 'block', content: 'inline*' },
    blockquote: { group: 'block', content: 'paragraph+' },
    horizontalRule: { group: 'block' },
    storyBlock: { group: 'block', atom: true, attrs: { kind: { default: null }, data: { default: null } } },
    text: { group: 'inline' },
    hardBreak: { group: 'inline', inline: true },
  },
});
const p = (text = '') => schema.node('paragraph', null, text ? [schema.text(text)] : []);
const hr = () => schema.node('horizontalRule');
const kakao = createTemplate('kakao-dm');
const block = () => schema.node('storyBlock', { kind: kakao.kind, data: kakao.data });

describe('장면 바로가기', () => {
  it('첫 문장: 문장 끝(닫는 따옴표까지)에서 자르고, 길면 40자 + …', () => {
    expect(firstSentence('"정말 여기가 맞아?" 수진이 물었다.')).toBe('"정말 여기가 맞아?"');
    expect(firstSentence('  밤이 깊었다. 골목은 조용했다.')).toBe('밤이 깊었다.');
    expect(firstSentence('마침표 없이 끝나는 문장')).toBe('마침표 없이 끝나는 문장');
    expect(firstSentence('가'.repeat(50))).toBe(`${'가'.repeat(40)}…`);
    expect(firstSentence('3.5초 뒤에 문이 열렸다.')).toBe('3.5초 뒤에 문이 열렸다.');
  });

  it('장면 전환으로 나누고, 장면마다 첫 문장 · 글자 수 · 바로가기 자리', () => {
    const doc = schema.node('doc', null, [p(), p('첫 장면이다. 둘째 문장.'), p('더'), hr(), block(), p('템플릿 뒤 문장.'), hr(), p('마지막.')]);
    const scenes = sceneOutline(doc);
    expect(scenes.map(({ number, lead, chars }) => ({ number, lead, chars }))).toEqual([
      { number: 1, lead: '첫 장면이다.', chars: 15 },
      { number: 2, lead: '템플릿 뒤 문장.', chars: 9 },
      { number: 3, lead: '마지막.', chars: 4 },
    ]);
    // 바로가기 자리는 장면 첫 블록: 첫 장면은 맨 앞 빈 문단 안, 둘째 장면은 맨 앞 템플릿 (첫 문장은 그 뒤 문단에서)
    expect(scenes[0].target).toEqual({ pos: 1, kind: 'text' });
    expect(scenes[1].target.kind).toBe('node');
    expect(doc.nodeAt(scenes[1].target.pos)?.type.name).toBe('storyBlock');
    expect(doc.resolve(scenes[2].target.pos).parent.textContent).toBe('마지막.');
    expect(scenes[2].to).toBe(doc.content.size);
    // 장면 경계: 장면 전환 줄 위는 그 뒤 장면
    expect(sceneIndexAt(scenes, scenes[0].target.pos)).toBe(0);
    expect(sceneIndexAt(scenes, scenes[1].from - 1)).toBe(1);
    expect(sceneIndexAt(scenes, doc.content.size)).toBe(2);
  });

  it('글 없이 템플릿만 있으면 템플릿 이름, 아무것도 없으면 빈 장면 (맨 앞·연달은 장면 전환)', () => {
    const doc = schema.node('doc', null, [hr(), block(), hr(), hr(), schema.node('blockquote', null, [p(), p('인용 첫 줄.')])]);
    const scenes = sceneOutline(doc);
    expect(scenes.map(({ lead, target }) => [lead, target.kind])).toEqual([
      ['', 'near'],
      ['[카톡 1:1 대화]', 'node'],
      ['', 'node'],
      ['인용 첫 줄.', 'text'],
    ]);
    expect(doc.nodeAt(scenes[1].target.pos)?.type.name).toBe('storyBlock');
    // 빈 장면은 그 장면을 연 장면 전환 줄로, 그 줄 위에서 '지금'은 그 빈 장면
    expect(doc.nodeAt(scenes[2].target.pos)?.type.name).toBe('horizontalRule');
    expect(sceneIndexAt(scenes, scenes[2].target.pos)).toBe(2);
    // 인용으로 시작하는 장면: 인용 안 첫 문단 맨 앞
    const $target = doc.resolve(scenes[3].target.pos);
    expect([$target.parent.type.name, $target.node(-1).type.name]).toEqual(['paragraph', 'blockquote']);
  });

  it('장면 전환이 없으면 장면 하나', () => {
    const scenes = sceneOutline(schema.node('doc', null, [p('하나.'), p('둘.')]));
    expect(scenes).toHaveLength(1);
    expect(scenes[0]).toMatchObject({ number: 1, from: 0, lead: '하나.', chars: 5 });
  });
});

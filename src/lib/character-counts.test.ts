import { Schema } from '@tiptap/pm/model';
import { describe, expect, it } from 'vitest';
import { characterCounts, characterNames, charactersInTexts } from '@/lib/character-counts';
import { createTemplate } from '@/lib/story-blocks';

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { group: 'block', content: 'inline*' },
    storyBlock: { group: 'block', atom: true, attrs: { kind: { default: null }, data: { default: null } } },
    text: { group: 'inline' },
  },
});
const p = (text: string) => schema.node('paragraph', null, text ? [schema.text(text)] : []);
const kakao = createTemplate('kakao-dm');
if (kakao.kind !== 'kakao') throw new Error('카톡 템플릿이 아니에요');

describe('등장인물 횟수', () => {
  const doc = schema.node('doc', null, [
    p('지은은 문을 열었다. 지은이 웃었다.'),
    p('주인 할머니가 손을 흔들었다. 할머니는 말이 없었다.'),
    schema.node('storyBlock', { kind: 'kakao', data: { ...kakao.data, title: '단골', script: '지은: 어디야?\n나: 금방 가' } }),
    p('Mina가 들어왔다. MINA!'),
  ]);

  it('본문은 찾기와 같은 개수, 템플릿 안은 따로, 많이 나온 차례 · 안 나온 인물은 따로', () => {
    expect(characterCounts(doc, ['지은', '주인 할머니', '할머니', '수진', 'Mina'])).toEqual({
      appeared: [
        { name: '지은', body: 2, templates: 1 },
        { name: 'Mina', body: 2, templates: 0 },
        { name: '주인 할머니', body: 1, templates: 0 },
        // '주인 할머니' 안의 '할머니'는 빼고 혼자 나온 한 번만
        { name: '할머니', body: 1, templates: 0 },
      ],
      missing: ['수진'],
    });
  });

  it('이름 정리: 띄어쓰기 한 칸, 빈 이름·같은 이름(영문 대소문자 무시)은 한 번만', () => {
    expect(characterNames(['  주인   할머니 ', '', '지은', 'mina', 'Mina', '지은'])).toEqual(['주인 할머니', '지은', 'mina']);
    expect(characterCounts(doc, [])).toEqual({ appeared: [], missing: [] });
  });
});

describe('이 회차 등장인물 (열람 화면)', () => {
  it('나온 인물만 작품 정보에 적은 순서대로, 긴 이름 안의 짧은 이름은 안 침, 같은 이름은 처음 것만', () => {
    const texts = ['지은은 문을 열었다.\n주인 할머니가 손을 흔들었다.', '[카톡 1:1 대화]\n단골\nMINA: 어디야?'];
    const characters = [
      { name: '주인 할머니', description: '가게 주인' },
      { name: '할머니', description: '' },
      { name: '수진', description: '친구' },
      { name: ' 지은 ', description: '단골' },
      { name: 'Mina', description: '' },
      { name: '지은', description: '두 번째로 적은 지은' },
    ];
    expect(charactersInTexts(texts, characters)).toEqual([
      { name: '주인 할머니', description: '가게 주인' },
      { name: '지은', description: '단골' },
      { name: 'Mina', description: '' },
    ]);
    // 문단이 바뀌는 자리에서 이름이 이어 붙지 않게 줄을 바꿔 둔다 ('지' 끝 문단 + '은' 첫 문단)
    expect(charactersInTexts(['… 지\n은 …'], [{ name: '지은', description: '' }])).toEqual([]);
  });
});

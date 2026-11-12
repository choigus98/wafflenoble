import { describe, expect, it } from 'vitest';
import { parseCharacters } from '@/lib/characters';

describe('등장인물 소개', () => {
  it("한 줄에 한 명 '이름: 소개', 빈 줄은 건너뛴다", () => {
    expect(parseCharacters('지은: 골목 끝 와플 가게의 단골\n\n  주인 할머니 :  자정에만 문을 여는 가게 주인  \n')).toEqual([
      { name: '지은', description: '골목 끝 와플 가게의 단골' },
      { name: '주인 할머니', description: '자정에만 문을 여는 가게 주인' },
    ]);
  });

  it('첫 쌍점에서만 나누고, 전각 쌍점도 읽는다', () => {
    expect(parseCharacters('지은: 좋아하는 것: 와플\n수진： 지은의 친구')).toEqual([
      { name: '지은', description: '좋아하는 것: 와플' },
      { name: '수진', description: '지은의 친구' },
    ]);
  });

  it('이름만 적어도 된다', () => {
    expect(parseCharacters('수진\n민호:')).toEqual([
      { name: '수진', description: '' },
      { name: '민호', description: '' },
    ]);
  });

  it('목록 기호와 번호는 떼고, 줄바꿈이 \\r\\n이어도 같다', () => {
    expect(parseCharacters('- 지은: 단골\r\n· 수진: 친구\r\n• 민호\r\n1. 할머니: 주인\r\n2) 고양이')).toEqual([
      { name: '지은', description: '단골' },
      { name: '수진', description: '친구' },
      { name: '민호', description: '' },
      { name: '할머니', description: '주인' },
      { name: '고양이', description: '' },
    ]);
  });

  it('이름 자리가 비면 쌍점 뒤 글을 이름으로, 아무것도 없으면 건너뛴다', () => {
    expect(parseCharacters(': 이름 없는 손님\n:\n  ')).toEqual([{ name: '이름 없는 손님', description: '' }]);
    expect(parseCharacters('')).toEqual([]);
  });

  it("'-'로 시작하는 이름은 기호 뒤에 띄어쓰기가 있을 때만 뗀다", () => {
    expect(parseCharacters('-지은-: 별명')).toEqual([{ name: '-지은-', description: '별명' }]);
  });
});

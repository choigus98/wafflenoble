import { describe, expect, it } from 'vitest';
import { filterToc } from '@/lib/toc-filter';

const items = [
  { position: 1, title: '자정의 손님' },
  { position: 2, title: '두 번째 병' },
  { position: 3, title: '' },
  { position: 12, title: '열두 살의 여름방학' },
  { position: 21, title: 'Blue Moon 와플' },
  { position: 30, title: '12시의 종소리' },
];
const positions = (query: string) => filterToc(items, query).map((item) => item.position);

describe('목차에서 회차 찾기', () => {
  it('빈 검색어면 전부', () => {
    expect(positions('')).toEqual([1, 2, 3, 12, 21, 30]);
    expect(positions('   ')).toEqual([1, 2, 3, 12, 21, 30]);
  });

  it("'12'·'12화'는 그 번호 회차, 제목에 12가 들어간 회차도 함께", () => {
    expect(positions('12')).toEqual([12, 30]);
    expect(positions('12화')).toEqual([12]);
    expect(positions(' 3 ')).toEqual([3]);
  });

  it('제목 일부, 띄어 쓴 낱말은 모두 들어 있어야', () => {
    expect(positions('손님')).toEqual([1]);
    expect(positions('자정 손님')).toEqual([1]);
    expect(positions('자정 와플')).toEqual([]);
  });

  it('영문은 대소문자를 가리지 않고, 제목 없는 회차는 N화로 찾는다', () => {
    expect(positions('blue moon')).toEqual([21]);
    expect(positions('3화')).toEqual([3]);
  });
});

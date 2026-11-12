import { describe, expect, it } from 'vitest';
import { chapterState, countChapters, filterChapters, matchesChapterQuery, parseChapterFilter } from '@/lib/chapter-filter';

const chapters = [
  { id: 1, status: 'published' as const, scheduled: false },
  { id: 2, status: 'draft' as const, scheduled: false },
  { id: 3, status: 'published' as const, scheduled: true },
  { id: 4, status: 'published' as const, scheduled: false },
];

describe('관리자 회차 목록 거르기', () => {
  it('주소 값: 아는 값만, 모르면 전체', () => {
    expect(parseChapterFilter('draft')).toBe('draft');
    expect(parseChapterFilter(['scheduled', 'draft'])).toBe('scheduled');
    expect(parseChapterFilter('oops')).toBe('all');
    expect(parseChapterFilter(undefined)).toBe('all');
  });

  it('예약 발행은 발행이 아니라 예약으로', () => {
    expect(chapterState(chapters[2])).toBe('scheduled');
    expect(chapterState(chapters[0])).toBe('published');
    expect(chapterState(chapters[1])).toBe('draft');
  });

  it('거르기와 개수', () => {
    expect(filterChapters(chapters, 'published').map((c) => c.id)).toEqual([1, 4]);
    expect(filterChapters(chapters, 'all')).toHaveLength(4);
    expect(countChapters(chapters)).toEqual({ all: 4, published: 2, scheduled: 1, draft: 1 });
  });
});

describe('관리자 회차 찾기', () => {
  const list = [
    { position: 1, title: '자정의 손님' },
    { position: 2, title: '두 번째 병' },
    { position: 3, title: '템플릿 예시' },
    { position: 13, title: '3년 뒤의 와플' },
    { position: 30, title: '' },
  ];
  const find = (query: string) => list.filter((chapter) => matchesChapterQuery(chapter, query)).map((chapter) => chapter.position);

  it('빈 칸이면 전부', () => {
    expect(find('')).toEqual([1, 2, 3, 13, 30]);
    expect(find('  ')).toEqual([1, 2, 3, 13, 30]);
  });

  it("숫자만·'3화'는 그 번호 + 제목에 그 숫자가 든 회차 (13화·30화는 번호로 안 걸림)", () => {
    expect(find('3')).toEqual([3, 13]); // 13화는 제목 '3년 뒤의 와플' 때문에
    expect(find('3화')).toEqual([3, 13]);
    expect(find('30')).toEqual([30]);
    expect(find('2 화')).toEqual([2]);
  });

  it('제목 일부·초성·치는 중인 한글, 번호와 제목을 같이', () => {
    expect(find('병')).toEqual([2]);
    expect(find('ㅈㅈ')).toEqual([1]);
    expect(find('템플리')).toEqual([3]);
    expect(find('템플ㄹ')).toEqual([3]); // '릿'을 치는 중
    expect(find('잦')).toEqual([1]); // '자정'을 치는 중 ('정'의 ㅈ이 '자'의 받침으로 붙은 채)
    expect(find('3화 템플')).toEqual([3]);
    expect(find('와플')).toEqual([13]);
    expect(find('없는 제목')).toEqual([]);
  });
});

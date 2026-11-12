import { describe, expect, it } from 'vitest';
import { chapterState, countChapters, filterChapters, parseChapterFilter } from '@/lib/chapter-filter';

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

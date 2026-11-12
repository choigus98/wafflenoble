// 관리자 작품 화면 회차 목록 거르기: 전체 · 발행 · 예약 · 임시저장 (주소의 ?show= 값으로)

export const CHAPTER_FILTERS = [
  { key: 'all', label: '전체' },
  { key: 'published', label: '발행' },
  { key: 'scheduled', label: '예약' },
  { key: 'draft', label: '임시저장' },
] as const;

export type ChapterFilter = (typeof CHAPTER_FILTERS)[number]['key'];
export type ChapterState = Exclude<ChapterFilter, 'all'>;

/** 모르는 값이나 빈 값이면 '전체' */
export function parseChapterFilter(value: unknown): ChapterFilter {
  const raw = Array.isArray(value) ? value[0] : value;
  return CHAPTER_FILTERS.some((filter) => filter.key === raw) ? (raw as ChapterFilter) : 'all';
}

/** 예약 발행은 status가 published여도 '예약' */
export function chapterState(chapter: { status: 'draft' | 'published'; scheduled: boolean }): ChapterState {
  if (chapter.status === 'draft') return 'draft';
  return chapter.scheduled ? 'scheduled' : 'published';
}

export function filterChapters<T extends { status: 'draft' | 'published'; scheduled: boolean }>(chapters: T[], filter: ChapterFilter): T[] {
  return filter === 'all' ? chapters : chapters.filter((chapter) => chapterState(chapter) === filter);
}

export function countChapters(chapters: Array<{ status: 'draft' | 'published'; scheduled: boolean }>): Record<ChapterFilter, number> {
  const counts: Record<ChapterFilter, number> = { all: chapters.length, published: 0, scheduled: 0, draft: 0 };
  for (const chapter of chapters) counts[chapterState(chapter)] += 1;
  return counts;
}

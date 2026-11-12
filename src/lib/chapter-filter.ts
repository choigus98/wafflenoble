// 관리자 작품 화면 회차 목록 거르기: 전체 · 발행 · 예약 · 임시저장 (주소의 ?show= 값으로), 그리고 제목·회차 번호 찾기

import { koreanIncludes } from '@/lib/korean-search';

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

/**
 * 회차 찾기: 숫자만(또는 '3화') 치면 그 번호의 회차 + 제목에 그 숫자가 든 회차,
 * 그 밖에는 제목이나 '3화 제목'에 맞는 회차 (초성·치는 중인 한글도 맞춤, lib/korean-search.ts).
 * 숫자만 칠 때 '3'이 13화·30화까지 걸리지 않게 번호는 정확히 맞춘다
 */
export function matchesChapterQuery(chapter: { position: number; title: string }, query: string): boolean {
  const q = query.trim();
  if (!q) return true;
  const number = q.match(/^(\d{1,5})\s*화?$/);
  if (number) return Number(number[1]) === chapter.position || koreanIncludes(chapter.title, number[1]);
  return koreanIncludes(chapter.title, q) || koreanIncludes(`${chapter.position}화 ${chapter.title}`, q);
}

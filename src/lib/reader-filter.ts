// 관리자 길드원 화면 거르기: 전체 · 2주 넘게 안 들어옴 (주소의 ?show= 값으로, 회차 거르기 lib/chapter-filter.ts와 같은 모양)

/** 마지막으로 들어온 지 이만큼(일)이 넘으면 '오래 안 들어온 길드원' */
export const AWAY_DAYS = 14;
const DAY_MS = 86_400_000;

export const READER_FILTERS = [
  { key: 'all', label: '전체' },
  { key: 'away', label: '2주 넘게 안 들어옴' },
] as const;

export type ReaderFilter = (typeof READER_FILTERS)[number]['key'];

/** 모르는 값이나 빈 값이면 '전체' */
export function parseReaderFilter(value: unknown): ReaderFilter {
  const raw = Array.isArray(value) ? value[0] : value;
  return READER_FILTERS.some((filter) => filter.key === raw) ? (raw as ReaderFilter) : 'all';
}

/** 마지막으로 들어온 지 2주(14일)가 넘었는지 (딱 14일은 아직 아님) */
export function isAway(lastSeenAt: Date, now: Date): boolean {
  return now.getTime() - lastSeenAt.getTime() > AWAY_DAYS * DAY_MS;
}

/** 마지막으로 들어온 뒤 지난 날 수 (하루가 안 되면 0) — '15일째 안 들어옴' */
export function daysAway(lastSeenAt: Date, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - lastSeenAt.getTime()) / DAY_MS));
}

export function filterReaders<T extends { lastSeenAt: Date }>(readers: T[], filter: ReaderFilter, now: Date): T[] {
  return filter === 'all' ? readers : readers.filter((reader) => isAway(reader.lastSeenAt, now));
}

export function countReaders(readers: Array<{ lastSeenAt: Date }>, now: Date): Record<ReaderFilter, number> {
  return { all: readers.length, away: readers.filter((reader) => isAway(reader.lastSeenAt, now)).length };
}

// 관리자 '임시저장 회차 한꺼번에 예약': 고른 회차를 첫 공개 시각부터 N일 간격으로 차례로 (회차 번호 순).
// 시각은 브라우저 시간대(한국)의 같은 시·분을 날짜만 넘겨서 정한다

export const BULK_INTERVALS = [
  { days: 1, label: '매일' },
  { days: 2, label: '이틀마다' },
  { days: 3, label: '사흘마다' },
  { days: 7, label: '일주일마다' },
] as const;

/** 첫 시각부터 everyDays일 간격으로 count개 (같은 시·분) */
export function bulkScheduleTimes(first: Date, count: number, everyDays: number): Date[] {
  return Array.from({ length: Math.max(0, count) }, (_, index) => {
    const date = new Date(first.getTime());
    date.setDate(date.getDate() + index * everyDays);
    return date;
  });
}

/** 첫 공개 기본값: 내일 오후 7시 (연재 시간으로 흔한 때) */
export function defaultBulkStart(now: Date): Date {
  const date = new Date(now.getTime());
  date.setDate(date.getDate() + 1);
  date.setHours(19, 0, 0, 0);
  return date;
}

// 관리자 홈 '예약 달력': 한국 시간 기준 달력 칸과 날짜별 묶기. 일요일부터 한 주.
// 날짜 계산은 한국 시간(서머타임 없음)에 9시간을 더한 UTC 날짜로 한다 (서버·브라우저 시간대와 상관없이 같게)

const KST_OFFSET = 9 * 60 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;

export type Month = { year: number; month: number }; // month: 1~12

/** 한국 시간 날짜 'YYYY-MM-DD' */
export function kstDayKey(date: Date): string {
  return new Date(date.getTime() + KST_OFFSET).toISOString().slice(0, 10);
}

/** 한국 시간으로 그 때가 든 달 */
export function kstMonthOf(date: Date): Month {
  const shifted = new Date(date.getTime() + KST_OFFSET);
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1 };
}

export function addMonths({ year, month }: Month, count: number): Month {
  const total = year * 12 + (month - 1) + count;
  return { year: Math.floor(total / 12), month: (total % 12) + 1 };
}

/** 달 비교: a가 b보다 앞이면 음수 */
export function compareMonths(a: Month, b: Month): number {
  return a.year * 12 + a.month - (b.year * 12 + b.month);
}

export type DayCell = { key: string; day: number; inMonth: boolean };

/** 그 달 달력: 일요일부터 한 주씩 (앞뒤 달 날짜로 채운 칸은 inMonth false) */
export function monthGrid({ year, month }: Month): DayCell[][] {
  const first = Date.UTC(year, month - 1, 1);
  let cursor = first - new Date(first).getUTCDay() * DAY;
  const weeks: DayCell[][] = [];
  do {
    const week: DayCell[] = [];
    for (let index = 0; index < 7; index += 1) {
      const date = new Date(cursor);
      week.push({ key: date.toISOString().slice(0, 10), day: date.getUTCDate(), inMonth: date.getUTCMonth() === month - 1 });
      cursor += DAY;
    }
    weeks.push(week);
  } while (new Date(cursor).getUTCMonth() === month - 1);
  return weeks;
}

/** 날짜별로 묶기 (한국 시간 날짜, 같은 날 안에서는 시각 순) */
export function groupByDay<T>(items: T[], at: (item: T) => Date): Map<string, T[]> {
  const days = new Map<string, T[]>();
  for (const item of [...items].sort((a, b) => at(a).getTime() - at(b).getTime())) {
    const key = kstDayKey(at(item));
    days.set(key, [...(days.get(key) ?? []), item]);
  }
  return days;
}

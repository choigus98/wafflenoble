// 회차 에디터 '오늘 쓴 글자수': 이 기기에서 오늘 늘어난 글자수 (공백 포함, 지운 만큼은 뺌, 모든 회차를 더함).
// - 날짜는 앱의 다른 날짜처럼 한국 시간 기준. 자정이 지나면 새로 센다
// - 회차마다 '그날 처음 열었을 때의 글자수(기준)'와 '마지막 글자수'를 기억하고, 늘어난 만큼 = 마지막 − 기준
// - 다른 기기에서 고친 만큼은 세지 않도록, 회차를 다시 열 때 그 사이 바뀐 만큼 기준을 옮긴다
// - 최근 7일만 남긴다
// 저장 모양: { "2026-11-13": { "2": [기준, 마지막], ... }, ... }
// 에디터(DOM) 없이 계산만 해서 테스트할 수 있다.

export type DayCounts = Record<string, [base: number, last: number]>;
export type TodayStore = Record<string, DayCounts>;

export const TODAY_CHARS_KEY = 'wn:today-chars';
const KEEP_DAYS = 7;
const KST_OFFSET = 9 * 60 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;

/** 한국 시간 날짜 'YYYY-MM-DD' (한국은 서머타임이 없어서 9시간만 더하면 된다) */
export function dayKey(now: Date): string {
  return new Date(now.getTime() + KST_OFFSET).toISOString().slice(0, 10);
}

/** 다음 한국 시간 자정까지 남은 밀리초 */
export function msUntilNextDay(now: Date): number {
  const shifted = now.getTime() + KST_OFFSET;
  return (Math.floor(shifted / DAY) + 1) * DAY - shifted;
}

const isInt = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value);
const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

/** 저장해 둔 글 읽기 (모양이 틀린 날·줄은 버림. 기준은 다른 곳에서 지운 만큼 옮겨져 음수일 수 있음) */
export function parseTodayStore(raw: string | null): TodayStore {
  if (!raw) return {};
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!isObject(data)) return {};
  const store: TodayStore = {};
  for (const [date, day] of Object.entries(data)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !isObject(day)) continue;
    const counts: DayCounts = {};
    for (const [id, pair] of Object.entries(day)) {
      if (Array.isArray(pair) && pair.length === 2 && isInt(pair[0]) && isInt(pair[1]) && pair[1] >= 0) counts[id] = [pair[0], pair[1]];
    }
    store[date] = counts;
  }
  return store;
}

/** 그날 회차 하나를 열 때: 이 회차의 기준 글자수와, 다른 회차들에서 그날 늘어난 글자수의 합 */
export function openChapter(store: TodayStore, date: string, id: string, count: number): { base: number; others: number } {
  const day = store[date] ?? {};
  const entry = day[id];
  // 다시 열었으면, 닫은 뒤 다른 곳에서 바뀐 만큼(지금 − 마지막)은 기준도 같이 옮겨서 세지 않는다
  const base = entry ? entry[0] + (count - entry[1]) : count;
  let others = 0;
  for (const [key, [start, last]] of Object.entries(day)) if (key !== id) others += last - start;
  return { base, others };
}

/** 회차 글자수가 바뀔 때 기억해 두기 (이 회차 줄만 바꾸고, 최근 7일만 남김) */
export function noteCount(store: TodayStore, date: string, id: string, base: number, count: number): TodayStore {
  const next: TodayStore = { ...store, [date]: { ...store[date], [id]: [base, count] } };
  return Object.fromEntries(
    Object.keys(next)
      .sort()
      .slice(-KEEP_DAYS)
      .map((key) => [key, next[key]]),
  );
}

/** +1,234 · −120 · 0 */
export function signedCount(value: number): string {
  if (value === 0) return '0';
  return `${value > 0 ? '+' : '−'}${Math.abs(value).toLocaleString('ko-KR')}`;
}

/** 최근 7일(한국 시간, 오래된 날 → 오늘) 날마다 이 기기에서 늘어난 글자수 (모든 회차를 더함, 지운 만큼 뺌, 기록 없는 날은 0) */
export function weekCounts(store: TodayStore, now: Date): Array<{ date: string; count: number }> {
  const days: Array<{ date: string; count: number }> = [];
  for (let back = KEEP_DAYS - 1; back >= 0; back -= 1) {
    const date = dayKey(new Date(now.getTime() - back * DAY));
    const count = Object.values(store[date] ?? {}).reduce((sum, [base, last]) => sum + (last - base), 0);
    days.push({ date, count });
  }
  return days;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/** 'YYYY-MM-DD' → 요일 한 글자와 '11월 13일 (금)' */
export function dayLabel(date: string): { weekday: string; long: string } {
  const [year, month, day] = date.split('-').map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
  return { weekday, long: `${month}월 ${day}일 (${weekday})` };
}

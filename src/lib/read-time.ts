import { dayKey } from '@/lib/today-chars';

// 열람 '오늘 읽은 시간': 이 기기에서 회차 화면을 읽은 시간을 날마다 세어 '내 기록'에 보여 준다 (서버로 보내지 않음).
// - 세는 때: 회차 화면이 보이고, 최근 2분 안에 스크롤 · 누르기 · 키 입력이 있었거나 '소리 내어 듣기'로 듣는 중일 때만
//   (화면을 켜 둔 채 자리를 비운 시간 · 숨은 탭은 안 셈)
// - 15초마다 센다. 틱 사이가 길면(기기 잠자기 · 숨었다 돌아온 탭) 두 틱(30초)까지만
// - 날짜는 한국 시간, 최근 7일만 남기고 하루 24시간을 넘지 않게
// 저장 모양: { "2026-11-13": 1380 } (초). 화면(DOM) 없이 계산만 해서 테스트할 수 있다

export const READ_TIME_KEY = 'wn:read-time';
export const READ_TICK_MS = 15_000;
export const READ_IDLE_MS = 2 * 60_000;
const KEEP_DAYS = 7;
const DAY_SECONDS = 24 * 60 * 60;

export type ReadTimeStore = Record<string, number>;

/** 이번 틱에 더할 초 */
export function activeSeconds(input: { now: number; lastTick: number; lastActive: number; visible: boolean; listening: boolean }): number {
  if (!input.visible) return 0;
  if (!input.listening && input.now - input.lastActive > READ_IDLE_MS) return 0;
  return Math.round(Math.min(Math.max(0, input.now - input.lastTick), READ_TICK_MS * 2) / 1000);
}

/** 저장해 둔 글 읽기 (모양이 틀린 날은 버림) */
export function parseReadTime(raw: string | null): ReadTimeStore {
  if (!raw) return {};
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return {};
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return {};
  const store: ReadTimeStore = {};
  for (const [date, seconds] of Object.entries(data)) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date) && typeof seconds === 'number' && Number.isSafeInteger(seconds) && seconds > 0) store[date] = Math.min(seconds, DAY_SECONDS);
  }
  return store;
}

/** 그날에 초를 더하고 최근 7일만 남김 */
export function addReadTime(store: ReadTimeStore, date: string, seconds: number): ReadTimeStore {
  if (seconds <= 0) return store;
  const next: ReadTimeStore = { ...store, [date]: Math.min(DAY_SECONDS, (store[date] ?? 0) + Math.round(seconds)) };
  return Object.fromEntries(
    Object.keys(next)
      .sort()
      .slice(-KEEP_DAYS)
      .map((key) => [key, next[key]]),
  );
}

/** 오늘 · 최근 7일(오늘 포함) 합계 (초) */
export function readTimeSummary(store: ReadTimeStore, now: Date): { today: number; week: number } {
  const today = dayKey(now);
  const days = new Set(Array.from({ length: KEEP_DAYS }, (_, back) => dayKey(new Date(now.getTime() - back * DAY_SECONDS * 1000))));
  let week = 0;
  for (const [date, seconds] of Object.entries(store)) if (days.has(date)) week += seconds;
  return { today: store[today] ?? 0, week };
}

/** '0분' · '1분 미만' · '23분' · '1시간' · '1시간 40분' */
export function formatReadDuration(seconds: number): string {
  if (seconds <= 0) return '0분';
  if (seconds < 60) return '1분 미만';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}분`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}시간` : `${hours}시간 ${rest}분`;
}

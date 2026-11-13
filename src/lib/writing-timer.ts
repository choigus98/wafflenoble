import { dayKey, signedCount, type TodayStore } from '@/lib/today-chars';

// 회차 에디터 '글쓰기 타이머': 15 · 25 · 50분 중 골라 시작하고, 끝나면 그동안 쓴 글자수를 알려 준다.
// - 글자수는 '오늘 쓴 글자수'와 같은 셈 (이 기기, 공백 포함, 지운 만큼 뺌, 모든 회차를 더함):
//   시작할 때 그날 합계를 적어 두고, 끝날 때 시작한 날부터의 합계에서 뺀다 → 회차를 옮겨 가며 써도, 자정을 넘겨도 맞다
// - 새로 고침하거나 다른 회차로 가도 이어지게 이 기기에 기억한다. 끝나면 결과를 적어 두어서(끝난 뒤에 더 쓴 글자가 섞이지 않게)
//   결과를 닫거나 새로 시작할 때까지 보여 준다
// - 끝나고 반나절이 지나도록 에디터를 안 열었으면(결과를 못 적었으면) 조용히 버린다
// 저장 모양: { "minutes": 25, "endsAt": 1763012345678, "startDate": "2026-11-13", "startTotal": 1234, "result": null }
// 에디터(DOM) 없이 계산만 해서 테스트할 수 있다.

export const SPRINT_KEY = 'wn:sprint';
export const SPRINT_MINUTES = [15, 25, 50] as const;
export const SPRINT_STALE_MS = 12 * 60 * 60 * 1000;

export type Sprint = {
  minutes: number;
  /** 끝나는 시각 (ms) */
  endsAt: number;
  /** 시작한 날 (한국 날짜) */
  startDate: string;
  /** 시작할 때 그날 늘어난 글자수 합계 */
  startTotal: number;
  /** 끝난 뒤 그동안 쓴 글자수 (아직 안 끝났으면 null) */
  result: number | null;
};

const isInt = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value);

/** 저장해 둔 타이머 읽기 (모양이 틀리면 없는 것으로) */
export function parseSprint(raw: string | null): Sprint | null {
  if (!raw) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return null;
  const { minutes, endsAt, startDate, startTotal, result } = data as Record<string, unknown>;
  if (!isInt(minutes) || !(SPRINT_MINUTES as readonly number[]).includes(minutes)) return null;
  if (!isInt(endsAt) || endsAt <= 0) return null;
  if (typeof startDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return null;
  if (!isInt(startTotal)) return null;
  if (result != null && !isInt(result)) return null;
  return { minutes, endsAt, startDate, startTotal, result: result ?? null };
}

/** 그날 모든 회차에서 늘어난 글자수 ('오늘 쓴 글자수'의 합계) */
export function dayTotal(store: TodayStore, date: string): number {
  return Object.values(store[date] ?? {}).reduce((sum, [base, last]) => sum + (last - base), 0);
}

export function startSprint(minutes: number, now: Date, store: TodayStore): Sprint {
  const startDate = dayKey(now);
  return { minutes, endsAt: now.getTime() + minutes * 60_000, startDate, startTotal: dayTotal(store, startDate), result: null };
}

/** 시작한 뒤 쓴 글자수: 시작한 날부터 오늘까지의 합계 − 시작할 때의 합계 */
export function sprintWritten(store: TodayStore, sprint: Pick<Sprint, 'startDate' | 'startTotal'>): number {
  const days = Object.keys(store).filter((date) => date >= sprint.startDate);
  return days.reduce((sum, date) => sum + dayTotal(store, date), 0) - sprint.startTotal;
}

/** 남은 시간 '24:13' (초는 올림 — 0:00은 끝난 때만) */
export function remainingClock(ms: number): string {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/** 낭독기용 남은 시간 '24분 13초' · '25분' · '13초' */
export function remainingWords(ms: number): string {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return [minutes > 0 && `${minutes}분`, (rest > 0 || minutes === 0) && `${rest}초`].filter(Boolean).join(' ');
}

/** 도구 막대 단추에 붙이는 결과 '+412자' · '0자' · '−120자' */
export function sprintResultLabel(result: number): string {
  return `${signedCount(result)}자`;
}

/** 끝났을 때 알림 */
export function sprintMessage(minutes: number, result: number): string {
  const head = `${minutes}분이 끝났어요.`;
  if (result > 0) return `${head} 그동안 ${result.toLocaleString('ko-KR')}자를 썼어요`;
  if (result < 0) return `${head} 그동안 글자수가 ${Math.abs(result).toLocaleString('ko-KR')}자 줄었어요`;
  return `${head} 그동안 늘어난 글자는 없어요`;
}

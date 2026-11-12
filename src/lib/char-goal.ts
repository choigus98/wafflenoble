// 에디터 글자수 목표 값 다루기 (공백 포함 기준)

export const CHAR_GOAL_MIN = 100;
export const CHAR_GOAL_MAX = 200_000;

/** 입력한 글자('5,000', '5000자')에서 숫자만 읽어 범위 안으로. 비우면 목표 없음(null) */
export function parseCharGoal(raw: string): number | null {
  const digits = raw.replace(/[^0-9]/g, '');
  if (!digits) return null;
  return Math.min(CHAR_GOAL_MAX, Math.max(CHAR_GOAL_MIN, Number(digits)));
}

/** 저장해 둔 값이 올바른 목표인지 */
export function isCharGoal(value: number): boolean {
  return Number.isInteger(value) && value >= CHAR_GOAL_MIN && value <= CHAR_GOAL_MAX;
}

/** 진행률 0~100 (넘쳐도 100) */
export function charGoalPercent(count: number, goal: number): number {
  return Math.min(100, Math.round((Math.max(0, count) / goal) * 100));
}

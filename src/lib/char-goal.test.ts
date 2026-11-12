import { describe, expect, it } from 'vitest';
import { CHAR_GOAL_MAX, CHAR_GOAL_MIN, charGoalPercent, isCharGoal, parseCharGoal } from '@/lib/char-goal';

describe('글자수 목표', () => {
  it('쉼표·단위가 섞여도 숫자만 읽고, 비우면 목표 없음', () => {
    expect(parseCharGoal('5,000')).toBe(5000);
    expect(parseCharGoal('5000자')).toBe(5000);
    expect(parseCharGoal('')).toBeNull();
    expect(parseCharGoal('목표 없음')).toBeNull();
  });

  it('너무 작거나 큰 값은 범위 안으로', () => {
    expect(parseCharGoal('3')).toBe(CHAR_GOAL_MIN);
    expect(parseCharGoal('99999999')).toBe(CHAR_GOAL_MAX);
  });

  it('저장된 값 검사와 진행률', () => {
    expect(isCharGoal(5000)).toBe(true);
    expect(isCharGoal(0)).toBe(false);
    expect(isCharGoal(Number.NaN)).toBe(false);
    expect(charGoalPercent(3200, 5000)).toBe(64);
    expect(charGoalPercent(7000, 5000)).toBe(100);
  });
});

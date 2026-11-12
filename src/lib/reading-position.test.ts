import { describe, expect, it } from 'vitest';
import { RESUME_MAX, RESUME_MIN, isPartlyRead, positionKey } from '@/lib/reading-position';

describe('읽다 만 회차', () => {
  it('5% 이상 95% 미만만 읽다 만 것으로 본다', () => {
    expect(isPartlyRead(null)).toBe(false);
    expect(isPartlyRead(0.01)).toBe(false);
    expect(isPartlyRead(RESUME_MIN)).toBe(true);
    expect(isPartlyRead(0.4)).toBe(true);
    expect(isPartlyRead(RESUME_MAX)).toBe(false);
    expect(isPartlyRead(1)).toBe(false);
  });

  it('회차 화면과 목차가 같은 저장 키를 쓴다', () => {
    expect(positionKey(3)).toBe('wn:pos:3');
  });
});

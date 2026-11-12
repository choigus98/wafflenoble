import { describe, expect, it } from 'vitest';
import { formatReadingTime, readingMinutes } from '@/lib/reading-time';

describe('회차 읽는 시간', () => {
  it('글자수를 1분에 600자로 나눠 반올림, 적어도 1분', () => {
    expect(readingMinutes(1)).toBe(1);
    expect(readingMinutes(299)).toBe(1);
    expect(readingMinutes(600)).toBe(1);
    expect(readingMinutes(900)).toBe(2);
    expect(readingMinutes(5000)).toBe(8);
    expect(readingMinutes(5500)).toBe(9);
  });

  it('본문이 없으면 보여 주지 않는다', () => {
    expect(readingMinutes(0)).toBeNull();
    expect(readingMinutes(-3)).toBeNull();
    expect(readingMinutes(Number.NaN)).toBeNull();
  });

  it("한 시간이 넘으면 '약 1시간 5분'처럼", () => {
    expect(formatReadingTime(8)).toBe('약 8분');
    expect(formatReadingTime(59)).toBe('약 59분');
    expect(formatReadingTime(60)).toBe('약 1시간');
    expect(formatReadingTime(65)).toBe('약 1시간 5분');
    expect(formatReadingTime(120)).toBe('약 2시간');
  });
});

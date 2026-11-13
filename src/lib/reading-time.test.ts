import { describe, expect, it } from 'vitest';
import { formatReadingTime, readingMinutes, remainingChars, remainingLabel } from '@/lib/reading-time';

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

describe('남은 읽는 시간', () => {
  // 문단 셋(0~100 · 100~200 · 템플릿 200~300 · 300~400)
  const units = [
    { top: 0, bottom: 100, chars: 600 },
    { top: 100, bottom: 200, chars: 1200 },
    { top: 200, bottom: 300, chars: 0 },
    { top: 300, bottom: 400, chars: 900 },
  ];

  it('읽는 줄 아래는 다, 줄에 걸친 덩어리는 아래쪽 비율만큼, 글자수에 안 드는 덩어리는 빼고', () => {
    expect(remainingChars(units, -50)).toBe(2700);
    expect(remainingChars(units, 50)).toBe(300 + 1200 + 900);
    expect(remainingChars(units, 150)).toBe(600 + 900);
    expect(remainingChars(units, 250)).toBe(900);
    expect(remainingChars(units, 400)).toBe(0);
    // 높이가 0인 덩어리도 나눗셈 오류 없이
    expect(remainingChars([{ top: 10, bottom: 10, chars: 50 }], 0)).toBe(50);
  });

  it("글: 머리의 '약 N분'과 같은 셈에 '남음', 남은 글자가 없으면 없음", () => {
    expect(remainingLabel(1500)).toBe('약 3분 남음');
    expect(remainingLabel(100)).toBe('약 1분 남음');
    expect(remainingLabel(39_000)).toBe('약 1시간 5분 남음');
    expect(remainingLabel(0)).toBeNull();
  });
});

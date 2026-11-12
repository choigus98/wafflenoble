import { describe, expect, it } from 'vitest';
import { addMonths, compareMonths, groupByDay, kstDayKey, kstMonthOf, monthGrid } from '@/lib/calendar';

describe('예약 달력', () => {
  it('한국 시간 날짜와 달 (UTC 15시부터는 다음 날)', () => {
    expect(kstDayKey(new Date('2026-11-13T14:59:00Z'))).toBe('2026-11-13');
    expect(kstDayKey(new Date('2026-11-13T15:00:00Z'))).toBe('2026-11-14');
    expect(kstMonthOf(new Date('2026-11-30T15:00:00Z'))).toEqual({ year: 2026, month: 12 });
    expect(addMonths({ year: 2026, month: 11 }, 2)).toEqual({ year: 2027, month: 1 });
    expect(addMonths({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
    expect(compareMonths({ year: 2026, month: 12 }, { year: 2027, month: 1 })).toBeLessThan(0);
  });

  it('달력 칸: 일요일부터, 앞뒤 달로 채우고 그 달이 끝나는 주까지', () => {
    const november = monthGrid({ year: 2026, month: 11 }); // 11월 1일은 일요일, 30일은 월요일
    expect(november).toHaveLength(5);
    expect(november[0][0]).toEqual({ key: '2026-11-01', day: 1, inMonth: true });
    expect(november[4].map((cell) => cell.day)).toEqual([29, 30, 1, 2, 3, 4, 5]);
    expect(november[4][2].inMonth).toBe(false);
    const february = monthGrid({ year: 2026, month: 2 }); // 2월 1일 일요일, 28일 토요일 → 딱 네 주
    expect(february).toHaveLength(4);
    const august = monthGrid({ year: 2026, month: 8 }); // 8월 1일 토요일 → 여섯 주
    expect(august).toHaveLength(6);
    expect(august[0].slice(0, 6).every((cell) => !cell.inMonth)).toBe(true);
  });

  it('날짜별로 묶고 같은 날은 시각 순', () => {
    const items = [{ at: '2026-11-14T12:00:00Z' }, { at: '2026-11-14T10:00:00Z' }, { at: '2026-11-15T16:00:00Z' }];
    const days = groupByDay(items, (item) => new Date(item.at));
    expect([...days.keys()]).toEqual(['2026-11-14', '2026-11-16']);
    expect(days.get('2026-11-14')?.map((item) => item.at)).toEqual(['2026-11-14T10:00:00Z', '2026-11-14T12:00:00Z']);
  });
});

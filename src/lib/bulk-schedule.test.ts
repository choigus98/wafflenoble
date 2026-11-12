import { describe, expect, it } from 'vitest';
import { bulkScheduleTimes, defaultBulkStart } from '@/lib/bulk-schedule';

// 테스트 기계의 시간대와 상관없이 '같은 시·분, 날짜만 넘김'을 확인한다
const local = (date: Date) => `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;

describe('한꺼번에 예약', () => {
  it('첫 시각부터 N일 간격, 같은 시·분 (달이 바뀌어도)', () => {
    const first = new Date(2026, 10, 29, 19, 30);
    expect(bulkScheduleTimes(first, 3, 1).map(local)).toEqual(['11/29 19:30', '11/30 19:30', '12/1 19:30']);
    expect(bulkScheduleTimes(first, 3, 7).map(local)).toEqual(['11/29 19:30', '12/6 19:30', '12/13 19:30']);
    expect(bulkScheduleTimes(first, 0, 1)).toEqual([]);
  });

  it('기본 첫 시각은 내일 오후 7시', () => {
    expect(local(defaultBulkStart(new Date(2026, 10, 13, 23, 50)))).toBe('11/14 19:00');
    expect(local(defaultBulkStart(new Date(2026, 11, 31, 8, 0)))).toBe('1/1 19:00');
  });
});

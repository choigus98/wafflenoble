import { describe, expect, it } from 'vitest';
import { formatDate, formatDateTime, formatRelative, formatSchedule } from '@/lib/format';

describe('날짜 표시', () => {
  it('서버가 UTC여도 한국 시간으로 표시한다', () => {
    // UTC 15:30 = 한국 다음 날 00:30
    const date = new Date('2026-11-12T15:30:00Z');
    expect(formatDate(date)).toBe('2026.11.13');
    expect(formatDateTime(date)).toBe('2026.11.13 00:30');
  });

  it('예약 시각은 오전/오후로', () => {
    expect(formatSchedule(new Date('2026-11-13T11:00:00Z'))).toBe('11월 13일 (금) 오후 8:00');
    expect(formatSchedule(new Date('2026-11-13T00:05:00Z'))).toBe('11월 13일 (금) 오전 9:05');
    expect(formatSchedule(new Date('2026-11-13T03:30:00Z'))).toBe('11월 13일 (금) 오후 12:30');
    expect(formatSchedule(new Date('2026-11-12T15:00:00Z'))).toBe('11월 13일 (금) 오전 12:00');
  });

  it('상대 시간', () => {
    const now = new Date('2026-11-12T12:00:00Z');
    const ago = (ms: number) => formatRelative(new Date(now.getTime() - ms), now);
    expect(ago(30_000)).toBe('방금');
    expect(ago(5 * 60_000)).toBe('5분 전');
    expect(ago(3 * 3_600_000)).toBe('3시간 전');
    expect(ago(2 * 86_400_000)).toBe('2일 전');
    expect(ago(10 * 86_400_000)).toBe('2026.11.02');
  });
});

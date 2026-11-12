import { describe, expect, it } from 'vitest';
import { formatDate, formatDateTime, formatRelative, formatSchedule, particle, withParticle } from '@/lib/format';

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

describe('조사', () => {
  it('받침이 있으면 을, 없으면 를', () => {
    expect(withParticle('자정의 손님', '을', '를')).toBe('자정의 손님을');
    expect(withParticle('템플릿 예시', '을', '를')).toBe('템플릿 예시를');
    expect(withParticle('3화', '을', '를')).toBe('3화를');
  });

  it('조사만 고르기', () => {
    expect(particle('자정의 손님', '을', '를')).toBe('을');
    expect(particle('', '을', '를')).toBe('를');
  });

  it('한글이 아니면 둘 다', () => {
    expect(withParticle('Chapter 1', '을', '를')).toBe('Chapter 1을(를)');
  });
});

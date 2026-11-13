import { describe, expect, it } from 'vitest';
import { activeSeconds, addReadTime, formatReadDuration, parseReadTime, readTimeSummary } from '@/lib/read-time';

// 한국 시간 2026-11-13 14:00
const NOW = new Date('2026-11-13T05:00:00Z').getTime();

describe('오늘 읽은 시간', () => {
  it('보이고 최근 2분 안에 움직였거나 듣는 중일 때만 세고, 틱 사이가 길면 30초까지만', () => {
    const base = { now: NOW, lastTick: NOW - 15_000, lastActive: NOW - 30_000, visible: true, listening: false };
    expect(activeSeconds(base)).toBe(15);
    expect(activeSeconds({ ...base, visible: false })).toBe(0);
    // 3분 동안 움직임이 없으면 안 셈, 듣는 중이면 셈
    expect(activeSeconds({ ...base, lastActive: NOW - 180_000 })).toBe(0);
    expect(activeSeconds({ ...base, lastActive: NOW - 180_000, listening: true })).toBe(15);
    // 숨었다 돌아온 탭 · 잠자기: 10분이 지났어도 30초까지만
    expect(activeSeconds({ ...base, lastTick: NOW - 600_000 })).toBe(30);
    expect(activeSeconds({ ...base, lastTick: NOW + 5000 })).toBe(0);
  });

  it('날마다 더하고 최근 7일만 남기며 하루 24시간을 넘지 않음, 모양이 틀린 저장값은 버림', () => {
    let store = parseReadTime('{"2026-11-01":60,"2026-11-13":"x","bad":5,"2026-11-12":-3}');
    expect(store).toEqual({ '2026-11-01': 60 });
    for (let day = 2; day <= 9; day += 1) store = addReadTime(store, `2026-11-0${day}`, 30);
    expect(Object.keys(store)).toEqual(['2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08', '2026-11-09']);
    expect(addReadTime({ '2026-11-13': 86_390 }, '2026-11-13', 60)['2026-11-13']).toBe(86_400);
    expect(addReadTime({ '2026-11-13': 10 }, '2026-11-13', 0)).toEqual({ '2026-11-13': 10 });
    expect(parseReadTime('[')).toEqual({});
  });

  it('오늘(한국 날짜)과 최근 7일 합계', () => {
    const store = { '2026-11-06': 600, '2026-11-07': 120, '2026-11-12': 300, '2026-11-13': 1380 };
    // 11-07부터 11-13까지가 최근 7일 (11-06은 빠짐)
    expect(readTimeSummary(store, new Date(NOW))).toEqual({ today: 1380, week: 1800 });
    // 한국 시간 자정 직후(UTC 15:05)는 다음 날
    expect(readTimeSummary(store, new Date('2026-11-13T15:05:00Z')).today).toBe(0);
  });

  it('글: 0분 · 1분 미만 · 분 · 시간', () => {
    expect([0, 30, 60, 1380, 3600, 6000].map(formatReadDuration)).toEqual(['0분', '1분 미만', '1분', '23분', '1시간', '1시간 40분']);
  });
});

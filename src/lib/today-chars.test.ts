import { describe, expect, it } from 'vitest';
import { dayKey, msUntilNextDay, noteCount, openChapter, parseTodayStore, signedCount, type TodayStore, weekCounts, dayLabel } from '@/lib/today-chars';

describe('오늘 쓴 글자수', () => {
  it('날짜는 한국 시간, 다음 자정까지 남은 시간', () => {
    expect(dayKey(new Date('2026-11-13T14:59:59Z'))).toBe('2026-11-13'); // 밤 11:59:59
    expect(dayKey(new Date('2026-11-13T15:00:00Z'))).toBe('2026-11-14'); // 자정
    expect(dayKey(new Date('2026-12-31T15:30:00Z'))).toBe('2027-01-01');
    expect(msUntilNextDay(new Date('2026-11-13T14:59:59Z'))).toBe(1000);
    expect(msUntilNextDay(new Date('2026-11-13T15:00:00Z'))).toBe(24 * 60 * 60 * 1000);
  });

  it('처음 연 회차는 그때 글자수가 기준, 다른 회차에서 늘어난 만큼(지운 만큼은 뺌)은 합으로', () => {
    const store: TodayStore = { '2026-11-13': { '1': [100, 350], '3': [500, 420] } };
    expect(openChapter(store, '2026-11-13', '2', 17)).toEqual({ base: 17, others: 250 - 80 });
    // 다른 날 기록은 안 셈
    expect(openChapter(store, '2026-11-14', '2', 17)).toEqual({ base: 17, others: 0 });
  });

  it('다시 열면 그 사이 다른 곳에서 바뀐 만큼은 기준을 옮겨서 세지 않음', () => {
    const store: TodayStore = { '2026-11-13': { '2': [100, 300] } };
    // 이 기기에서 200자 쓰고 닫음 → 다른 기기에서 50자 더 씀 → 다시 열면 350자지만 오늘 몫은 그대로 200자
    const { base } = openChapter(store, '2026-11-13', '2', 350);
    expect(350 - base).toBe(200);
    // 다른 곳에서 많이 지워 기준이 음수가 되어도 그대로 이어 셈
    const shrunk = openChapter(store, '2026-11-13', '2', 20);
    expect(shrunk.base).toBe(-180);
    expect(parseTodayStore(JSON.stringify(noteCount(store, '2026-11-13', '2', shrunk.base, 20)))['2026-11-13']['2']).toEqual([-180, 20]);
  });

  it('바뀐 회차 줄만 바꾸고 최근 7일만 남김', () => {
    let store: TodayStore = {};
    for (let day = 1; day <= 9; day += 1) store = noteCount(store, `2026-11-0${day}`, '1', 0, day * 10);
    expect(Object.keys(store)).toEqual(['2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08', '2026-11-09']);
    const next = noteCount({ '2026-11-13': { '1': [10, 20] } }, '2026-11-13', '2', 5, 8);
    expect(next).toEqual({ '2026-11-13': { '1': [10, 20], '2': [5, 8] } });
  });

  it('모양이 틀린 저장 값은 버림', () => {
    expect(parseTodayStore(null)).toEqual({});
    expect(parseTodayStore('{망가짐')).toEqual({});
    expect(parseTodayStore('[1,2]')).toEqual({});
    expect(
      parseTodayStore(JSON.stringify({ '2026-11-13': { '1': [1, 2], '2': [1], '3': ['1', 2], '4': [1, -2], '5': [1.5, 2] }, 어제: { '1': [1, 2] }, '2026-11-12': 3 })),
    ).toEqual({ '2026-11-13': { '1': [1, 2] } });
  });

  it('부호 붙은 숫자', () => {
    expect(signedCount(1234)).toBe('+1,234');
    expect(signedCount(-120)).toBe('−120');
    expect(signedCount(0)).toBe('0');
  });
});

describe('최근 7일 쓴 글자수', () => {
  it('한국 시간 오래된 날부터 오늘까지 7칸, 회차를 더하고 지운 만큼 빼고, 기록 없는 날은 0', () => {
    // 한국 시간 11월 13일 오전 1시 (UTC로는 12일)
    const now = new Date('2026-11-12T16:00:00Z');
    const store = {
      '2026-11-13': { '1': [100, 350] as [number, number], '2': [50, 20] as [number, number] },
      '2026-11-11': { '1': [0, 1200] as [number, number] },
      '2026-11-06': { '1': [0, 999] as [number, number] }, // 7일보다 앞
    };
    expect(weekCounts(store, now)).toEqual([
      { date: '2026-11-07', count: 0 },
      { date: '2026-11-08', count: 0 },
      { date: '2026-11-09', count: 0 },
      { date: '2026-11-10', count: 0 },
      { date: '2026-11-11', count: 1200 },
      { date: '2026-11-12', count: 0 },
      { date: '2026-11-13', count: 220 },
    ]);
  });

  it('날짜 이름: 요일 한 글자와 긴 이름', () => {
    expect(dayLabel('2026-11-13')).toEqual({ weekday: '금', long: '11월 13일 (금)' });
    expect(dayLabel('2026-11-08')).toEqual({ weekday: '일', long: '11월 8일 (일)' });
  });
});

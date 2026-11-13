import { describe, expect, it } from 'vitest';
import type { TodayStore } from '@/lib/today-chars';
import { dayTotal, parseSprint, remainingClock, remainingWords, sprintMessage, sprintResultLabel, sprintWritten, startSprint } from '@/lib/writing-timer';

// 한국 시간 2026-11-13 14:00
const NOW = new Date('2026-11-13T05:00:00Z');
const store: TodayStore = {
  '2026-11-12': { '1': [100, 900] },
  '2026-11-13': { '1': [300, 500], '2': [17, 12] },
};

describe('글쓰기 타이머', () => {
  it('시작: 그날(한국 날짜) 모든 회차에서 늘어난 글자수를 기준으로, 끝나는 시각은 지금 + 분', () => {
    expect(dayTotal(store, '2026-11-13')).toBe(195);
    expect(dayTotal(store, '2026-11-14')).toBe(0);
    expect(startSprint(25, NOW, store)).toEqual({ minutes: 25, endsAt: NOW.getTime() + 25 * 60_000, startDate: '2026-11-13', startTotal: 195, result: null });
  });

  it('그동안 쓴 글자수: 회차를 옮겨 써도 · 지워도 · 자정을 넘겨도', () => {
    const sprint = startSprint(25, NOW, store);
    // 1화에 120자 더 쓰고, 3화를 처음 열어 40자 씀
    const later: TodayStore = { ...store, '2026-11-13': { '1': [300, 620], '2': [17, 12], '3': [0, 40] } };
    expect(sprintWritten(later, sprint)).toBe(160);
    // 1화에서 30자 지움
    expect(sprintWritten({ ...store, '2026-11-13': { ...store['2026-11-13'], '1': [300, 470] } }, sprint)).toBe(-30);
    // 자정이 지나 다음 날 50자 더 (전날 몫 + 다음 날 몫)
    const nextDay: TodayStore = { ...later, '2026-11-14': { '1': [620, 670] } };
    expect(sprintWritten(nextDay, sprint)).toBe(210);
  });

  it('저장값 읽기: 모양이 틀리거나 고를 수 없는 분이면 없는 것으로', () => {
    const ok = { minutes: 15, endsAt: 1_763_000_000_000, startDate: '2026-11-13', startTotal: -20, result: null };
    expect(parseSprint(JSON.stringify(ok))).toEqual(ok);
    expect(parseSprint(JSON.stringify({ ...ok, result: 412 }))?.result).toBe(412);
    expect(parseSprint(JSON.stringify({ ...ok, result: undefined }))?.result).toBeNull();
    for (const bad of [{ ...ok, minutes: 10 }, { ...ok, endsAt: 'soon' }, { ...ok, startDate: '11/13' }, { ...ok, startTotal: 1.5 }, { ...ok, result: '412' }, [ok]]) {
      expect(parseSprint(JSON.stringify(bad))).toBeNull();
    }
    expect(parseSprint('{')).toBeNull();
    expect(parseSprint(null)).toBeNull();
  });

  it('남은 시간 글자: 초는 올림, 낭독기용은 분·초 말로', () => {
    expect(remainingClock(25 * 60_000)).toBe('25:00');
    expect(remainingClock(24 * 60_000 + 12_001)).toBe('24:13');
    expect(remainingClock(1)).toBe('0:01');
    expect(remainingClock(-5000)).toBe('0:00');
    expect([remainingWords(24 * 60_000 + 13_000), remainingWords(25 * 60_000), remainingWords(13_000), remainingWords(0)]).toEqual(['24분 13초', '25분', '13초', '0초']);
  });

  it('끝 알림과 단추 글자', () => {
    expect(sprintMessage(25, 1234)).toBe('25분이 끝났어요. 그동안 1,234자를 썼어요');
    expect(sprintMessage(15, 0)).toBe('15분이 끝났어요. 그동안 늘어난 글자는 없어요');
    expect(sprintMessage(50, -120)).toBe('50분이 끝났어요. 그동안 글자수가 120자 줄었어요');
    expect([sprintResultLabel(412), sprintResultLabel(0), sprintResultLabel(-120)]).toEqual(['+412자', '0자', '−120자']);
  });
});

import { describe, expect, it } from 'vitest';
import { countReaders, daysAway, filterReaders, isAway, parseReaderFilter } from '@/lib/reader-filter';

const DAY = 86_400_000;
const now = new Date('2026-11-13T12:00:00+09:00');
const ago = (ms: number) => new Date(now.getTime() - ms);

describe('길드원 거르기', () => {
  it('주소 값: away만 알아듣고 나머지는 전체', () => {
    expect(parseReaderFilter('away')).toBe('away');
    expect(parseReaderFilter(['away', 'all'])).toBe('away');
    for (const value of [undefined, '', 'all', 'AWAY', 'gone', 3, null]) expect(parseReaderFilter(value), String(value)).toBe('all');
  });

  it('2주(14일)가 넘어야 오래 안 들어온 길드원 (딱 14일은 아직 아님)', () => {
    expect(isAway(ago(14 * DAY), now)).toBe(false);
    expect(isAway(ago(14 * DAY + 1), now)).toBe(true);
    expect(isAway(ago(13 * DAY), now)).toBe(false);
    expect(isAway(ago(30 * DAY), now)).toBe(true);
    // 시계가 어긋나 마지막 접속이 지금보다 뒤여도 오래 안 들어온 게 아님
    expect(isAway(new Date(now.getTime() + DAY), now)).toBe(false);
  });

  it('지난 날 수: 하루 단위로 버림, 하루가 안 되면 0', () => {
    expect(daysAway(ago(15 * DAY + 3 * 3_600_000), now)).toBe(15);
    expect(daysAway(ago(14 * DAY + 1), now)).toBe(14);
    expect(daysAway(ago(5 * 3_600_000), now)).toBe(0);
    expect(daysAway(new Date(now.getTime() + DAY), now)).toBe(0);
  });

  it('거르기와 수: 순서는 그대로', () => {
    const readers = [
      { name: '방금', lastSeenAt: ago(60_000) },
      { name: '15일', lastSeenAt: ago(15 * DAY) },
      { name: '14일', lastSeenAt: ago(14 * DAY) },
      { name: '40일', lastSeenAt: ago(40 * DAY) },
    ];
    expect(filterReaders(readers, 'all', now).map((reader) => reader.name)).toEqual(['방금', '15일', '14일', '40일']);
    expect(filterReaders(readers, 'away', now).map((reader) => reader.name)).toEqual(['15일', '40일']);
    expect(countReaders(readers, now)).toEqual({ all: 4, away: 2 });
    expect(countReaders([], now)).toEqual({ all: 0, away: 0 });
  });
});

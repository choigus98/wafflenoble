import { describe, expect, it } from 'vitest';
import { COVER_COLORS, COVER_COLOR_KEYS, autoCoverColor, isCoverColor, resolveCoverColor } from '@/lib/cover';

describe('표지 색', () => {
  it('자동 색은 예전과 같은 7가지를 작품 번호 순서대로 (이미 있는 작품의 색이 바뀌지 않음)', () => {
    const before = [
      ['#8a5a3b', '#f6e9dc'],
      ['#3f5f73', '#e3edf2'],
      ['#6b5986', '#eee7f5'],
      ['#4e6a4a', '#e6eee2'],
      ['#985049', '#f6e3df'],
      ['#76663a', '#f3ecd9'],
      ['#3d4f6e', '#e2e8f3'],
    ];
    for (let id = 1; id <= 21; id += 1) {
      const { background, foreground } = COVER_COLORS[autoCoverColor(id)];
      expect([background, foreground]).toEqual(before[id % before.length]);
    }
  });

  it('고른 색이 있으면 그 색, 비었거나 모르는 값이면 자동', () => {
    expect(resolveCoverColor(1, 'rose')).toBe('rose');
    expect(resolveCoverColor(1, null)).toBe(autoCoverColor(1));
    expect(resolveCoverColor(1, '')).toBe(autoCoverColor(1));
    expect(resolveCoverColor(1, 'red; background:url(x)')).toBe(autoCoverColor(1));
    expect(resolveCoverColor(1, 'toString')).toBe(autoCoverColor(1));
  });

  it('색 이름 목록과 검사가 맞물린다', () => {
    expect(COVER_COLOR_KEYS.every(isCoverColor)).toBe(true);
    expect(isCoverColor('constructor')).toBe(false);
    expect(new Set(COVER_COLOR_KEYS).size).toBe(COVER_COLOR_KEYS.length);
  });
});

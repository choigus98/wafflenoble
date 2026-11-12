import { describe, expect, it } from 'vitest';
import { READER_PREF_KEYS, THEME_COLORS, isDefaultReading, parseReaderPrefs, resetReadingPrefs, themeColorsFor } from '@/lib/reader-prefs';

describe('읽기 설정 저장값', () => {
  it('저장된 JSON을 읽고, 깨졌거나 이상한 값이면 빈 설정', () => {
    expect(parseReaderPrefs('{"theme":"dark","size":2}')).toEqual({ theme: 'dark', size: 2 });
    expect(parseReaderPrefs('{oops')).toEqual({});
    expect(parseReaderPrefs('[1,2]')).toEqual({});
    expect(parseReaderPrefs('null')).toEqual({});
    expect(parseReaderPrefs(null)).toEqual({});
  });

  it('화면 모드를 고르면 주소창 색은 기기 설정과 상관없이 그 색', () => {
    expect(themeColorsFor('dark')).toEqual({ light: THEME_COLORS.dark, dark: THEME_COLORS.dark });
    expect(themeColorsFor('light')).toEqual({ light: THEME_COLORS.light, dark: THEME_COLORS.light });
    expect(themeColorsFor(undefined)).toEqual({ light: THEME_COLORS.light, dark: THEME_COLORS.dark });
  });
});

describe('첫 화면 스크립트가 옮기는 값', () => {
  it('본문 폭·문단 간격·문단 정렬·바탕까지 여덟 가지 (빠지면 새로 고칠 때 설정이 잠깐 풀려 보임)', () => {
    expect([...READER_PREF_KEYS]).toEqual(['theme', 'size', 'leading', 'font', 'width', 'gap', 'align', 'bg']);
    expect(parseReaderPrefs('{"width":0,"size":3,"gap":2}')).toEqual({ width: 0, size: 3, gap: 2 });
  });
});

describe("읽기 설정 '처음대로'", () => {
  it('글자·간격·글꼴·본문 폭·문단 정렬·바탕은 지우고 화면 모드만 남긴다', () => {
    expect(resetReadingPrefs({ theme: 'dark', size: 3, leading: 2, gap: 0, font: 'serif', width: 2, align: 'justify', bg: 'paper' })).toEqual({ theme: 'dark' });
    expect(resetReadingPrefs({ size: 0 })).toEqual({});
  });

  it('이미 기본값이면 누를 게 없음 (보통 값을 적어 둔 것도 기본값)', () => {
    expect(isDefaultReading({})).toBe(true);
    expect(isDefaultReading({ theme: 'light', size: 1, leading: 1, font: 'sans' })).toBe(true);
    expect(isDefaultReading({ size: 2 })).toBe(false);
    expect(isDefaultReading({ gap: 0 })).toBe(false);
    expect(isDefaultReading({ font: 'serif' })).toBe(false);
    expect(isDefaultReading({ width: 2 })).toBe(false);
    expect(isDefaultReading({ align: 'justify' })).toBe(false);
    expect(isDefaultReading({ theme: 'light', bg: 'paper' })).toBe(false);
  });
});

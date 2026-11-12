import { describe, expect, it } from 'vitest';
import { READER_PREF_KEYS, THEME_COLORS, parseReaderPrefs, themeColorsFor } from '@/lib/reader-prefs';

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
  it('본문 폭까지 다섯 가지 (빠지면 새로 고칠 때 설정이 잠깐 풀려 보임)', () => {
    expect([...READER_PREF_KEYS]).toEqual(['theme', 'size', 'leading', 'font', 'width']);
    expect(parseReaderPrefs('{"width":0,"size":3}')).toEqual({ width: 0, size: 3 });
  });
});

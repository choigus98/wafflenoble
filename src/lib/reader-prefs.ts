// 이 기기의 읽기 설정 (글자 크기 · 줄 간격 · 글꼴 · 화면 모드 · 본문 폭). localStorage에 두고,
// 첫 화면을 그리기 전에 app/layout.tsx의 짧은 스크립트가 <html data-*>에 반영한다 (깜빡임 없이).
// 회차 화면의 '가'(읽기 설정)와 위쪽 바의 화면 모드 단추가 같은 값을 쓴다.

export type ThemeChoice = 'light' | 'dark'; // 없으면 기기 설정을 따름 ('자동')

export type ReaderPrefs = {
  size?: number; // 0~3
  leading?: number; // 0~2
  font?: 'sans' | 'serif';
  theme?: ThemeChoice;
  width?: number; // 0 좁게 · 2 넓게 (없으면 보통). 넓은 화면에서 한 줄 길이
};

export const READER_PREFS_KEY = 'wn:reader-settings';
const CHANGE_EVENT = 'wn:reader-settings';
/** <html data-*>로 옮기는 값들. app/layout.tsx의 첫 화면 스크립트도 이 목록을 쓴다 */
export const READER_PREF_KEYS = ['theme', 'size', 'leading', 'font', 'width'] as const;

/** 주소창·상태 표시줄 색 (layout.tsx의 viewport.themeColor와 같은 값) */
export const THEME_COLORS = { light: '#fbf7f1', dark: '#15120f' } as const;

export function subscribeReaderPrefs(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

export function readReaderPrefsRaw(): string {
  try {
    return localStorage.getItem(READER_PREFS_KEY) ?? '{}';
  } catch {
    return '{}';
  }
}

export function parseReaderPrefs(raw: string | null): ReaderPrefs {
  if (!raw) return {};
  try {
    const value = JSON.parse(raw);
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as ReaderPrefs) : {};
  } catch {
    return {};
  }
}

/**
 * theme-color 메타 두 개(밝은 기기용·어두운 기기용)에 넣을 색.
 * 화면 모드를 직접 고르면 기기 설정과 상관없이 둘 다 그 색, '자동'이면 원래대로
 */
export function themeColorsFor(theme: ThemeChoice | undefined): { light: string; dark: string } {
  if (theme) return { light: THEME_COLORS[theme], dark: THEME_COLORS[theme] };
  return { light: THEME_COLORS.light, dark: THEME_COLORS.dark };
}

function applyThemeColor(theme: ThemeChoice | undefined) {
  const colors = themeColorsFor(theme);
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    meta.content = meta.media.includes('dark') ? colors.dark : colors.light;
  }
}

export function saveReaderPrefs(prefs: ReaderPrefs) {
  const root = document.documentElement;
  for (const key of READER_PREF_KEYS) {
    const value = prefs[key];
    if (value === undefined) delete root.dataset[key];
    else root.dataset[key] = String(value);
  }
  applyThemeColor(prefs.theme);
  try {
    localStorage.setItem(READER_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // 사파리 비공개 모드 등에서는 저장이 안 될 수 있다. 화면에는 이번 방문 동안만 적용
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** 화면 모드만 바꾼다 (다른 읽기 설정은 그대로) */
export function saveThemeChoice(theme: ThemeChoice | undefined) {
  const prefs = parseReaderPrefs(readReaderPrefsRaw());
  if (theme) prefs.theme = theme;
  else delete prefs.theme;
  saveReaderPrefs(prefs);
}

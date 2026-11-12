// 작품 표지 색. 표지 이미지 없이 제목 + 색으로 만드는 텍스트 표지에 쓴다 (components/novel-cover.tsx).
// DB(novels.cover_color)에는 아래 색 이름만 저장한다 (임의의 CSS 값이 들어가지 않게). 비어 있으면 작품 번호로 자동.

export const COVER_COLORS = {
  brown: { label: '갈색', background: '#8a5a3b', foreground: '#f6e9dc' },
  slate: { label: '청회색', background: '#3f5f73', foreground: '#e3edf2' },
  violet: { label: '보라', background: '#6b5986', foreground: '#eee7f5' },
  green: { label: '초록', background: '#4e6a4a', foreground: '#e6eee2' },
  red: { label: '붉은 갈색', background: '#985049', foreground: '#f6e3df' },
  olive: { label: '올리브', background: '#76663a', foreground: '#f3ecd9' },
  navy: { label: '남색', background: '#3d4f6e', foreground: '#e2e8f3' },
  rose: { label: '장미', background: '#a24f6b', foreground: '#f8e4ec' },
  teal: { label: '청록', background: '#2f6a68', foreground: '#def0ee' },
  charcoal: { label: '먹색', background: '#3b3a3f', foreground: '#ececf0' },
} as const;

export type CoverColor = keyof typeof COVER_COLORS;

export const COVER_COLOR_KEYS = Object.keys(COVER_COLORS) as [CoverColor, ...CoverColor[]];

// 자동 색: 처음부터 쓰던 7가지를 작품 번호 순서대로. 이미 있는 작품의 색이 바뀌지 않도록 순서를 고정한다
const AUTO_COLORS: readonly CoverColor[] = ['brown', 'slate', 'violet', 'green', 'red', 'olive', 'navy'];

export function isCoverColor(value: unknown): value is CoverColor {
  return typeof value === 'string' && Object.hasOwn(COVER_COLORS, value);
}

export function autoCoverColor(id: number): CoverColor {
  const index = Number.isInteger(id) ? Math.abs(id) % AUTO_COLORS.length : 0;
  return AUTO_COLORS[index];
}

/** 고른 색이 있으면 그 색, 없거나 모르는 값이면 작품 번호로 정한 색 */
export function resolveCoverColor(id: number, color: string | null | undefined): CoverColor {
  return isCoverColor(color) ? color : autoCoverColor(id);
}

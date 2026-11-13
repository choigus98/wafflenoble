// 회차 읽는 시간 어림. 공백 포함 글자수를 1분에 600자로 나눠 반올림한다 (웹소설을 보통 속도로 읽을 때쯤).
// 템플릿(카톡·게시글 등) 안의 글은 글자수에 들어가지 않아서, 템플릿이 많은 회차는 조금 짧게 나올 수 있다.

export const READING_CHARS_PER_MINUTE = 600;

/** 글자수 → 분 (적어도 1분). 본문이 없으면 null */
export function readingMinutes(charCount: number): number | null {
  if (!Number.isFinite(charCount) || charCount <= 0) return null;
  return Math.max(1, Math.round(charCount / READING_CHARS_PER_MINUTE));
}

/** '약 8분', '약 1시간 5분', '약 2시간' */
export function formatReadingTime(minutes: number): string {
  if (minutes < 60) return `약 ${minutes}분`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `약 ${hours}시간` : `약 ${hours}시간 ${rest}분`;
}

// ─── 남은 읽는 시간 ──────────────────────────────────────
// 읽어 내려갈 때 '약 3분 남음': 화면 위쪽 머리 바로 아래의 '읽는 줄'보다 아래에 남은 글자수를 같은 속도로 나눈다.
// 줄 아래 덩어리(문단 등)는 다, 줄에 걸친 덩어리는 줄 아래쪽 비율만큼 센다. 템플릿처럼 글자수에 안 드는 덩어리는 chars 0

export type ReadUnit = { top: number; bottom: number; chars: number };

/** 읽는 줄(line)보다 아래에 남은 글자수 (top · bottom · line은 같은 기준의 세로 위치) */
export function remainingChars(units: readonly ReadUnit[], line: number): number {
  let total = 0;
  for (const unit of units) {
    if (unit.chars <= 0 || unit.bottom <= line) continue;
    total += unit.top >= line ? unit.chars : unit.chars * ((unit.bottom - line) / Math.max(1, unit.bottom - unit.top));
  }
  return Math.round(total);
}

/** '약 3분 남음' · '약 1시간 5분 남음' (남은 글자가 없으면 null) */
export function remainingLabel(chars: number): string | null {
  const minutes = readingMinutes(chars);
  return minutes === null ? null : `${formatReadingTime(minutes)} 남음`;
}

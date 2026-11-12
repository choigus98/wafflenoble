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

// 서버(Vercel)는 UTC라서 시간대를 명시하지 않으면 9시간 어긋난다
const TIME_ZONE = 'Asia/Seoul';

const partsFormatter = new Intl.DateTimeFormat('ko-KR', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function parts(date: Date) {
  const map: Record<string, string> = {};
  for (const part of partsFormatter.formatToParts(date)) map[part.type] = part.value;
  return map;
}

/** 2026.11.12 */
export function formatDate(date: Date): string {
  const p = parts(date);
  return `${p.year}.${p.month}.${p.day}`;
}

/** 2026.11.12 14:05 */
export function formatDateTime(date: Date): string {
  const p = parts(date);
  return `${p.year}.${p.month}.${p.day} ${p.hour}:${p.minute}`;
}

/** 14:05 */
export function formatTime(date: Date): string {
  const p = parts(date);
  return `${p.hour}:${p.minute}`;
}

/** 방금 / 5분 전 / 3시간 전 / 2일 전 / 2026.11.12 */
export function formatRelative(date: Date, now: Date): string {
  const diffMinutes = Math.floor((now.getTime() - date.getTime()) / 60_000);
  if (diffMinutes < 1) return '방금';
  if (diffMinutes < 60) return `${diffMinutes}분 전`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}시간 전`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}일 전`;
  return formatDate(date);
}

export function formatNumber(value: number): string {
  return value.toLocaleString('ko-KR');
}

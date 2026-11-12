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

const scheduleFormatter = new Intl.DateTimeFormat('ko-KR', {
  timeZone: TIME_ZONE,
  month: 'numeric',
  day: 'numeric',
  weekday: 'short',
  hour: 'numeric',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** 11월 13일 (금) 오후 8:00 — ICU마다 오전/오후 표기가 달라서(Node는 'PM') 직접 조립한다 */
export function formatSchedule(date: Date): string {
  const map: Record<string, string> = {};
  for (const part of scheduleFormatter.formatToParts(date)) map[part.type] = part.value;
  const hour = Number(map.hour);
  const period = hour < 12 ? '오전' : '오후';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${map.month}월 ${map.day}일 (${map.weekday}) ${period} ${hour12}:${map.minute}`;
}

export function formatNumber(value: number): string {
  return value.toLocaleString('ko-KR');
}

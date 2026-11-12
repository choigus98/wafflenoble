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

/** 2026-11-12 14:05 — 표 파일(CSV)용: 엑셀·구글 시트가 날짜로 알아보고, 글자 순서로 정렬해도 시간 순서 */
export function formatSheetDateTime(date: Date): string {
  const p = parts(date);
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`;
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

/**
 * 앞으로 남은 시간 (예약 공개까지): 곧 / 5분 뒤 / 2시간 59분 뒤 / 1일 2시간 뒤 / 10일 뒤.
 * 시간 단위로만 버리면 2시간 59분이 '2시간 뒤'로 보여서, 하루 안은 분까지 · 일주일 안은 시간까지
 */
export function formatUntil(date: Date, now: Date): string {
  const minutes = Math.floor((date.getTime() - now.getTime()) / 60_000);
  if (minutes < 1) return '곧';
  if (minutes < 60) return `${minutes}분 뒤`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return minutes % 60 ? `${hours}시간 ${minutes % 60}분 뒤` : `${hours}시간 뒤`;
  const days = Math.floor(hours / 24);
  return days < 7 && hours % 24 ? `${days}일 ${hours % 24}시간 뒤` : `${days}일 뒤`;
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

/**
 * 받침에 따라 조사만 고른다. 예: particle('자정의 손님', '을', '를') → '을'
 * 마지막 글자가 한글이 아니면 '을(를)'처럼 둘 다 쓴다
 */
export function particle(word: string, afterBatchim: string, afterVowel: string): string {
  const last = word.trim().at(-1);
  if (!last) return afterVowel;
  const code = last.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return `${afterBatchim}(${afterVowel})`;
  return (code - 0xac00) % 28 === 0 ? afterVowel : afterBatchim;
}

/** 단어 + 조사. 예: withParticle('자정의 손님', '을', '를') → '자정의 손님을' */
export function withParticle(word: string, afterBatchim: string, afterVowel: string): string {
  return `${word}${particle(word, afterBatchim, afterVowel)}`;
}

export function formatNumber(value: number): string {
  return value.toLocaleString('ko-KR');
}

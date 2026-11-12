import type { SerialStatus } from '@/lib/db/schema';

export const NICKNAME_MIN = 2;
export const NICKNAME_MAX = 12;

/** 이름 정규화. 표시용(display)과 중복 판정용(key)을 같이 돌려준다. 길이가 안 맞으면 null */
export function normalizeNickname(raw: string): { display: string; key: string } | null {
  const display = raw
    .normalize('NFC')
    .replace(/[\p{Cc}\p{Cf}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
  const key = display.toLowerCase();
  const length = [...display].length;
  if (length < NICKNAME_MIN || length > NICKNAME_MAX || [...key].length > NICKNAME_MAX) return null;
  return { display, key };
}

/** 로그인 후 돌아갈 경로. 외부 주소나 입장·관리자 경로로는 보내지 않는다 (오픈 리다이렉트 방지) */
export function safeNextPath(next: unknown): string {
  if (typeof next !== 'string') return '/';
  if (!next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return '/';
  if (next === '/enter' || next.startsWith('/enter?') || next.startsWith('/admin')) return '/';
  return next;
}

/** URL 경로의 숫자 id. 형식이 안 맞으면 null */
export function parseId(value: string): number | null {
  return /^[1-9]\d{0,8}$/.test(value) ? Number(value) : null;
}

export const SERIAL_STATUS_LABEL: Record<SerialStatus, string> = {
  ongoing: '연재중',
  completed: '완결',
  hiatus: '휴재',
};

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

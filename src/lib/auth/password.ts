import 'server-only';
import { createHash, createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const KEY_LENGTH = 32;

function scryptAsync(password: string, salt: Buffer, keyLength: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keyLength, (error, key) => (error ? reject(error) : resolve(key)));
  });
}

/** 길이와 상관없이 일정한 시간에 비교 (해시로 길이를 맞춘 뒤 timingSafeEqual) */
function safeEqual(a: string, b: string): boolean {
  const left = createHash('sha256').update(a.normalize('NFC')).digest();
  const right = createHash('sha256').update(b.normalize('NFC')).digest();
  return timingSafeEqual(left, right);
}

/** 길드 비밀번호 저장용 해시. 형식: `salt:hash` (둘 다 base64) */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password.normalize('NFC'), salt, KEY_LENGTH);
  return `${salt.toString('base64')}:${hash.toString('base64')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltB64, hashB64] = stored.split(':');
  if (!saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, 'base64');
  const actual = await scryptAsync(password.normalize('NFC'), Buffer.from(saltB64, 'base64'), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function isAdminPassword(input: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  return safeEqual(input, adminPassword);
}

/** 관리자 세션에 넣는 비밀번호 버전. ADMIN_PASSWORD가 바뀌면 값이 달라져 기존 세션이 무효가 됨 */
export function currentAdminPasswordVersion(): string | null {
  const adminPassword = process.env.ADMIN_PASSWORD;
  const secret = process.env.SESSION_SECRET;
  if (!adminPassword || !secret) return null;
  return createHmac('sha256', secret).update(adminPassword).digest('hex').slice(0, 16);
}

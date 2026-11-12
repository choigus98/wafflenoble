// proxy.ts에서도 쓰므로 DB나 server-only 모듈을 import하지 않는다
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

export const ADMIN_COOKIE = 'wn_admin';
export const READER_COOKIE = 'wn_reader';
export const ADMIN_MAX_AGE = 60 * 60 * 24 * 30; // 30일
export const READER_MAX_AGE = 60 * 60 * 24 * 180; // 180일

/** pv: 관리자 비밀번호에서 파생한 값. 비밀번호를 바꾸면 기존 세션이 전부 무효가 된다 */
export type AdminClaims = { typ: 'admin'; pv: string };
/** gv: 길드 비밀번호 버전. 비밀번호를 바꾸면 +1 되어 기존 쿠키가 무효가 된다 */
export type ReaderClaims = { typ: 'reader'; rid: string; name: string; gv: number };

function secretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET 환경변수가 없거나 32자보다 짧아요');
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(
  claims: AdminClaims | ReaderClaims,
  maxAgeSeconds: number,
): Promise<string> {
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${maxAgeSeconds}s`)
    .sign(secretKey());
}

async function verify(token: string | undefined): Promise<JWTPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ['HS256'] });
    return payload;
  } catch {
    return null;
  }
}

export async function verifyAdminToken(token: string | undefined): Promise<AdminClaims | null> {
  const payload = await verify(token);
  if (payload?.typ !== 'admin' || typeof payload.pv !== 'string') return null;
  return { typ: 'admin', pv: payload.pv };
}

export async function verifyReaderToken(token: string | undefined): Promise<ReaderClaims | null> {
  const payload = await verify(token);
  if (
    payload?.typ !== 'reader' ||
    typeof payload.rid !== 'string' ||
    typeof payload.name !== 'string' ||
    typeof payload.gv !== 'number'
  ) {
    return null;
  }
  return { typ: 'reader', rid: payload.rid, name: payload.name, gv: payload.gv };
}

export function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };
}

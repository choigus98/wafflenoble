import 'server-only';
import { createHash } from 'node:crypto';
import { and, count, eq, gt, lt } from 'drizzle-orm';
import { headers } from 'next/headers';
import { db } from '@/lib/db';
import { loginAttempts } from '@/lib/db/schema';

const WINDOW_MS = 15 * 60 * 1000; // 15분
const MAX_FAILURES = 5;
const RETENTION_MS = 24 * 60 * 60 * 1000; // 1일 지난 기록은 정리

export type AttemptScope = 'admin' | 'guild';

export const RATE_LIMIT_MESSAGE = '비밀번호를 여러 번 틀렸어요. 15분 뒤에 다시 시도해 주세요';

/** 요청 IP를 해시한 값. Vercel은 x-forwarded-for를 실제 클라이언트 IP로 덮어써 준다 */
export async function clientKey(): Promise<string> {
  const requestHeaders = await headers();
  const ip =
    requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    requestHeaders.get('x-real-ip') ||
    'local';
  return createHash('sha256')
    .update(`${ip}:${process.env.SESSION_SECRET ?? ''}`)
    .digest('hex');
}

export async function isRateLimited(scope: AttemptScope, key: string): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MS);
  const [row] = await db
    .select({ failures: count() })
    .from(loginAttempts)
    .where(
      and(
        eq(loginAttempts.scope, scope),
        eq(loginAttempts.ipHash, key),
        gt(loginAttempts.createdAt, since),
      ),
    );
  return (row?.failures ?? 0) >= MAX_FAILURES;
}

export async function recordFailure(scope: AttemptScope, key: string): Promise<void> {
  await db.insert(loginAttempts).values({ scope, ipHash: key });
  await db
    .delete(loginAttempts)
    .where(lt(loginAttempts.createdAt, new Date(Date.now() - RETENTION_MS)));
}

export async function clearFailures(scope: AttemptScope, key: string): Promise<void> {
  await db
    .delete(loginAttempts)
    .where(and(eq(loginAttempts.scope, scope), eq(loginAttempts.ipHash, key)));
}

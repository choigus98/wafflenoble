'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { currentAdminPasswordVersion, isAdminPassword } from '@/lib/auth/password';
import {
  RATE_LIMIT_MESSAGE,
  clearFailures,
  clientKey,
  isRateLimited,
  recordFailure,
} from '@/lib/auth/rate-limit';
import { ADMIN_COOKIE, ADMIN_MAX_AGE, sessionCookieOptions, signSession } from '@/lib/auth/session';
import type { ActionState } from '@/lib/action-state';

export async function loginAdmin(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const password = String(formData.get('password') ?? '');
  const version = currentAdminPasswordVersion();
  if (!version) {
    return { status: 'error', message: '서버에 ADMIN_PASSWORD·SESSION_SECRET이 아직 설정되지 않았어요' };
  }

  const key = await clientKey();
  if (await isRateLimited('admin', key)) return { status: 'error', message: RATE_LIMIT_MESSAGE };

  if (!isAdminPassword(password)) {
    await recordFailure('admin', key);
    return { status: 'error', message: '비밀번호가 맞지 않아요' };
  }
  await clearFailures('admin', key);

  const token = await signSession({ typ: 'admin', pv: version }, ADMIN_MAX_AGE);
  (await cookies()).set(ADMIN_COOKIE, token, sessionCookieOptions(ADMIN_MAX_AGE));
  redirect('/admin');
}

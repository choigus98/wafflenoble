'use server';

import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyPassword } from '@/lib/auth/password';
import {
  RATE_LIMIT_MESSAGE,
  clearFailures,
  clientKey,
  isRateLimited,
  recordFailure,
} from '@/lib/auth/rate-limit';
import {
  READER_COOKIE,
  READER_MAX_AGE,
  sessionCookieOptions,
  signSession,
  verifyReaderToken,
} from '@/lib/auth/session';
import { db } from '@/lib/db';
import { readers } from '@/lib/db/schema';
import { getGuildSettings } from '@/lib/settings';
import { NICKNAME_MAX, NICKNAME_MIN, normalizeNickname, safeNextPath } from '@/lib/utils';

export type EnterState =
  | { status: 'idle' }
  | { status: 'error'; message: string }
  | { status: 'confirm'; name: string }; // 이미 있는 이름 → 본인인지 한 번 확인

export async function enterGuild(_prev: EnterState, formData: FormData): Promise<EnterState> {
  const password = String(formData.get('password') ?? '');
  const nickname = normalizeNickname(String(formData.get('name') ?? ''));
  const next = safeNextPath(formData.get('next'));

  if (!password) return { status: 'error', message: '열람 비밀번호를 입력해 주세요' };
  if (!nickname) {
    return { status: 'error', message: `이름은 ${NICKNAME_MIN}~${NICKNAME_MAX}자로 입력해 주세요` };
  }

  const key = await clientKey();
  if (await isRateLimited('guild', key)) return { status: 'error', message: RATE_LIMIT_MESSAGE };

  const guild = await getGuildSettings();
  if (!guild.guildPasswordHash) {
    return { status: 'error', message: '아직 열람이 열리지 않았어요. 작가님께 물어봐 주세요' };
  }
  if (!(await verifyPassword(password, guild.guildPasswordHash))) {
    await recordFailure('guild', key);
    return { status: 'error', message: '열람 비밀번호가 맞지 않아요' };
  }
  await clearFailures('guild', key);

  const jar = await cookies();
  const remembered = await verifyReaderToken(jar.get(READER_COOKIE)?.value);
  let reader = await db.query.readers.findFirst({ where: eq(readers.nicknameKey, nickname.key) });

  // 같은 이름 = 같은 길드원. 이 기기에서 쓰던 이름이 아니면 본인인지 한 번 확인한다
  if (reader && reader.id !== remembered?.rid && formData.get('confirmName') !== reader.nickname) {
    return { status: 'confirm', name: reader.nickname };
  }

  if (reader) {
    await db.update(readers).set({ lastSeenAt: new Date() }).where(eq(readers.id, reader.id));
  } else {
    const [created] = await db
      .insert(readers)
      .values({ nickname: nickname.display, nicknameKey: nickname.key })
      .onConflictDoNothing({ target: readers.nicknameKey })
      .returning();
    // 동시에 같은 이름으로 들어온 경우 먼저 만들어진 쪽을 사용
    reader = created ?? (await db.query.readers.findFirst({ where: eq(readers.nicknameKey, nickname.key) }));
    if (!reader) return { status: 'error', message: '잠시 후 다시 시도해 주세요' };
  }

  const token = await signSession(
    { typ: 'reader', rid: reader.id, name: reader.nickname, gv: guild.guildPasswordVersion },
    READER_MAX_AGE,
  );
  jar.set(READER_COOKIE, token, sessionCookieOptions(READER_MAX_AGE));
  redirect(next);
}

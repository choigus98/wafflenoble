'use server';

import { and, eq, sql } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getReader } from '@/lib/auth/guards';
import { READER_COOKIE, READER_MAX_AGE, sessionCookieOptions, signSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { isUniqueViolation } from '@/lib/db/errors';
import { chapterLikes, chapterViews, readers } from '@/lib/db/schema';
import { getLikeSummary, isChapterOpenToReaders, type LikeSummary } from '@/lib/queries/reactions';
import { getGuildSettings } from '@/lib/settings';
import { NICKNAME_MAX, NICKNAME_MIN, normalizeNickname } from '@/lib/utils';
import type { ActionState } from '@/lib/action-state';

function isValidId(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

/** 좋아요 켜기/끄기. 토글이 아니라 원하는 상태를 받아서 연타해도 결과가 꼬이지 않게 한다 */
export async function setLike(
  chapterId: number,
  liked: boolean,
): Promise<LikeSummary | { error: string }> {
  const reader = await getReader();
  if (!reader) return { error: '길드원으로 입장해야 좋아요를 누를 수 있어요' };
  if (!isValidId(chapterId) || typeof liked !== 'boolean') return { error: '잘못된 요청이에요' };
  if (!(await isChapterOpenToReaders(chapterId))) return { error: '볼 수 없는 회차예요' };

  if (liked) {
    await db.insert(chapterLikes).values({ chapterId, readerId: reader.id }).onConflictDoNothing();
  } else {
    await db
      .delete(chapterLikes)
      .where(and(eq(chapterLikes.chapterId, chapterId), eq(chapterLikes.readerId, reader.id)));
  }
  return getLikeSummary(chapterId, reader.id);
}

/** 회차 열람 기록. 30분 안에 다시 열면 횟수는 그대로 두고 마지막 열람 시각만 갱신 (이어 읽기용) */
export async function recordView(chapterId: number): Promise<void> {
  const reader = await getReader();
  if (!reader || !isValidId(chapterId)) return;
  if (!(await isChapterOpenToReaders(chapterId))) return;

  await db
    .insert(chapterViews)
    .values({ chapterId, readerId: reader.id })
    .onConflictDoUpdate({
      target: [chapterViews.chapterId, chapterViews.readerId],
      set: {
        viewCount: sql`case
          when ${chapterViews.lastViewedAt} < now() - interval '30 minutes' then ${chapterViews.viewCount} + 1
          else ${chapterViews.viewCount}
        end`,
        lastViewedAt: sql`now()`,
      },
    });
  await db.update(readers).set({ lastSeenAt: sql`now()` }).where(eq(readers.id, reader.id));
}

export async function changeNickname(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const reader = await getReader();
  if (!reader) return { status: 'error', message: '다시 입장해 주세요' };

  const nickname = normalizeNickname(String(formData.get('name') ?? ''));
  if (!nickname) {
    return { status: 'error', message: `이름은 ${NICKNAME_MIN}~${NICKNAME_MAX}자로 입력해 주세요` };
  }
  if (nickname.display === reader.nickname) return { status: 'error', message: '지금 쓰는 이름과 같아요' };

  try {
    await db
      .update(readers)
      .set({ nickname: nickname.display, nicknameKey: nickname.key })
      .where(eq(readers.id, reader.id));
  } catch (error) {
    if (isUniqueViolation(error)) return { status: 'error', message: '다른 길드원이 쓰고 있는 이름이에요' };
    throw error;
  }

  // 쿠키의 이름도 바꿔 둔다 (다음 입장 때 이름 칸 미리 채우기용). 쿠키를 바꾸면 현재 화면이 다시 그려짐
  const guild = await getGuildSettings();
  const token = await signSession(
    { typ: 'reader', rid: reader.id, name: nickname.display, gv: guild.guildPasswordVersion },
    READER_MAX_AGE,
  );
  (await cookies()).set(READER_COOKIE, token, sessionCookieOptions(READER_MAX_AGE));
  return { status: 'success', at: Date.now() };
}

export async function leaveGuild(): Promise<void> {
  (await cookies()).delete(READER_COOKIE);
  redirect('/enter');
}

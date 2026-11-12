import 'server-only';
import { eq } from 'drizzle-orm';
import { cache } from 'react';
import { db } from '@/lib/db';
import { settings } from '@/lib/db/schema';

/** 길드 열람 비밀번호 설정. 한 요청 안에서는 한 번만 조회 */
export const getGuildSettings = cache(async () => {
  const row = await db.query.settings.findFirst({ where: eq(settings.id, 1) });
  return {
    guildPasswordHash: row?.guildPasswordHash ?? null,
    guildPasswordVersion: row?.guildPasswordVersion ?? 1,
    updatedAt: row?.updatedAt ?? null,
  };
});

import 'server-only';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { chapterLikes, chapters, novels, readers } from '@/lib/db/schema';

export type LikeSummary = { liked: boolean; count: number; names: string[] };

/** 회차 좋아요 수와 누른 사람 이름 (좋아요는 이름까지 공개) */
export async function getLikeSummary(chapterId: number, readerId: string | null): Promise<LikeSummary> {
  const rows = await db
    .select({ readerId: chapterLikes.readerId, nickname: readers.nickname })
    .from(chapterLikes)
    .innerJoin(readers, eq(readers.id, chapterLikes.readerId))
    .where(eq(chapterLikes.chapterId, chapterId))
    .orderBy(asc(chapterLikes.createdAt));
  return {
    liked: readerId ? rows.some((row) => row.readerId === readerId) : false,
    count: rows.length,
    names: rows.map((row) => row.nickname),
  };
}

/** 길드원에게 보이는 회차인지 (공개 작품의 발행된 회차) */
export async function isChapterOpenToReaders(chapterId: number): Promise<boolean> {
  const [row] = await db
    .select({ id: chapters.id })
    .from(chapters)
    .innerJoin(novels, eq(novels.id, chapters.novelId))
    .where(
      and(eq(chapters.id, chapterId), eq(chapters.status, 'published'), eq(novels.isPublished, true)),
    )
    .limit(1);
  return Boolean(row);
}

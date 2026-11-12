import 'server-only';
import { and, asc, desc, eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth/guards';
import { db } from '@/lib/db';
import { chapterLikes, chapterViews, chapters, novels, readers } from '@/lib/db/schema';
import { getGuildSettings } from '@/lib/settings';
import {
  chapterLikeCount,
  chapterReaderCount,
  isScheduledChapter,
  novelChapterCount,
  novelScheduledChapterCount,
  novelVisibleChapterCount,
  readerLikeCount,
  readerReadCount,
} from './visibility';

// 관리자 전용 조회. 모든 함수가 첫 줄에서 requireAdmin()을 호출한다.

export async function adminListNovels() {
  await requireAdmin();
  return db
    .select({
      id: novels.id,
      title: novels.title,
      serialStatus: novels.serialStatus,
      isPublished: novels.isPublished,
      updatedAt: novels.updatedAt,
      totalChapters: novelChapterCount,
      publishedChapters: novelVisibleChapterCount,
      scheduledChapters: novelScheduledChapterCount,
    })
    .from(novels)
    .orderBy(desc(novels.updatedAt));
}

export async function adminGetNovel(novelId: number) {
  await requireAdmin();
  const novel = await db.query.novels.findFirst({ where: eq(novels.id, novelId) });
  if (!novel) return null;
  const list = await db
    .select({
      id: chapters.id,
      position: chapters.position,
      title: chapters.title,
      status: chapters.status,
      charCount: chapters.charCount,
      publishedAt: chapters.publishedAt,
      scheduled: isScheduledChapter,
      updatedAt: chapters.updatedAt,
      readCount: chapterReaderCount,
      likeCount: chapterLikeCount,
    })
    .from(chapters)
    .where(eq(chapters.novelId, novelId))
    .orderBy(asc(chapters.position), asc(chapters.id));
  return { novel, chapters: list };
}

export async function adminGetChapter(novelId: number, chapterId: number) {
  await requireAdmin();
  const [row] = await db
    .select({ chapter: chapters, novelTitle: novels.title, scheduled: isScheduledChapter })
    .from(chapters)
    .innerJoin(novels, eq(novels.id, chapters.novelId))
    .where(and(eq(chapters.id, chapterId), eq(chapters.novelId, novelId)))
    .limit(1);
  if (!row) return null;

  const [viewers, likers] = await Promise.all([
    db
      .select({
        nickname: readers.nickname,
        viewCount: chapterViews.viewCount,
        lastViewedAt: chapterViews.lastViewedAt,
      })
      .from(chapterViews)
      .innerJoin(readers, eq(readers.id, chapterViews.readerId))
      .where(eq(chapterViews.chapterId, chapterId))
      .orderBy(desc(chapterViews.lastViewedAt)),
    db
      .select({ nickname: readers.nickname })
      .from(chapterLikes)
      .innerJoin(readers, eq(readers.id, chapterLikes.readerId))
      .where(eq(chapterLikes.chapterId, chapterId))
      .orderBy(asc(chapterLikes.createdAt)),
  ]);

  return {
    chapter: row.chapter,
    scheduled: row.scheduled,
    novelTitle: row.novelTitle,
    viewers,
    likers: likers.map((liker) => liker.nickname),
  };
}

export async function adminListReaders() {
  await requireAdmin();
  return db
    .select({
      id: readers.id,
      nickname: readers.nickname,
      createdAt: readers.createdAt,
      lastSeenAt: readers.lastSeenAt,
      readChapters: readerReadCount,
      likes: readerLikeCount,
    })
    .from(readers)
    .orderBy(desc(readers.lastSeenAt));
}

export async function adminGetGuildSettings() {
  await requireAdmin();
  const guild = await getGuildSettings();
  return { hasPassword: Boolean(guild.guildPasswordHash), updatedAt: guild.updatedAt };
}

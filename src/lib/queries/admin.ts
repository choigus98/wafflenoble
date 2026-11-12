import 'server-only';
import { and, asc, count, countDistinct, desc, eq, gt, sql } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth/guards';
import { db } from '@/lib/db';
import { parseCharacters } from '@/lib/characters';
import { htmlExcerpt } from '@/lib/content';
import { chapterLikes, chapterNotes, chapterRevisions, chapterViews, chapters, novels, readers } from '@/lib/db/schema';
import { getGuildSettings } from '@/lib/settings';
import { weekReadsByNovel } from '@/lib/week-reads';
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
      coverColor: novels.coverColor,
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
  const [list, [members]] = await Promise.all([
    db
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
      .orderBy(asc(chapters.position), asc(chapters.id)),
    // 회차별 '길드원 N명 중 M명 읽음'의 N
    db.select({ total: count() }).from(readers),
  ]);
  return { novel, chapters: list, totalReaders: members?.total ?? 0 };
}

/** 관리자 홈 '예약된 회차': 모든 작품에서 아직 공개 전인 예약 회차를 공개 시각이 빠른 순으로 */
export async function adminListScheduledChapters(limit = 50) {
  await requireAdmin();
  const rows = await db
    .select({
      chapterId: chapters.id,
      novelId: chapters.novelId,
      novelTitle: novels.title,
      novelPublished: novels.isPublished,
      position: chapters.position,
      title: chapters.title,
      publishedAt: chapters.publishedAt,
    })
    .from(chapters)
    .innerJoin(novels, eq(novels.id, chapters.novelId))
    .where(isScheduledChapter)
    .orderBy(asc(chapters.publishedAt), asc(chapters.id))
    .limit(limit);
  // 예약 회차는 공개 시각이 늘 있다 (타입만 좁힌다)
  return rows.flatMap((row) => (row.publishedAt ? [{ ...row, publishedAt: row.publishedAt }] : []));
}

/** 작품 전체 텍스트 내보내기: 회차를 순서대로 (published면 길드원에게 보이는 회차만 — 임시저장·예약 대기는 뺀다) */
export async function adminExportNovelText(novelId: number, scope: 'all' | 'published') {
  await requireAdmin();
  const novel = await db.query.novels.findFirst({ where: eq(novels.id, novelId) });
  if (!novel) return null;
  const rows = await db
    .select({
      position: chapters.position,
      title: chapters.title,
      contentHtml: chapters.contentHtml,
      authorNote: chapters.authorNote,
      status: chapters.status,
      scheduled: isScheduledChapter,
    })
    .from(chapters)
    .where(eq(chapters.novelId, novelId))
    .orderBy(asc(chapters.position), asc(chapters.id));
  const list = scope === 'published' ? rows.filter((row) => row.status === 'published' && !row.scheduled) : rows;
  return { novel, chapters: list };
}

export type RevisionItem = { id: number; createdAt: string; title: string; charCount: number; excerpt: string };

/** 이 회차의 이전 발행본 (최근 것부터 10개) */
export async function adminListRevisions(chapterId: number): Promise<RevisionItem[]> {
  await requireAdmin();
  const rows = await db
    .select({
      id: chapterRevisions.id,
      createdAt: chapterRevisions.createdAt,
      title: chapterRevisions.title,
      charCount: chapterRevisions.charCount,
      contentHtml: chapterRevisions.contentHtml,
    })
    .from(chapterRevisions)
    .where(eq(chapterRevisions.chapterId, chapterId))
    .orderBy(desc(chapterRevisions.createdAt), desc(chapterRevisions.id))
    .limit(10);
  return rows.map((row) => ({
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    title: row.title,
    charCount: row.charCount,
    excerpt: htmlExcerpt(row.contentHtml),
  }));
}

export async function adminGetChapter(novelId: number, chapterId: number) {
  await requireAdmin();
  const [row] = await db
    .select({ chapter: chapters, novelTitle: novels.title, novelCharacters: novels.characters, scheduled: isScheduledChapter })
    .from(chapters)
    .innerJoin(novels, eq(novels.id, chapters.novelId))
    .where(and(eq(chapters.id, chapterId), eq(chapters.novelId, novelId)))
    .limit(1);
  if (!row) return null;

  const [viewers, likers, revisions, [note]] = await Promise.all([
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
    adminListRevisions(chapterId),
    // 작가 메모 (관리자 화면에서만)
    db.select({ body: chapterNotes.body }).from(chapterNotes).where(eq(chapterNotes.chapterId, chapterId)).limit(1),
  ]);

  return {
    chapter: row.chapter,
    privateNote: note?.body ?? '',
    scheduled: row.scheduled,
    novelTitle: row.novelTitle,
    // 에디터 '등장인물 횟수' 창에 쓸 이름들 (작품 정보의 등장인물 칸)
    characters: parseCharacters(row.novelCharacters).map((character) => character.name),
    viewers,
    likers: likers.map((liker) => liker.nickname),
    revisions,
  };
}

export async function adminListReaders() {
  await requireAdmin();
  const [list, lastReads] = await Promise.all([
    db
      .select({
        id: readers.id,
        nickname: readers.nickname,
        createdAt: readers.createdAt,
        lastSeenAt: readers.lastSeenAt,
        readChapters: readerReadCount,
        likes: readerLikeCount,
      })
      .from(readers)
      .orderBy(desc(readers.lastSeenAt)),
    // 길드원마다 가장 최근에 연 회차 하나 (distinct on)
    db
      .selectDistinctOn([chapterViews.readerId], {
        readerId: chapterViews.readerId,
        at: chapterViews.lastViewedAt,
        chapterId: chapters.id,
        novelId: chapters.novelId,
        position: chapters.position,
        title: chapters.title,
        novelTitle: novels.title,
      })
      .from(chapterViews)
      .innerJoin(chapters, eq(chapters.id, chapterViews.chapterId))
      .innerJoin(novels, eq(novels.id, chapters.novelId))
      .orderBy(chapterViews.readerId, desc(chapterViews.lastViewedAt)),
  ]);
  const lastReadBy = new Map(lastReads.map((row) => [row.readerId, row]));
  return list.map((reader) => ({ ...reader, lastRead: lastReadBy.get(reader.id) ?? null }));
}

export async function adminGetGuildSettings() {
  await requireAdmin();
  const guild = await getGuildSettings();
  return { hasPassword: Boolean(guild.guildPasswordHash), updatedAt: guild.updatedAt };
}

// ─── 최근 반응 ─────────────────────────────────────────

export type Activity =
  | { kind: 'like'; at: Date; nickname: string; novelId: number; chapterId: number; position: number; chapterTitle: string }
  | {
      kind: 'read';
      at: Date;
      nickname: string;
      novelId: number;
      chapterId: number;
      position: number;
      chapterTitle: string;
      viewCount: number;
    }
  | { kind: 'join'; at: Date; nickname: string };

/** 좋아요·읽음·새 길드원을 시간 순서로 섞은 최근 반응. 종류마다 최근 것만 가져와 합친다 */
export async function adminRecentActivity(limit = 20): Promise<Activity[]> {
  await requireAdmin();
  const chapterColumns = {
    nickname: readers.nickname,
    novelId: chapters.novelId,
    chapterId: chapters.id,
    position: chapters.position,
    chapterTitle: chapters.title,
  };
  const [likes, reads, joins] = await Promise.all([
    db
      .select({ at: chapterLikes.createdAt, ...chapterColumns })
      .from(chapterLikes)
      .innerJoin(readers, eq(readers.id, chapterLikes.readerId))
      .innerJoin(chapters, eq(chapters.id, chapterLikes.chapterId))
      .orderBy(desc(chapterLikes.createdAt))
      .limit(limit),
    db
      .select({ at: chapterViews.lastViewedAt, viewCount: chapterViews.viewCount, ...chapterColumns })
      .from(chapterViews)
      .innerJoin(readers, eq(readers.id, chapterViews.readerId))
      .innerJoin(chapters, eq(chapters.id, chapterViews.chapterId))
      .orderBy(desc(chapterViews.lastViewedAt))
      .limit(limit),
    db.select({ at: readers.createdAt, nickname: readers.nickname }).from(readers).orderBy(desc(readers.createdAt)).limit(limit),
  ]);

  return [
    ...likes.map((row) => ({ kind: 'like' as const, ...row })),
    ...reads.map((row) => ({ kind: 'read' as const, ...row })),
    ...joins.map((row) => ({ kind: 'join' as const, ...row })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, limit);
}

/** 최근 24시간 요약: 읽은 사람 수, 좋아요 수, 새 길드원 수 */
/** 관리자 홈 작품 목록: 작품마다 최근 7일 동안 읽은 길드원 수와 가장 많이 읽힌 회차 (lib/week-reads.ts) */
export async function adminWeekReads() {
  await requireAdmin();
  const since = sql`now() - interval '7 days'`;
  const recent = gt(chapterViews.lastViewedAt, since);
  const [perNovel, perChapter] = await Promise.all([
    db
      .select({ novelId: chapters.novelId, readers: countDistinct(chapterViews.readerId) })
      .from(chapterViews)
      .innerJoin(chapters, eq(chapters.id, chapterViews.chapterId))
      .where(recent)
      .groupBy(chapters.novelId),
    db
      .select({ novelId: chapters.novelId, chapterId: chapters.id, position: chapters.position, title: chapters.title, readers: count() })
      .from(chapterViews)
      .innerJoin(chapters, eq(chapters.id, chapterViews.chapterId))
      .where(recent)
      .groupBy(chapters.novelId, chapters.id, chapters.position, chapters.title),
  ]);
  return weekReadsByNovel(perNovel, perChapter);
}

export async function adminLast24h() {
  await requireAdmin();
  const since = sql`now() - interval '24 hours'`;
  const [[reads], [likes], [joins]] = await Promise.all([
    db.select({ value: countDistinct(chapterViews.readerId) }).from(chapterViews).where(gt(chapterViews.lastViewedAt, since)),
    db.select({ value: count() }).from(chapterLikes).where(gt(chapterLikes.createdAt, since)),
    db.select({ value: count() }).from(readers).where(gt(readers.createdAt, since)),
  ]);
  return { readers: reads?.value ?? 0, likes: likes?.value ?? 0, joins: joins?.value ?? 0 };
}

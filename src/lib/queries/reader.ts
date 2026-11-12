import 'server-only';
import { and, asc, count, desc, eq, gt, lt, or, sql } from 'drizzle-orm';
import { requireViewer } from '@/lib/auth/guards';
import { db } from '@/lib/db';
import { chapterViews, chapters, novels } from '@/lib/db/schema';
import { getLikeSummary } from './reactions';
import {
  chapterLikeCount,
  chapterReadBy,
  isScheduledChapter,
  isVisibleChapter,
  novelLastVisibleAt,
  novelVisibleChapterCount,
} from './visibility';

// 모든 조회 함수는 첫 줄에서 requireViewer()로 권한을 확인한다 (Data Access Layer).
// 길드원은 공개 작품의 '공개 시각이 지난' 발행 회차만(예약 발행 포함), 관리자는 전부 본다.
// 누가 읽었는지(이름)는 여기서 절대 조회하지 않는다 — 관리자 화면 전용.


export async function listNovels() {
  const viewer = await requireViewer();
  const isAdmin = viewer.kind === 'admin';
  const rows = await db
    .select({
      id: novels.id,
      title: novels.title,
      description: novels.description,
      serialStatus: novels.serialStatus,
      isPublished: novels.isPublished,
      lastPublishedAt: novelLastVisibleAt,
      chapterCount: novelVisibleChapterCount,
    })
    .from(novels)
    .where(isAdmin ? undefined : eq(novels.isPublished, true))
    .orderBy(sql`${novelLastVisibleAt} desc nulls last`, desc(novels.createdAt));
  return { viewer, novels: rows };
}

export async function getNovelDetail(novelId: number) {
  const viewer = await requireViewer();
  const isAdmin = viewer.kind === 'admin';
  const readerId = viewer.kind === 'reader' ? viewer.reader.id : null;

  const novel = await db.query.novels.findFirst({ where: eq(novels.id, novelId) });
  if (!novel || (!isAdmin && !novel.isPublished)) return null;

  const readByMe = readerId ? chapterReadBy(readerId) : sql<boolean>`false`;

  const list = await db
    .select({
      id: chapters.id,
      position: chapters.position,
      title: chapters.title,
      status: chapters.status,
      publishedAt: chapters.publishedAt,
      scheduled: isScheduledChapter,
      likeCount: chapterLikeCount,
      readByMe,
    })
    .from(chapters)
    .where(and(eq(chapters.novelId, novelId), isAdmin ? undefined : isVisibleChapter))
    .orderBy(asc(chapters.position), asc(chapters.id));

  // 이어 읽기: 이 길드원이 이 작품에서 가장 최근에 연 회차
  let continueChapter: { id: number; position: number } | null = null;
  if (readerId) {
    const [row] = await db
      .select({ id: chapters.id, position: chapters.position })
      .from(chapterViews)
      .innerJoin(chapters, eq(chapters.id, chapterViews.chapterId))
      .where(
        and(
          eq(chapterViews.readerId, readerId),
          eq(chapters.novelId, novelId),
          isVisibleChapter,
        ),
      )
      .orderBy(desc(chapterViews.lastViewedAt))
      .limit(1);
    continueChapter = row ?? null;
  }

  return { viewer, novel, chapters: list, continueChapter };
}

export async function getChapterView(novelId: number, chapterId: number) {
  const viewer = await requireViewer();
  const isAdmin = viewer.kind === 'admin';
  const readerId = viewer.kind === 'reader' ? viewer.reader.id : null;

  const [row] = await db
    .select({
      chapter: {
        id: chapters.id,
        position: chapters.position,
        title: chapters.title,
        contentHtml: chapters.contentHtml,
        status: chapters.status,
        publishedAt: chapters.publishedAt,
        visibleNow: isVisibleChapter,
      },
      novel: { id: novels.id, title: novels.title, isPublished: novels.isPublished },
    })
    .from(chapters)
    .innerJoin(novels, eq(novels.id, chapters.novelId))
    .where(and(eq(chapters.id, chapterId), eq(chapters.novelId, novelId)))
    .limit(1);
  if (!row) return null;
  if (!isAdmin && (!row.novel.isPublished || !row.chapter.visibleNow)) return null;

  const { chapter } = row;
  const visible = isAdmin
    ? eq(chapters.novelId, novelId)
    : and(eq(chapters.novelId, novelId), isVisibleChapter);
  const navColumns = { id: chapters.id, position: chapters.position, title: chapters.title };

  const [[prev], [next], likes, [reads], [myView]] = await Promise.all([
    db
      .select(navColumns)
      .from(chapters)
      .where(
        and(
          visible,
          or(
            lt(chapters.position, chapter.position),
            and(eq(chapters.position, chapter.position), lt(chapters.id, chapter.id)),
          ),
        ),
      )
      .orderBy(desc(chapters.position), desc(chapters.id))
      .limit(1),
    db
      .select(navColumns)
      .from(chapters)
      .where(
        and(
          visible,
          or(
            gt(chapters.position, chapter.position),
            and(eq(chapters.position, chapter.position), gt(chapters.id, chapter.id)),
          ),
        ),
      )
      .orderBy(asc(chapters.position), asc(chapters.id))
      .limit(1),
    getLikeSummary(chapter.id, readerId),
    db.select({ readers: count() }).from(chapterViews).where(eq(chapterViews.chapterId, chapter.id)),
    readerId
      ? db
          .select({ chapterId: chapterViews.chapterId })
          .from(chapterViews)
          .where(and(eq(chapterViews.chapterId, chapter.id), eq(chapterViews.readerId, readerId)))
          .limit(1)
      : Promise.resolve([]),
  ]);

  // 열람 기록은 화면이 뜬 뒤에 저장되므로, 처음 여는 길드원은 본인을 미리 세어 준다
  const countsSelf = readerId !== null && chapter.visibleNow && !myView;

  return {
    viewer,
    novel: { id: row.novel.id, title: row.novel.title },
    chapter,
    prev: prev ?? null,
    next: next ?? null,
    likes,
    readCount: (reads?.readers ?? 0) + (countsSelf ? 1 : 0),
  };
}

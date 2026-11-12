import 'server-only';
import { and, asc, count, desc, eq, sql } from 'drizzle-orm';
import { requireViewer } from '@/lib/auth/guards';
import { db } from '@/lib/db';
import { chapterViews, chapters, novels } from '@/lib/db/schema';
import { getLikeSummary } from './reactions';
import {
  chapterIsNewFor,
  chapterLikeCount,
  chapterReadBy,
  isScheduledChapter,
  isVisibleChapter,
  novelLastVisibleAt,
  novelNewChapterCount,
  novelVisibleChapterCount,
} from './visibility';

// 모든 조회 함수는 첫 줄에서 requireViewer()로 권한을 확인한다 (Data Access Layer).
// 길드원은 공개 작품의 '공개 시각이 지난' 발행 회차만(예약 발행 포함), 관리자는 전부 본다.
// 누가 읽었는지(이름)는 여기서 절대 조회하지 않는다 — 관리자 화면 전용.


export async function listNovels() {
  const viewer = await requireViewer();
  const isAdmin = viewer.kind === 'admin';
  const readerId = viewer.kind === 'reader' ? viewer.reader.id : null;
  const rows = await db
    .select({
      id: novels.id,
      title: novels.title,
      description: novels.description,
      serialStatus: novels.serialStatus,
      isPublished: novels.isPublished,
      coverColor: novels.coverColor,
      lastPublishedAt: novelLastVisibleAt,
      chapterCount: novelVisibleChapterCount,
      // 이 길드원이 아직 안 읽은 새 회차 수 (관리자는 0)
      newChapters: readerId ? novelNewChapterCount(readerId) : sql<number>`0`,
    })
    .from(novels)
    .where(isAdmin ? undefined : eq(novels.isPublished, true))
    .orderBy(sql`${novelLastVisibleAt} desc nulls last`, desc(novels.createdAt));
  return { viewer, novels: rows };
}

/** 이 작품에서 다음에 공개될 예약 회차의 공개 시각. 제목·내용은 알려 주지 않는다 */
async function nextScheduledAt(novelId: number): Promise<Date | null> {
  const [row] = await db
    .select({ at: sql<Date | null>`min(${chapters.publishedAt})`.mapWith(chapters.publishedAt) })
    .from(chapters)
    .where(and(eq(chapters.novelId, novelId), isScheduledChapter));
  return row?.at ?? null;
}

export async function getNovelDetail(novelId: number) {
  const viewer = await requireViewer();
  const isAdmin = viewer.kind === 'admin';
  const readerId = viewer.kind === 'reader' ? viewer.reader.id : null;

  const novel = await db.query.novels.findFirst({ where: eq(novels.id, novelId) });
  if (!novel || (!isAdmin && !novel.isPublished)) return null;

  const readByMe = readerId ? chapterReadBy(readerId) : sql<boolean>`false`;
  const isNew = readerId ? chapterIsNewFor(readerId) : sql<boolean>`false`;

  const [list, nextAt] = await Promise.all([
    db
      .select({
        id: chapters.id,
        position: chapters.position,
        title: chapters.title,
        status: chapters.status,
        publishedAt: chapters.publishedAt,
        scheduled: isScheduledChapter,
        likeCount: chapterLikeCount,
        charCount: chapters.charCount, // 읽는 시간 어림용
        readByMe,
        isNew,
      })
      .from(chapters)
      .where(and(eq(chapters.novelId, novelId), isAdmin ? undefined : isVisibleChapter))
      .orderBy(asc(chapters.position), asc(chapters.id)),
    nextScheduledAt(novelId),
  ]);

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

  return { viewer, novel, chapters: list, continueChapter, nextScheduledAt: nextAt };
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
        authorNote: chapters.authorNote,
        charCount: chapters.charCount,
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
  const readByMe = readerId ? chapterReadBy(readerId) : sql<boolean>`false`;

  // 목차(회차 화면 머리의 '목차' 단추)와 이전·다음 화를 한 번에: 이 사람에게 보이는 회차 전부, 번호 순
  const [toc, likes, [reads], [myView], nextAt] = await Promise.all([
    db
      .select({
        id: chapters.id,
        position: chapters.position,
        title: chapters.title,
        status: chapters.status,
        scheduled: isScheduledChapter,
        readByMe,
      })
      .from(chapters)
      .where(visible)
      .orderBy(asc(chapters.position), asc(chapters.id)),
    getLikeSummary(chapter.id, readerId),
    db.select({ readers: count() }).from(chapterViews).where(eq(chapterViews.chapterId, chapter.id)),
    readerId
      ? db
          .select({ chapterId: chapterViews.chapterId })
          .from(chapterViews)
          .where(and(eq(chapterViews.chapterId, chapter.id), eq(chapterViews.readerId, readerId)))
          .limit(1)
      : Promise.resolve([]),
    nextScheduledAt(novelId),
  ]);

  // 열람 기록은 화면이 뜬 뒤에 저장되므로, 처음 여는 길드원은 본인을 미리 세어 준다
  const countsSelf = readerId !== null && chapter.visibleNow && !myView;
  const index = toc.findIndex((item) => item.id === chapter.id);
  const prev = index > 0 ? toc[index - 1] : null;
  const next = index !== -1 && index < toc.length - 1 ? toc[index + 1] : null;

  return {
    viewer,
    novel: { id: row.novel.id, title: row.novel.title },
    chapter,
    prev,
    next,
    toc,
    // 다음 회차가 아직 없을 때 '다음 화는 언제' 안내용
    nextScheduledAt: nextAt,
    likes,
    readCount: (reads?.readers ?? 0) + (countsSelf ? 1 : 0),
  };
}

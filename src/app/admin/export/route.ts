import { asc, eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth/guards';
import { db } from '@/lib/db';
import { chapterComments, chapters, novels, readers } from '@/lib/db/schema';

/** 원고 백업: 작품·회차(댓글 포함) 전체를 JSON 파일로 내려받는다 (Neon 무료 티어는 복구 기간이 짧아서) */
export async function GET() {
  await requireAdmin();

  const [novelRows, chapterRows, commentRows] = await Promise.all([
    db.select().from(novels).orderBy(asc(novels.id)),
    db.select().from(chapters).orderBy(asc(chapters.novelId), asc(chapters.position), asc(chapters.id)),
    // 회차 댓글 (쓴 사람 이름 포함 — 작가만 받는 파일)
    db
      .select({ chapterId: chapterComments.chapterId, author: readers.nickname, body: chapterComments.body, createdAt: chapterComments.createdAt })
      .from(chapterComments)
      .innerJoin(readers, eq(readers.id, chapterComments.readerId))
      .orderBy(asc(chapterComments.createdAt), asc(chapterComments.id)),
  ]);

  const body = {
    app: 'wafflenoble',
    version: 1,
    exportedAt: new Date().toISOString(),
    novels: novelRows.map((novel) => ({
      ...novel,
      chapters: chapterRows
        .filter((chapter) => chapter.novelId === novel.id)
        .map((chapter) => ({
          ...chapter,
          comments: commentRows.filter((comment) => comment.chapterId === chapter.id).map((comment) => ({ author: comment.author, body: comment.body, createdAt: comment.createdAt })),
        })),
    })),
  };

  const stamp = body.exportedAt.slice(0, 10).replaceAll('-', '');
  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': `attachment; filename="wafflenoble-backup-${stamp}.json"`,
      'cache-control': 'no-store',
    },
  });
}

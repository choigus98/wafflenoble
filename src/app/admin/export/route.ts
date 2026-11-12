import { asc } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth/guards';
import { db } from '@/lib/db';
import { chapters, novels } from '@/lib/db/schema';

/** 원고 백업: 작품·회차 전체를 JSON 파일로 내려받는다 (Neon 무료 티어는 복구 기간이 짧아서) */
export async function GET() {
  await requireAdmin();

  const [novelRows, chapterRows] = await Promise.all([
    db.select().from(novels).orderBy(asc(novels.id)),
    db.select().from(chapters).orderBy(asc(chapters.novelId), asc(chapters.position), asc(chapters.id)),
  ]);

  const body = {
    app: 'wafflenoble',
    version: 1,
    exportedAt: new Date().toISOString(),
    novels: novelRows.map((novel) => ({
      ...novel,
      chapters: chapterRows.filter((chapter) => chapter.novelId === novel.id),
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

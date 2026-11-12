import { requireAdmin } from '@/lib/auth/guards';
import { chapterTableCsv, chapterTableFileName } from '@/lib/chapter-table';
import { attachmentDisposition } from '@/lib/download';
import { adminGetNovel } from '@/lib/queries/admin';
import { parseId } from '@/lib/utils';

/**
 * 회차 목록 표(.csv) 내려받기: 번호 · 제목 · 상태 · 공개일 · 글자수 · 읽은 사람 · 좋아요.
 * 임시저장·예약까지 전부 넣고 상태 칸으로 거를 수 있게 한다 (관리자 회차 목록과 같은 순서)
 */
export async function GET(_request: Request, { params }: { params: Promise<{ novelId: string }> }) {
  await requireAdmin();
  const novelId = parseId((await params).novelId);
  if (!novelId) return new Response('작품을 찾을 수 없어요', { status: 404 });
  const data = await adminGetNovel(novelId);
  if (!data) return new Response('작품을 찾을 수 없어요', { status: 404 });

  const fileName = chapterTableFileName(data.novel.title, new Date());
  return new Response(chapterTableCsv(data.chapters), {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': attachmentDisposition(`wafflenoble-novel-${novelId}-chapters.csv`, fileName),
      'cache-control': 'no-store',
    },
  });
}

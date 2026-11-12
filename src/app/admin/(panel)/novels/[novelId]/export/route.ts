import { requireAdmin } from '@/lib/auth/guards';
import { novelFileName, novelToText } from '@/lib/chapter-text';
import { htmlToDoc } from '@/lib/html-doc';
import { adminExportNovelText } from '@/lib/queries/admin';
import { parseId } from '@/lib/utils';

/**
 * 작품 전체를 한 .txt로 내려받기 (사람이 읽는 글. 기계용 전체 백업은 /admin/export의 JSON).
 * ?scope=published면 길드원에게 보이는 회차만, 아니면 임시저장·예약까지 전부
 */
export async function GET(request: Request, { params }: { params: Promise<{ novelId: string }> }) {
  await requireAdmin();
  const novelId = parseId((await params).novelId);
  if (!novelId) return new Response('작품을 찾을 수 없어요', { status: 404 });
  const scope = new URL(request.url).searchParams.get('scope') === 'published' ? 'published' : 'all';
  const data = await adminExportNovelText(novelId, scope);
  if (!data) return new Response('작품을 찾을 수 없어요', { status: 404 });

  const text = novelToText({
    title: data.novel.title,
    description: data.novel.description,
    chapters: data.chapters.map((chapter) => ({
      position: chapter.position,
      title: chapter.title,
      doc: htmlToDoc(chapter.contentHtml),
      authorNote: chapter.authorNote,
    })),
  });
  const fileName = novelFileName(data.novel.title, scope);
  return new Response(text, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      // 한글 파일 이름은 filename*로 (옛 브라우저용 filename은 영문)
      'content-disposition': `attachment; filename="wafflenoble-novel-${novelId}.txt"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      'cache-control': 'no-store',
    },
  });
}

import { eq } from 'drizzle-orm';
import { getViewer } from '@/lib/auth/guards';
import { db } from '@/lib/db';
import { images } from '@/lib/db/schema';
import { isImageId } from '@/lib/images';

/**
 * 올린 사진 보여 주기. 입장한 사람(관리자 · 길드원)만 (proxy가 먼저 막고, 여기서 다시 확인).
 * 같은 id의 사진은 바뀌지 않으므로(새로 올리면 새 id) 브라우저가 오래 보관해도 된다. 공용 캐시에는 두지 않는다
 */
export async function GET(_request: Request, { params }: RouteContext<'/img/[id]'>) {
  const { id } = await params;
  if (!isImageId(id)) return new Response('Not found', { status: 404 });
  if (!(await getViewer())) return new Response('Unauthorized', { status: 401 });

  const image = await db.query.images.findFirst({ columns: { mime: true, data: true }, where: eq(images.id, id) });
  if (!image) return new Response('Not found', { status: 404 });

  return new Response(new Uint8Array(image.data), {
    headers: {
      'Content-Type': image.mime,
      'Content-Length': String(image.data.length),
      'Cache-Control': 'private, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'",
    },
  });
}

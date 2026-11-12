import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { ChapterEditorLoader } from '@/components/admin/chapter-editor-loader';
import { Skeleton } from '@/components/ui';
import { formatRelative } from '@/lib/format';
import { adminGetChapter } from '@/lib/queries/admin';
import { parseId } from '@/lib/utils';

export default function ChapterEditPage({ params }: PageProps<'/admin/novels/[novelId]/chapters/[chapterId]'>) {
  return (
    <Suspense fallback={<Skeleton className="h-[70vh]" />}>
      <ChapterAdmin params={params} />
    </Suspense>
  );
}

async function ChapterAdmin({ params }: Pick<PageProps<'/admin/novels/[novelId]/chapters/[chapterId]'>, 'params'>) {
  const { novelId: rawNovelId, chapterId: rawChapterId } = await params;
  const novelId = parseId(rawNovelId);
  const chapterId = parseId(rawChapterId);
  if (!novelId || !chapterId) notFound();
  const data = await adminGetChapter(novelId, chapterId);
  if (!data) notFound();

  const { chapter, novelTitle, viewers, likers, scheduled } = data;
  const now = new Date();

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_16rem]">
      <ChapterEditorLoader
        key={chapter.id}
        novelTitle={novelTitle}
        chapter={{
          id: chapter.id,
          novelId: chapter.novelId,
          title: chapter.title,
          position: chapter.position,
          contentHtml: chapter.contentHtml,
          status: chapter.status,
          updatedAt: chapter.updatedAt.toISOString(),
          publishedAt: chapter.publishedAt?.toISOString() ?? null,
          scheduled,
        }}
      />

      {/* 누가 읽었는지는 이 관리자 화면에서만 보인다 */}
      <aside className="space-y-6 lg:pt-12">
        <section className="space-y-2.5">
          <h2 className="text-sm font-bold">
            읽은 사람 <span className="text-muted">{viewers.length}명</span>
          </h2>
          {viewers.length === 0 ? (
            <p className="text-[13px] leading-relaxed text-muted">
              {chapter.status === 'published' ? '아직 읽은 길드원이 없어요.' : '발행하면 읽은 길드원이 여기 보여요.'}
            </p>
          ) : (
            <ul className="space-y-1.5">
              {viewers.map((viewer) => (
                <li key={viewer.nickname} className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="truncate font-medium">{viewer.nickname}</span>
                  <span className="shrink-0 text-xs text-muted">
                    {viewer.viewCount}회 · {formatRelative(viewer.lastViewedAt, now)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="space-y-2.5">
          <h2 className="text-sm font-bold">
            좋아요 <span className="text-like">♥ {likers.length}</span>
          </h2>
          {likers.length === 0 ? (
            <p className="text-[13px] text-muted">아직 없어요.</p>
          ) : (
            <p className="text-sm leading-relaxed break-keep">{likers.join(', ')}</p>
          )}
        </section>
      </aside>
    </div>
  );
}

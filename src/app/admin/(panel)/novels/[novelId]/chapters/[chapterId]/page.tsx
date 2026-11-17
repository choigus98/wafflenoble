import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { AdminCommentList } from '@/components/admin/admin-comment-list';
import { ChapterEditorLoader } from '@/components/admin/chapter-editor-loader';
import { Skeleton } from '@/components/ui';
import { formatLogTime, formatRelative } from '@/lib/format';
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

  const { chapter, novelTitle, viewers, likers, comments, scheduled, revisions, privateNote, characters } = data;
  const now = new Date();

  return (
    // data-focus-*: 에디터 집중 모드에서 옆 칸을 숨기고 본문 칸만 가운데로 (globals.css)
    <div data-focus-grid="" className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_16rem]">
      <ChapterEditorLoader
        key={chapter.id}
        novelTitle={novelTitle}
        chapter={{
          id: chapter.id,
          novelId: chapter.novelId,
          title: chapter.title,
          position: chapter.position,
          contentHtml: chapter.contentHtml,
          authorNote: chapter.authorNote,
          status: chapter.status,
          updatedAt: chapter.updatedAt.toISOString(),
          publishedAt: chapter.publishedAt?.toISOString() ?? null,
          scheduled,
          revisions,
          privateNote,
          characters,
        }}
      />

      {/* 누가 읽었는지는 이 관리자 화면에서만 보인다 */}
      <aside data-focus-hide="" className="space-y-6 lg:pt-12">
        <section className="space-y-2.5">
          <h2 className="text-sm font-bold">
            읽은 사람 <span className="text-muted">{viewers.length}명</span>
          </h2>
          {viewers.length === 0 ? (
            <p className="text-[13px] leading-relaxed text-muted">
              {chapter.status === 'published' ? '아직 읽은 길드원이 없어요.' : '발행하면 읽은 길드원이 여기 보여요.'}
            </p>
          ) : (
            <>
              {/* 이름을 누르면 연 시각이 한 줄씩 펼쳐진다 (30분 안에 다시 연 것은 한 번) */}
              <ul className="space-y-1">
                {viewers.map((viewer) => {
                  const unlogged = viewer.viewCount - viewer.logs.length;
                  return (
                    <li key={viewer.nickname}>
                      <details className="group">
                        <summary className="-mx-1.5 flex cursor-pointer list-none items-baseline justify-between gap-2 rounded-md px-1.5 py-0.5 text-sm hover:bg-surface-2 [&::-webkit-details-marker]:hidden">
                          <span className="flex min-w-0 items-baseline gap-1">
                            <span aria-hidden="true" className="text-[10px] text-muted transition group-open:rotate-90">
                              ▶
                            </span>
                            <span className="truncate font-medium">{viewer.nickname}</span>
                          </span>
                          <span className="shrink-0 text-xs text-muted">
                            {viewer.viewCount}회 · {formatRelative(viewer.lastViewedAt, now)}
                          </span>
                        </summary>
                        <ol className="mt-1 mb-2 ml-4 space-y-0.5 border-l border-line pl-3 text-xs text-muted tabular-nums">
                          {viewer.logs.map((at, index) => (
                            <li key={at.toISOString()}>
                              <span className="text-fg">{viewer.logs.length - index + Math.max(unlogged, 0)}회</span> · {formatLogTime(at)}
                            </li>
                          ))}
                          {unlogged > 0 ? (
                            <li>{viewer.logs.length > 0 ? `그 전 ${unlogged}회` : `${unlogged}회`}는 시각 기록을 시작하기 전이라 시각이 없어요</li>
                          ) : null}
                        </ol>
                      </details>
                    </li>
                  );
                })}
              </ul>
              <p className="text-xs text-muted">이름을 누르면 읽은 시각이 다 보여요.</p>
            </>
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
        <section className="space-y-2.5">
          <h2 className="text-sm font-bold">
            댓글 <span className="text-muted">{comments.length}개</span>
          </h2>
          <AdminCommentList
            // 지운 뒤 새로 받은 목록으로 다시 그린다
            key={comments.map((comment) => comment.id).join(',')}
            compact
            empty={chapter.status === 'published' ? '아직 댓글이 없어요.' : '발행하면 길드원 댓글이 여기 보여요.'}
            items={comments.map((comment) => ({ id: comment.id, author: comment.nickname, body: comment.body, createdAt: comment.createdAt.toISOString() }))}
          />
        </section>
      </aside>
    </div>
  );
}

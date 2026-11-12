import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { createChapter } from '@/app/admin/actions';
import { ChapterMoveButtons } from '@/components/admin/chapter-move-buttons';
import { DeleteNovelForm } from '@/components/admin/delete-novel-form';
import { NovelForm } from '@/components/admin/novel-form';
import { SubmitButton } from '@/components/submit-button';
import { Badge, Card, Skeleton } from '@/components/ui';
import { formatDate, formatNumber, formatRelative, formatSchedule } from '@/lib/format';
import { adminGetNovel } from '@/lib/queries/admin';
import { parseId } from '@/lib/utils';

export default function AdminNovelPage({ params }: PageProps<'/admin/novels/[novelId]'>) {
  return (
    <Suspense fallback={<NovelAdminSkeleton />}>
      <NovelAdmin params={params} />
    </Suspense>
  );
}

async function NovelAdmin({ params }: Pick<PageProps<'/admin/novels/[novelId]'>, 'params'>) {
  const { novelId: rawId } = await params;
  const novelId = parseId(rawId);
  if (!novelId) notFound();
  const data = await adminGetNovel(novelId);
  if (!data) notFound();

  const { novel, chapters, totalReaders } = data;
  const now = new Date();

  return (
    <div className="space-y-10">
      <div>
        <Link href="/admin" className="text-sm font-semibold text-muted hover:text-fg">
          ← 작품 목록
        </Link>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-bold tracking-tight break-keep">{novel.title}</h1>
          <Link href={`/novels/${novel.id}`} className="text-sm font-semibold text-accent hover:underline">
            열람 화면에서 보기 ↗
          </Link>
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-bold">회차 {chapters.length > 0 ? <span className="text-muted">{chapters.length}</span> : null}</h2>
          <form action={createChapter.bind(null, novel.id)}>
            <SubmitButton size="sm" pendingText="만드는 중…">
              + 새 회차 쓰기
            </SubmitButton>
          </form>
        </div>
        {chapters.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line px-6 py-12 text-center text-muted">
            아직 회차가 없어요. 첫 회차를 써 보세요.
          </p>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {chapters.map((chapter, index) => (
              <li key={chapter.id} className="flex items-stretch">
                <Link
                  href={`/admin/novels/${novel.id}/chapters/${chapter.id}`}
                  className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3.5 transition hover:bg-surface-2/60 sm:px-5"
                >
                  <span className="w-11 shrink-0 text-sm font-semibold text-accent tabular-nums">{chapter.position}화</span>
                  <span className="min-w-0 flex-1 space-y-1">
                    <span className="block truncate font-medium">{chapter.title || '(제목 없음)'}</span>
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                      <Badge tone={chapter.scheduled ? 'neutral' : chapter.status === 'published' ? 'accent' : 'muted'}>
                        {chapter.scheduled ? '예약' : chapter.status === 'published' ? '발행' : '임시저장'}
                      </Badge>
                      <span>{formatNumber(chapter.charCount)}자</span>
                      <span>
                        {chapter.scheduled && chapter.publishedAt
                          ? `${formatSchedule(chapter.publishedAt)} 공개 예정`
                          : chapter.status === 'published' && chapter.publishedAt
                            ? `${formatDate(chapter.publishedAt)} 발행`
                            : `${formatRelative(chapter.updatedAt, now)} 수정`}
                      </span>
                    </span>
                  </span>
                  <ReadShare
                    readCount={chapter.readCount}
                    likeCount={chapter.likeCount}
                    totalReaders={totalReaders}
                    // 길드원에게 보이는 회차만 비율을 낸다 (임시저장·예약은 아직 읽을 수 없으니)
                    visible={chapter.status === 'published' && !chapter.scheduled}
                  />
                </Link>
                {/* 순서 바꾸기: 옆 회차와 'N화' 번호를 맞바꾼다 (링크는 그대로) */}
                {chapters.length > 1 ? (
                  <ChapterMoveButtons
                    chapterId={chapter.id}
                    label={`${chapter.position}화 「${chapter.title || '제목 없음'}」`}
                    isFirst={index === 0}
                    isLast={index === chapters.length - 1}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-bold">작품 정보</h2>
        <Card>
          <NovelForm
            novel={{
              id: novel.id,
              title: novel.title,
              description: novel.description,
              serialStatus: novel.serialStatus,
              isPublished: novel.isPublished,
              coverColor: novel.coverColor,
              scheduleNote: novel.scheduleNote,
              characters: novel.characters,
            }}
          />
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="font-bold text-danger">작품 삭제</h2>
        <Card className="border-danger/30">
          <DeleteNovelForm novelId={novel.id} title={novel.title} />
        </Card>
      </section>
    </div>
  );
}

/** 회차 목록 오른쪽: 길드원 중 몇 명이 읽었는지(막대) + 좋아요 수 */
function ReadShare({
  readCount,
  likeCount,
  totalReaders,
  visible,
}: {
  readCount: number;
  likeCount: number;
  totalReaders: number;
  visible: boolean;
}) {
  const showShare = visible && totalReaders > 0;
  const percent = showShare ? Math.min(100, Math.round((readCount / totalReaders) * 100)) : 0;
  return (
    <span className="flex shrink-0 flex-col items-end gap-1 text-right text-xs text-muted tabular-nums">
      {showShare ? (
        <>
          <span>
            <span aria-hidden="true">
              <span className="font-semibold text-fg">{readCount}</span>/{totalReaders}명 읽음
            </span>
            <span className="sr-only">
              길드원 {totalReaders}명 중 {readCount}명 읽음
            </span>
          </span>
          <span aria-hidden="true" className="block h-1 w-16 overflow-hidden rounded-full bg-surface-2">
            <span className="block h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
          </span>
        </>
      ) : (
        <span>{readCount}명 읽음</span>
      )}
      <span className="text-like">♥ {likeCount}</span>
    </span>
  );
}

function NovelAdminSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-64" />
      <Skeleton className="h-80" />
    </div>
  );
}

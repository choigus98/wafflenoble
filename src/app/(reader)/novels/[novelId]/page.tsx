import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { NovelCover } from '@/components/novel-cover';
import { Badge, ButtonLink, Skeleton } from '@/components/ui';
import { formatDate, formatSchedule } from '@/lib/format';
import { getNovelDetail } from '@/lib/queries/reader';
import { SERIAL_STATUS_LABEL, cn, parseId } from '@/lib/utils';

export default function NovelPage({ params }: PageProps<'/novels/[novelId]'>) {
  return (
    <Suspense fallback={<NovelSkeleton />}>
      <NovelDetail params={params} />
    </Suspense>
  );
}

async function NovelDetail({ params }: Pick<PageProps<'/novels/[novelId]'>, 'params'>) {
  const { novelId: rawId } = await params;
  const novelId = parseId(rawId);
  if (!novelId) notFound();
  const data = await getNovelDetail(novelId);
  if (!data) notFound();

  const { viewer, novel, chapters, continueChapter, nextScheduledAt } = data;
  const first = chapters.find((chapter) => chapter.status === 'published' && !chapter.scheduled) ?? chapters[0];

  return (
    <article className="pt-8">
      <header className="flex gap-5 sm:gap-7">
        <NovelCover id={novel.id} title={novel.title} color={novel.coverColor} size="sm" className="w-28 shrink-0 sm:w-36" />
        <div className="min-w-0 flex-1 space-y-3 pt-1">
          <div className="flex flex-wrap gap-1.5">
            <Badge tone={novel.serialStatus === 'completed' ? 'neutral' : 'accent'}>
              {SERIAL_STATUS_LABEL[novel.serialStatus]}
            </Badge>
            {!novel.isPublished ? <Badge tone="muted">비공개</Badge> : null}
          </div>
          <h1 className="text-[22px] leading-snug font-bold tracking-tight break-keep sm:text-2xl">{novel.title}</h1>
          <p className="text-sm text-muted">총 {chapters.length}화</p>
          {viewer.kind === 'admin' ? (
            <Link href={`/admin/novels/${novel.id}`} className="inline-block text-sm font-semibold text-accent hover:underline">
              작품 관리
            </Link>
          ) : null}
        </div>
      </header>

      {novel.description ? (
        <p className="mt-6 text-[15px] leading-relaxed whitespace-pre-line break-keep text-fg/90">{novel.description}</p>
      ) : null}

      {first ? (
        <div className="mt-7 flex gap-2.5">
          {continueChapter && continueChapter.id !== first.id ? (
            <>
              <ButtonLink href={`/novels/${novel.id}/${continueChapter.id}`} size="lg" className="flex-1">
                이어 읽기 · {continueChapter.position}화
              </ButtonLink>
              <ButtonLink href={`/novels/${novel.id}/${first.id}`} size="lg" variant="secondary">
                첫 화
              </ButtonLink>
            </>
          ) : (
            <ButtonLink href={`/novels/${novel.id}/${first.id}`} size="lg" className="flex-1">
              첫 화 보기
            </ButtonLink>
          )}
        </div>
      ) : null}

      {nextScheduledAt ? (
        // 예약된 회차가 있으면 공개 시각만 알려 준다 (제목은 비밀)
        <p className="mt-4 flex items-center gap-2.5 rounded-2xl bg-surface-2 px-4 py-3 text-sm">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-4 shrink-0 text-accent">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
          <span>
            다음 화는 <strong className="font-semibold">{formatSchedule(nextScheduledAt)}</strong>에 올라와요
          </span>
        </p>
      ) : null}

      <section className="mt-10">
        <h2 className="mb-2 text-sm font-semibold text-muted">회차</h2>
        {chapters.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line px-6 py-12 text-center text-muted">
            아직 올라온 회차가 없어요.
          </p>
        ) : (
          <ol className="divide-y divide-line border-y border-line">
            {chapters.map((chapter) => (
              <li key={chapter.id}>
                <Link
                  href={`/novels/${novel.id}/${chapter.id}`}
                  className="flex items-center gap-3 px-1 py-4 transition hover:bg-surface-2/60"
                >
                  <span className={cn('w-10 shrink-0 text-sm font-semibold tabular-nums', chapter.readByMe ? 'text-muted' : 'text-accent')}>
                    {chapter.position}화
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className={cn('min-w-0 truncate font-medium', chapter.readByMe && 'text-muted')}>
                        {chapter.title || `${chapter.position}화`}
                      </span>
                      {chapter.isNew ? (
                        <span className="shrink-0 rounded-full bg-accent px-1.5 py-px text-[10px] leading-4 font-bold tracking-wide text-accent-fg">
                          <span aria-hidden="true">NEW</span>
                          <span className="sr-only">새 회차</span>
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                      {chapter.publishedAt && !chapter.scheduled ? formatDate(chapter.publishedAt) : null}
                      {chapter.status === 'draft' ? <Badge tone="muted">임시저장</Badge> : null}
                      {chapter.scheduled && chapter.publishedAt ? (
                        <Badge tone="muted">예약 · {formatSchedule(chapter.publishedAt)}</Badge>
                      ) : null}
                      {chapter.likeCount > 0 ? <span className="text-like">♥ {chapter.likeCount}</span> : null}
                    </span>
                  </span>
                  {chapter.readByMe ? (
                    <span className="flex shrink-0 items-center gap-1 text-xs text-muted">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-3.5">
                        <path d="M5 12.5l4.5 4.5L19 7.5" />
                      </svg>
                      읽음
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>
    </article>
  );
}

function NovelSkeleton() {
  return (
    <div className="pt-8">
      <div className="flex gap-5">
        <Skeleton className="aspect-[3/4] w-28 shrink-0 sm:w-36" />
        <div className="flex-1 space-y-3 pt-1">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-7 w-4/5" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
      <Skeleton className="mt-6 h-16" />
      <Skeleton className="mt-7 h-12" />
      <div className="mt-10 space-y-3">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-12" />
        ))}
      </div>
    </div>
  );
}

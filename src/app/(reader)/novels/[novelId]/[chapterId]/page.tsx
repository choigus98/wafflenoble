import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { ChapterBody } from '@/components/reader/chapter-body';
import { ChapterToc } from '@/components/reader/chapter-toc';
import { ChapterKeyNav } from '@/components/reader/chapter-key-nav';
import { LikeButton } from '@/components/reader/like-button';
import { ReaderSettings } from '@/components/reader/reader-settings';
import { BackToTop } from '@/components/reader/back-to-top';
import { ReadingProgress } from '@/components/reader/reading-progress';
import { ViewTracker } from '@/components/reader/view-tracker';
import { Badge, ButtonLink, Skeleton } from '@/components/ui';
import { formatDate, formatNumber, formatSchedule } from '@/lib/format';
import { formatReadingTime, readingMinutes } from '@/lib/reading-time';
import { getChapterView } from '@/lib/queries/reader';
import { parseId } from '@/lib/utils';

export default function ChapterPage({ params }: PageProps<'/novels/[novelId]/[chapterId]'>) {
  return (
    <Suspense fallback={<ChapterSkeleton />}>
      <ChapterView params={params} />
    </Suspense>
  );
}

async function ChapterView({ params }: Pick<PageProps<'/novels/[novelId]/[chapterId]'>, 'params'>) {
  const { novelId: rawNovelId, chapterId: rawChapterId } = await params;
  const novelId = parseId(rawNovelId);
  const chapterId = parseId(rawChapterId);
  if (!novelId || !chapterId) notFound();
  const data = await getChapterView(novelId, chapterId);
  if (!data) notFound();

  const { viewer, novel, chapter, prev, next, toc, nextScheduledAt, likes, readCount } = data;
  const isReader = viewer.kind === 'reader';
  const minutes = readingMinutes(chapter.charCount);

  return (
    // data-reading: 이 화면에서는 읽기 설정 '본문 폭'을 따른다 (globals.css)
    <article data-reading="" className="pt-6">
      <header className="flex items-start justify-between gap-3 border-b border-line pb-5">
        <div className="min-w-0 space-y-1.5">
          <Link href={`/novels/${novel.id}`} className="block truncate text-sm font-semibold text-accent hover:underline">
            {novel.title}
          </Link>
          {/* '맨 위로'를 누르면 포커스가 여기로 온다 */}
          <h1
            id="chapter-title"
            tabIndex={-1}
            // 화면 낭독기가 '3화템플릿'처럼 붙여 읽지 않게 이름을 직접 준다 (글자 사이 띄어쓰기는 낭독기에서 빠질 수 있어서)
            aria-label={chapter.title ? `${chapter.position}화 ${chapter.title}` : `${chapter.position}화`}
            className="text-xl leading-snug font-bold tracking-tight break-keep outline-none sm:text-2xl"
          >
            <span className="mr-1 text-muted">{chapter.position}화</span> {chapter.title}
          </h1>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
            {chapter.publishedAt && chapter.visibleNow ? formatDate(chapter.publishedAt) : null}
            {minutes !== null ? (
              <span className="flex items-center gap-1">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-3.5">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
                <span>
                  <span className="sr-only">읽는 시간 </span>
                  {formatReadingTime(minutes)}
                </span>
              </span>
            ) : null}
            {chapter.status === 'draft' ? <Badge tone="danger">미리보기 · 임시저장</Badge> : null}
            {chapter.status === 'published' && !chapter.visibleNow && chapter.publishedAt ? (
              <Badge tone="danger">미리보기 · {formatSchedule(chapter.publishedAt)} 공개 예정</Badge>
            ) : null}
          </p>
        </div>
        {/* 목차 목록은 이 묶음의 오른쪽 끝에 맞춰 펼쳐진다 */}
        <div data-print-hide="" className="relative flex shrink-0 gap-2">
          {toc.length > 1 ? (
            <ChapterToc
              // 다른 회차로 가면 닫힌 상태로 새로 그린다
              key={chapter.id}
              novelId={novel.id}
              currentId={chapter.id}
              items={toc.map((item) => ({
                id: item.id,
                position: item.position,
                title: item.title,
                read: item.readByMe,
                note: item.status === 'draft' ? '임시저장' : item.scheduled ? '예약' : null,
              }))}
            />
          ) : null}
          <ReaderSettings
            share={
              novel.isPublished && chapter.visibleNow
                ? {
                    path: `/novels/${novel.id}/${chapter.id}`,
                    title: novel.title,
                    chapterLabel: chapter.title ? `${chapter.position}화 「${chapter.title}」` : `${chapter.position}화`,
                  }
                : undefined
            }
          />
        </div>
      </header>

      {chapter.contentHtml ? (
        <ChapterBody html={chapter.contentHtml} />
      ) : (
        <p className="py-16 text-center text-muted">아직 본문이 없어요.</p>
      )}

      {chapter.authorNote ? (
        <aside aria-labelledby="author-note-title" className="mb-10 rounded-2xl bg-surface-2 px-5 py-4">
          <h2 id="author-note-title" className="text-xs font-semibold text-muted">
            작가의 말
          </h2>
          <p className="mt-1.5 text-[15px] leading-relaxed whitespace-pre-line break-keep">{chapter.authorNote}</p>
        </aside>
      ) : null}

      <footer data-print-hide="" className="space-y-7 border-t border-line pt-7">
        <div className="flex flex-col items-center gap-3">
          <LikeButton
            chapterId={chapter.id}
            initial={likes}
            disabledReason={isReader ? null : '관리자는 좋아요를 누를 수 없어요'}
          />
          <p className="text-xs text-muted">{formatNumber(readCount)}명이 읽었어요</p>
        </div>

        <nav className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          {prev ? (
            <ButtonLink href={`/novels/${novel.id}/${prev.id}`} variant="secondary" className="justify-start truncate">
              ← {prev.position}화
            </ButtonLink>
          ) : (
            <span />
          )}
          <ButtonLink href={`/novels/${novel.id}`} variant="ghost">
            목록
          </ButtonLink>
          {next ? (
            <ButtonLink href={`/novels/${novel.id}/${next.id}`} className="justify-end truncate">
              {next.position}화 →
            </ButtonLink>
          ) : nextScheduledAt ? (
            <span className="text-right text-xs leading-snug text-muted">
              다음 화
              <br />
              <span className="font-semibold text-fg">{formatSchedule(nextScheduledAt)}</span>
            </span>
          ) : (
            <span className="text-right text-xs text-muted">마지막 화예요</span>
          )}
        </nav>
      </footer>

      {isReader && chapter.visibleNow ? <ViewTracker chapterId={chapter.id} /> : null}
      <ReadingProgress chapterId={chapter.id} />
      <BackToTop targetId="chapter-title" />
      <ChapterKeyNav
        prevHref={prev ? `/novels/${novel.id}/${prev.id}` : null}
        nextHref={next ? `/novels/${novel.id}/${next.id}` : null}
      />
    </article>
  );
}

function ChapterSkeleton() {
  return (
    <div className="pt-6">
      <div className="space-y-2 border-b border-line pb-5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-7 w-3/4" />
        <Skeleton className="h-3 w-20" />
      </div>
      <div className="space-y-3 py-9">
        {Array.from({ length: 10 }, (_, index) => (
          <Skeleton key={index} className={index % 3 === 2 ? 'h-5 w-2/3' : 'h-5'} />
        ))}
      </div>
    </div>
  );
}

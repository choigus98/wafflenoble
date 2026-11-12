import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { createChapter } from '@/app/admin/actions';
import { ChapterList } from '@/components/admin/chapter-list';
import { ChapterMoveButtons } from '@/components/admin/chapter-move-buttons';
import { DeleteNovelForm } from '@/components/admin/delete-novel-form';
import { NovelForm } from '@/components/admin/novel-form';
import { SubmitButton } from '@/components/submit-button';
import { Badge, Card, Skeleton, buttonClass } from '@/components/ui';
import { CHAPTER_FILTERS, countChapters, filterChapters, parseChapterFilter } from '@/lib/chapter-filter';
import { formatDate, formatNumber, formatRelative, formatSchedule } from '@/lib/format';
import { adminGetNovel } from '@/lib/queries/admin';
import { cn, parseId } from '@/lib/utils';

export default function AdminNovelPage({ params, searchParams }: PageProps<'/admin/novels/[novelId]'>) {
  return (
    <Suspense fallback={<NovelAdminSkeleton />}>
      <NovelAdmin params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function NovelAdmin({ params, searchParams }: Pick<PageProps<'/admin/novels/[novelId]'>, 'params' | 'searchParams'>) {
  const { novelId: rawId } = await params;
  // 회차 목록 거르기 (?show=published · scheduled · draft)
  const requestedFilter = parseChapterFilter((await searchParams).show);
  const novelId = parseId(rawId);
  if (!novelId) notFound();
  const data = await adminGetNovel(novelId);
  if (!data) notFound();

  const { novel, chapters: allChapters, totalReaders } = data;
  const now = new Date();
  // 회차가 하나뿐이면 거르기 줄을 숨기므로, 예전 주소의 ?show=가 남아 있어도 전체를 보여 준다 (되돌아갈 버튼이 없어서)
  const showFilters = allChapters.length > 1;
  const filter = showFilters ? requestedFilter : 'all';
  const counts = countChapters(allChapters);
  const chapters = filterChapters(allChapters, filter);
  // 순서 바꾸기는 '전체'에서만 (거른 목록에서 위·아래는 보이지 않는 회차와 자리를 바꿔 헷갈림)
  const canMove = filter === 'all' && showFilters;
  const filterLabel = CHAPTER_FILTERS.find((item) => item.key === filter)?.label ?? '전체';

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
          <h2 className="font-bold">회차 {allChapters.length > 0 ? <span className="text-muted">{allChapters.length}</span> : null}</h2>
          <form action={createChapter.bind(null, novel.id)}>
            <SubmitButton size="sm" pendingText="만드는 중…">
              + 새 회차 쓰기
            </SubmitButton>
          </form>
        </div>
        {allChapters.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line px-6 py-12 text-center text-muted">
            아직 회차가 없어요. 첫 회차를 써 보세요.
          </p>
        ) : (
          <ChapterList
            filters={
              showFilters ? (
                <nav aria-label="회차 거르기" className="flex flex-wrap items-center gap-1.5">
                  {CHAPTER_FILTERS.map((item) => (
                    <Link
                      key={item.key}
                      href={item.key === 'all' ? `/admin/novels/${novel.id}` : `/admin/novels/${novel.id}?show=${item.key}`}
                      aria-current={filter === item.key ? 'page' : undefined}
                      scroll={false}
                      className={cn(
                        'inline-flex h-8 items-center gap-1 rounded-full border px-3 text-[13px] font-semibold transition',
                        filter === item.key ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-surface text-muted hover:text-fg',
                      )}
                    >
                      {item.label} <span className="font-normal tabular-nums">{counts[item.key]}</span>
                    </Link>
                  ))}
                </nav>
              ) : null
            }
            searchable={showFilters}
            moveHint={filter !== 'all' ? '순서 바꾸기는 ‘전체’에서 할 수 있어요' : null}
            emptyText={`${filterLabel} 회차가 없어요.`}
            filterLabel={filter === 'all' ? null : filterLabel}
            rows={chapters.map((chapter, index) => ({
              id: chapter.id,
              position: chapter.position,
              title: chapter.title,
              content: (
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
              ),
              // 순서 바꾸기: 옆 회차와 'N화' 번호를 맞바꾼다 (링크는 그대로)
              move: canMove ? (
                <ChapterMoveButtons
                  chapterId={chapter.id}
                  label={`${chapter.position}화 「${chapter.title || '제목 없음'}」`}
                  isFirst={index === 0}
                  isLast={index === chapters.length - 1}
                />
              ) : null,
            }))}
          />
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

      {/* 사람이 읽는 글 파일 (기계용 전체 백업 JSON은 설정 화면) */}
      <section className="space-y-3">
        <h2 className="font-bold">텍스트로 내보내기</h2>
        <Card>
          <p className="text-sm leading-relaxed text-muted">
            회차를 순서대로 한 .txt 파일로 내려받아요. 템플릿도 글로 풀어서 들어가요. 보관하거나 다른 곳에 옮겨 적을 때 쓰세요.
          </p>
          {allChapters.length === 0 ? (
            <p className="mt-3 text-sm text-muted">아직 회차가 없어요.</p>
          ) : (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {counts.published > 0 ? (
                // Link가 아닌 a: 미리 불러오기 없이 누를 때만 받는다
                <a href={`/admin/novels/${novel.id}/export?scope=published`} download className={buttonClass('secondary', 'sm')}>
                  발행한 회차만 · {counts.published}화
                </a>
              ) : (
                <span className="text-sm text-muted">발행한 회차는 아직 없어요</span>
              )}
              <a href={`/admin/novels/${novel.id}/export`} download className={buttonClass('secondary', 'sm')}>
                임시저장·예약까지 전체 · {allChapters.length}화
              </a>
            </div>
          )}
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

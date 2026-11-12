import { cookies } from 'next/headers';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { NovelCover } from '@/components/novel-cover';
import { CopyLinkButton } from '@/components/reader/copy-link-button';
import { NovelBookmarks } from '@/components/reader/novel-bookmarks';
import { TocList } from '@/components/reader/toc-list';
import { TocOrderToggle } from '@/components/reader/toc-order-toggle';
import { Badge, ButtonLink, Skeleton } from '@/components/ui';
import { parseCharacters, type Character } from '@/lib/characters';
import { formatSchedule } from '@/lib/format';
import { getNovelDetail } from '@/lib/queries/reader';
import { TOC_ORDER_COOKIE, orderChapters, parseTocOrder } from '@/lib/toc-order';
import { SERIAL_STATUS_LABEL, parseId } from '@/lib/utils';

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
  // 목차 정렬은 이 기기 쿠키로 기억 (서버가 처음부터 그 순서로 그림)
  const order = parseTocOrder((await cookies()).get(TOC_ORDER_COOKIE)?.value);
  const listed = orderChapters(chapters, order);
  const first = chapters.find((chapter) => chapter.status === 'published' && !chapter.scheduled) ?? chapters[0];
  const characters = parseCharacters(novel.characters);

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
          <p className="text-sm text-muted">
            총 {chapters.length}화
            {/* 연재 일정: 완결된 작품에는 안 보여 준다 */}
            {novel.scheduleNote && novel.serialStatus !== 'completed' ? <> · {novel.scheduleNote}</> : null}
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            {/* 비공개 작품은 길드원이 못 들어오니 링크 복사를 숨긴다 */}
            {novel.isPublished ? <CopyLinkButton path={`/novels/${novel.id}`} title={novel.title} /> : null}
            {viewer.kind === 'admin' ? (
              <Link href={`/admin/novels/${novel.id}`} className="inline-block text-sm font-semibold text-accent hover:underline">
                작품 관리
              </Link>
            ) : null}
          </div>
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

      {characters.length > 0 ? <CharacterList characters={characters} /> : null}

      {/* 이 기기에서 꽂은 책갈피 (없으면 안 보임) */}
      <NovelBookmarks novelId={novel.id} />

      <section className="mt-10">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-muted">회차</h2>
          {chapters.length > 1 ? <TocOrderToggle order={order} /> : null}
        </div>
        {chapters.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line px-6 py-12 text-center text-muted">
            아직 올라온 회차가 없어요.
          </p>
        ) : (
          <TocList
            novelId={novel.id}
            items={listed.map((chapter) => ({
              id: chapter.id,
              position: chapter.position,
              title: chapter.title,
              status: chapter.status,
              scheduled: chapter.scheduled,
              publishedAt: chapter.publishedAt ? chapter.publishedAt.toISOString() : null,
              likeCount: chapter.likeCount,
              readByMe: chapter.readByMe,
              isNew: chapter.isNew,
              charCount: chapter.charCount,
            }))}
          />
        )}
      </section>
    </article>
  );
}

/** 등장인물: 처음엔 접혀 있고, 누르면 펼쳐진다 (details라 키보드·화면 낭독기에서도 '펼침/접힘'으로 읽힘) */
function CharacterList({ characters }: { characters: Character[] }) {
  return (
    <details className="group mt-6 rounded-2xl border border-line bg-surface">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition hover:bg-surface-2/60 focus-visible:outline-2 focus-visible:outline-accent [&::-webkit-details-marker]:hidden">
        <span>
          등장인물 <span className="font-normal text-muted">{characters.length}명</span>
        </span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-4 shrink-0 text-muted transition group-open:rotate-180">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </summary>
      <ul className="divide-y divide-line border-t border-line px-4">
        {characters.map((character, index) => (
          <li key={index} className="flex gap-3 py-3">
            <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-soft text-sm font-bold text-accent">
              {[...character.name][0]}
            </span>
            <div className="min-w-0 flex-1 pt-1.5">
              <div className="font-semibold break-keep">{character.name}</div>
              {character.description ? (
                <div className="mt-0.5 text-sm leading-relaxed break-keep text-muted">{character.description}</div>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </details>
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

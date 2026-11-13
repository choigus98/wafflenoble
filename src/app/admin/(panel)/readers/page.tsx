import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { ReaderRow } from '@/components/admin/reader-row';
import { Skeleton } from '@/components/ui';
import { formatDate, formatRelative } from '@/lib/format';
import { progressLabel, progressPercent } from '@/lib/guild-progress';
import { adminListReaders } from '@/lib/queries/admin';
import { countReaders, daysAway, filterReaders, isAway, parseReaderFilter, READER_FILTERS } from '@/lib/reader-filter';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: '길드원' };

export default function ReadersPage({ searchParams }: PageProps<'/admin/readers'>) {
  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-bold tracking-tight">길드원</h1>
      <p className="mt-1.5 mb-6 text-sm leading-relaxed text-muted">
        열람 비밀번호로 들어온 사람들이에요. 삭제하면 그 사람의 좋아요·열람 기록이 지워지고 바로 다시 입장해야 해요.
      </p>
      <Suspense fallback={<Skeleton className="h-60" />}>
        <ReaderList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function ReaderList({ searchParams }: Pick<PageProps<'/admin/readers'>, 'searchParams'>) {
  // 거르기 (?show=away: 2주 넘게 안 들어온 길드원만)
  const filter = parseReaderFilter((await searchParams).show);
  const everyone = await adminListReaders();
  const now = new Date();

  if (everyone.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-line px-6 py-12 text-center text-muted">
        아직 들어온 길드원이 없어요.
      </p>
    );
  }

  const counts = countReaders(everyone, now);
  const readers = filterReaders(everyone, filter, now);

  return (
    <>
      <nav aria-label="길드원 거르기" className="mb-3 flex flex-wrap items-center gap-1.5">
        {READER_FILTERS.map((item) => (
          <Link
            key={item.key}
            href={item.key === 'all' ? '/admin/readers' : `/admin/readers?show=${item.key}`}
            aria-current={filter === item.key ? 'page' : undefined}
            scroll={false}
            className={cn(
              'inline-flex h-8 items-center gap-1 rounded-full border px-3 text-[13px] font-semibold transition',
              filter === item.key ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-surface text-muted hover:text-fg',
            )}
          >
            {item.label} <span className="font-normal tabular-nums">{counts[item.key]}명</span>
          </Link>
        ))}
      </nav>
      {/* 거른 길드원이 없으면 아래 빈 안내만 (같은 말을 두 번 하지 않게) */}
      {filter === 'away' && readers.length > 0 ? <p className="mb-3 text-[13px] text-muted">마지막으로 들어온 지 2주가 넘은 길드원이에요.</p> : null}
      {readers.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line px-6 py-12 text-center text-muted">2주 넘게 안 들어온 길드원이 없어요.</p>
      ) : (
        <ReaderItems readers={readers} now={now} />
      )}
    </>
  );
}

function ReaderItems({ readers, now }: { readers: Awaited<ReturnType<typeof adminListReaders>>; now: Date }) {
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface px-4 sm:px-5">
      {readers.map((reader) => (
        <ReaderRow
          // 이름이 바뀌면 key가 바뀌어 수정 창이 닫힌 상태로 다시 그려진다
          key={`${reader.id}:${reader.nickname}`}
          reader={{
            id: reader.id,
            nickname: reader.nickname,
            firstSeen: formatDate(reader.createdAt),
            lastSeen: formatRelative(reader.lastSeenAt, now),
            // 2주 넘게 안 들어왔으면 이름 옆에 '15일째 안 들어옴'
            awayDays: isAway(reader.lastSeenAt, now) ? daysAway(reader.lastSeenAt, now) : null,
            readChapters: reader.readChapters,
            likes: reader.likes,
            // 작품마다 공개 회차 중 어디까지 읽었는지 (최근에 연 작품부터)
            progress: reader.progress.map((item) => ({
              novelId: item.novelId,
              novel: item.novelTitle,
              label: progressLabel(item),
              percent: progressPercent(item),
              latest: item.reached >= item.total,
            })),
            lastRead: reader.lastRead
              ? {
                  href: `/admin/novels/${reader.lastRead.novelId}/chapters/${reader.lastRead.chapterId}`,
                  novel: reader.lastRead.novelTitle,
                  chapter: reader.lastRead.title
                    ? `${reader.lastRead.position}화 「${reader.lastRead.title}」`
                    : `${reader.lastRead.position}화`,
                  at: reader.lastRead.at.toISOString(),
                  when: formatRelative(reader.lastRead.at, now),
                }
              : null,
          }}
        />
      ))}
    </ul>
  );
}

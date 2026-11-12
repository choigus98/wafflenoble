import Link from 'next/link';
import { Suspense } from 'react';
import { NovelCover } from '@/components/novel-cover';
import { Badge, Skeleton } from '@/components/ui';
import { formatRelative } from '@/lib/format';
import { listNovels } from '@/lib/queries/reader';
import { SERIAL_STATUS_LABEL } from '@/lib/utils';

export default function HomePage() {
  return (
    <>
      <h1 className="pt-8 pb-5 text-xl font-bold tracking-tight">작품</h1>
      <Suspense fallback={<NovelGridSkeleton />}>
        <NovelGrid />
      </Suspense>
    </>
  );
}

async function NovelGrid() {
  const { viewer, novels } = await listNovels();
  const now = new Date();

  if (novels.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line px-6 py-16 text-center text-muted">
        {viewer.kind === 'admin' ? (
          <>
            아직 작품이 없어요.{' '}
            <Link href="/admin/novels/new" className="font-semibold text-accent underline-offset-4 hover:underline">
              첫 작품 만들기
            </Link>
          </>
        ) : (
          '아직 공개된 작품이 없어요. 곧 올라올 거예요!'
        )}
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3">
      {novels.map((novel) => (
        <li key={novel.id}>
          <Link href={`/novels/${novel.id}`} className="group block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">
            <NovelCover id={novel.id} title={novel.title} color={novel.coverColor} className="transition duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md" />
            <div className="mt-3 space-y-1.5">
              <p className="line-clamp-2 leading-snug font-semibold">{novel.title}</p>
              <div className="flex flex-wrap items-center gap-1.5 text-[13px] text-muted">
                <Badge tone={novel.serialStatus === 'completed' ? 'neutral' : 'accent'}>
                  {SERIAL_STATUS_LABEL[novel.serialStatus]}
                </Badge>
                {!novel.isPublished ? <Badge tone="muted">비공개</Badge> : null}
                <span>
                  {novel.chapterCount > 0 ? `${novel.chapterCount}화` : '준비 중'}
                  {novel.lastPublishedAt ? ` · ${formatRelative(novel.lastPublishedAt, now)}` : ''}
                </span>
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function NovelGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="space-y-3">
          <Skeleton className="aspect-[3/4]" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { Badge, Skeleton } from '@/components/ui';
import { formatNumber, formatRelative } from '@/lib/format';
import { adminListChapterNotes } from '@/lib/queries/admin';
import { parseId } from '@/lib/utils';

/**
 * '작가 메모 모아 보기': 회차마다 에디터 아래 '작가 메모(나만 보기)'에 남긴 메모를 회차 순서대로 한 화면에.
 * 메모마다 회차 번호 · 제목 · 상태 · 고친 때와 '메모 고치기'(그 회차 에디터의 메모 칸으로). 길드원 화면에는 나오지 않는다
 */
export default function NovelNotesPage({ params }: PageProps<'/admin/novels/[novelId]/notes'>) {
  return (
    <Suspense fallback={<NotesSkeleton />}>
      <NovelNotes params={params} />
    </Suspense>
  );
}

async function NovelNotes({ params }: Pick<PageProps<'/admin/novels/[novelId]/notes'>, 'params'>) {
  const novelId = parseId((await params).novelId);
  if (!novelId) notFound();
  const data = await adminListChapterNotes(novelId);
  if (!data) notFound();
  const { novel, notes } = data;
  const now = new Date();

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/admin/novels/${novel.id}`} className="text-sm font-semibold text-muted hover:text-fg">
          ← {novel.title}
        </Link>
        <h1 className="mt-3 text-xl font-bold tracking-tight">
          작가 메모 {notes.length > 0 ? <span className="text-muted tabular-nums">{formatNumber(notes.length)}</span> : null}
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">회차마다 남긴 나만 보는 메모를 회차 순서대로 모았어요. 길드원 화면에는 나오지 않아요.</p>
      </div>
      {notes.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line px-6 py-12 text-center text-sm leading-relaxed text-muted">
          아직 작가 메모가 없어요. 회차 에디터 맨 아래 ‘작가 메모’에 적으면 여기에 모여요.
        </p>
      ) : (
        <ol className="space-y-3">
          {notes.map((note) => (
            <li key={note.chapterId}>
              <article aria-labelledby={`note-${note.chapterId}`} className="rounded-2xl border border-line bg-surface px-4 py-4 sm:px-5">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
                  <h2 id={`note-${note.chapterId}`} className="min-w-0 font-semibold break-keep">
                    <span className="text-accent tabular-nums">{note.position}화</span> {note.title || '(제목 없음)'}
                  </h2>
                  <Link
                    href={`/admin/novels/${novel.id}/chapters/${note.chapterId}#private-note`}
                    aria-label={`${note.position}화 메모 고치기`}
                    className="-mr-2 inline-flex min-h-9 shrink-0 items-center rounded-lg px-2 text-sm font-semibold text-accent transition hover:bg-accent-soft"
                  >
                    메모 고치기 →
                  </Link>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                  <Badge tone={note.scheduled ? 'neutral' : note.status === 'published' ? 'accent' : 'muted'}>
                    {note.scheduled ? '예약' : note.status === 'published' ? '발행' : '임시저장'}
                  </Badge>
                  <time dateTime={note.updatedAt.toISOString()}>메모 {formatRelative(note.updatedAt, now)} 수정</time>
                </div>
                <p className="mt-3 text-[15px] leading-relaxed break-keep whitespace-pre-line">{note.body}</p>
              </article>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function NotesSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-32" />
      <Skeleton className="h-32" />
    </div>
  );
}

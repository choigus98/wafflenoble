import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ReaderRow } from '@/components/admin/reader-row';
import { Skeleton } from '@/components/ui';
import { formatDate, formatRelative } from '@/lib/format';
import { progressLabel, progressPercent } from '@/lib/guild-progress';
import { adminListReaders } from '@/lib/queries/admin';

export const metadata: Metadata = { title: '길드원' };

export default function ReadersPage() {
  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-bold tracking-tight">길드원</h1>
      <p className="mt-1.5 mb-6 text-sm leading-relaxed text-muted">
        열람 비밀번호로 들어온 사람들이에요. 삭제하면 그 사람의 좋아요·열람 기록이 지워지고 바로 다시 입장해야 해요.
      </p>
      <Suspense fallback={<Skeleton className="h-60" />}>
        <ReaderList />
      </Suspense>
    </div>
  );
}

async function ReaderList() {
  const readers = await adminListReaders();
  const now = new Date();

  if (readers.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-line px-6 py-12 text-center text-muted">
        아직 들어온 길드원이 없어요.
      </p>
    );
  }

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

import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { TodayReadTime } from '@/components/reader/today-read-time';
import { Skeleton } from '@/components/ui';
import { formatNumber, formatRelative } from '@/lib/format';
import { getMyRecord } from '@/lib/queries/reader';

export const metadata: Metadata = { title: '내 기록' };

export default function MyRecordPage() {
  return (
    <div className="pt-8">
      <Suspense fallback={<Skeleton className="h-72" />}>
        <MyRecord />
      </Suspense>
    </div>
  );
}

type RecordItem = { at: Date; chapterId: number; position: number; title: string; novelId: number; novelTitle: string };

async function MyRecord() {
  const { record } = await getMyRecord();
  if (!record) {
    return (
      <>
        <h1 className="text-xl font-bold tracking-tight">내 기록</h1>
        <p className="mt-4 rounded-2xl border border-dashed border-line px-6 py-12 text-center text-sm text-muted">
          길드원으로 들어왔을 때 보이는 화면이에요. 관리자는 길드원 화면에서 기록을 볼 수 있어요.
        </p>
      </>
    );
  }
  const now = new Date();

  return (
    <>
      <h1 className="text-xl font-bold tracking-tight break-keep">{record.nickname}님의 기록</h1>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">
        같은 이름으로 들어오면 다른 기기에서도 이어져요. 작가도 누가 읽고 좋아요했는지 볼 수 있어요.
      </p>

      <dl className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-line bg-surface px-4 py-3.5">
          <dt className="text-xs font-semibold text-muted">읽은 회차</dt>
          <dd className="mt-1 text-2xl font-bold tabular-nums">{formatNumber(record.readCount)}</dd>
        </div>
        <div className="rounded-2xl border border-line bg-surface px-4 py-3.5">
          <dt className="text-xs font-semibold text-muted">좋아요</dt>
          <dd className="mt-1 text-2xl font-bold text-like tabular-nums">{formatNumber(record.likeCount)}</dd>
        </div>
      </dl>
      {/* 이 기기에서 센 읽은 시간 (서버 기록과 달리 기기마다 따로) */}
      <TodayReadTime />

      <RecordList
        title="좋아요한 회차"
        items={record.liked}
        now={now}
        verb="좋아요"
        empty="아직 좋아요한 회차가 없어요. 회차 끝의 ♡ 좋아요를 누르면 여기에 모여요."
      />
      <RecordList title="최근에 읽은 회차" items={record.recent} now={now} verb="읽음" empty="아직 읽은 회차가 없어요." />
    </>
  );
}

function RecordList({ title, items, now, verb, empty }: { title: string; items: RecordItem[]; now: Date; verb: string; empty: string }) {
  const headingId = `record-${verb}`;
  return (
    <section aria-labelledby={headingId} className="mt-9">
      <h2 id={headingId} className="mb-2 text-sm font-semibold text-muted">
        {title}
      </h2>
      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line px-6 py-8 text-center text-sm text-muted">{empty}</p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {items.map((item) => (
            <li key={item.chapterId}>
              <Link href={`/novels/${item.novelId}/${item.chapterId}`} className="flex items-center gap-3 px-1 py-3.5 transition hover:bg-surface-2/60">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] text-muted">{item.novelTitle}</span>
                  <span className="block truncate font-medium">
                    {item.position}화{item.title ? ` ${item.title}` : ''}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-muted">
                  {formatRelative(item.at, now)} {verb}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

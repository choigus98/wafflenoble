import Link from 'next/link';
import { Suspense } from 'react';
import { RecentActivity } from '@/components/admin/recent-activity';
import { RecentChapters } from '@/components/admin/recent-chapters';
import { ScheduledChapters } from '@/components/admin/scheduled-chapters';
import { WeekChars } from '@/components/admin/week-chars';
import { NovelCover } from '@/components/novel-cover';
import { Badge, ButtonLink, Skeleton } from '@/components/ui';
import { formatNumber, formatRelative } from '@/lib/format';
import type { WeekReads } from '@/lib/week-reads';
import { adminGetGuildSettings, adminListNovels, adminWeekReads } from '@/lib/queries/admin';
import { SERIAL_STATUS_LABEL } from '@/lib/utils';

export default function AdminHomePage() {
  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold tracking-tight">작품</h1>
        <ButtonLink href="/admin/novels/new">+ 새 작품</ButtonLink>
      </div>
      <Suspense fallback={<ListSkeleton />}>
        <NovelList />
      </Suspense>
      {/* 최근 고친 회차 3개: 바로 이어 쓰러 가기 (회차가 없으면 칸째 안 그린다) */}
      <Suspense fallback={null}>
        <div className="mt-10 empty:hidden">
          <RecentChapters />
        </div>
      </Suspense>
      {/* 예약이 없으면 칸째 안 그린다 (기다리는 동안에도 자리를 잡지 않음) */}
      <Suspense fallback={null}>
        <div className="mt-10 empty:hidden">
          <ScheduledChapters />
        </div>
      </Suspense>
      <div className="mt-10">
        <Suspense fallback={<Skeleton className="h-48" />}>
          <RecentActivity />
        </Suspense>
      </div>
      {/* 이 기기에서 최근 7일 쓴 글자수: 브라우저에서만 그려져서, 그려질 때 아래 내용이 밀리지 않게 맨 끝에 */}
      <div className="mt-10 empty:hidden">
        <WeekChars />
      </div>
    </>
  );
}

async function NovelList() {
  const [novels, guild, week] = await Promise.all([adminListNovels(), adminGetGuildSettings(), adminWeekReads()]);
  const now = new Date();

  return (
    <div className="space-y-6">
      {!guild.hasPassword ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent/40 bg-accent-soft px-5 py-4">
          <p className="text-sm leading-relaxed">
            <strong>길드 열람 비밀번호</strong>를 아직 정하지 않았어요. 정해야 길드원이 들어올 수 있어요.
          </p>
          <ButtonLink href="/admin/settings" size="sm">
            비밀번호 정하기
          </ButtonLink>
        </div>
      ) : null}

      {novels.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line px-6 py-16 text-center">
          <p className="text-muted">아직 작품이 없어요.</p>
          <ButtonLink href="/admin/novels/new" className="mt-4">
            첫 작품 만들기
          </ButtonLink>
        </div>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {novels.map((novel) => (
            <li key={novel.id}>
              <Link href={`/admin/novels/${novel.id}`} className="flex items-center gap-4 px-4 py-4 transition hover:bg-surface-2/60 sm:px-5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent">
                <NovelCover id={novel.id} title={novel.title} color={novel.coverColor} size="sm" className="w-12 shrink-0 [&_p]:hidden" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <p className="truncate font-semibold">{novel.title}</p>
                  <div className="flex flex-wrap items-center gap-1.5 text-[13px] text-muted">
                    <Badge tone={novel.isPublished ? 'accent' : 'muted'}>{novel.isPublished ? '공개' : '비공개'}</Badge>
                    <Badge>{SERIAL_STATUS_LABEL[novel.serialStatus]}</Badge>
                    <span>
                      발행 {novel.publishedChapters}
                      {novel.scheduledChapters > 0 ? ` · 예약 ${novel.scheduledChapters}` : ''} / 전체 {novel.totalChapters}화 ·{' '}
                      {formatRelative(novel.updatedAt, now)} 수정
                    </span>
                  </div>
                  {/* 비공개 작품은 길드원이 못 읽으니 빼고, 공개 작품은 읽은 사람이 없어도 '없음'으로 */}
                  {novel.isPublished ? <WeekLine week={week.get(novel.id)} /> : null}
                </div>
                <span aria-hidden="true" className="text-muted">
                  ›
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** 작품 목록 한 줄: '최근 7일 2명 읽음 · 많이 읽힌 회차 1화 「자정의 손님」 2명' */
function WeekLine({ week }: { week: WeekReads | undefined }) {
  if (!week || week.readers === 0) return <p className="text-[13px] text-muted">최근 7일 동안 읽은 길드원이 없어요</p>;
  const top = week.top;
  return (
    <p className="text-[13px] break-keep text-muted">
      최근 7일 <span className="font-semibold text-fg">{formatNumber(week.readers)}명</span> 읽음
      {top ? (
        <>
          {' · '}많이 읽힌 회차 {top.position}화{top.title ? ` 「${top.title}」` : ''} {formatNumber(top.readers)}명
        </>
      ) : null}
    </p>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }, (_, index) => (
        <Skeleton key={index} className="h-20" />
      ))}
    </div>
  );
}

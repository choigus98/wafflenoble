import Link from 'next/link';
import type { ReactNode } from 'react';
import { formatNumber } from '@/lib/format';
import { chapterStateSummary, type NovelStats } from '@/lib/novel-stats';
import { formatReadingTime } from '@/lib/reading-time';

/**
 * 관리자 작품 화면 맨 위 '작품 통계' 칸들: 전체 글자수 · 회차 평균 · 회차 수(상태별) · 가장 긴 회차.
 * 숫자가 곧 그림이라 막대 없이 칸마다 이름 · 값 · 덧붙임 한 줄 (낭독기에는 이름-값 목록으로)
 */
export function NovelStatsSection({ novelId, stats }: { novelId: number; stats: NovelStats }) {
  return (
    <section aria-labelledby="novel-stats-title" className="space-y-3">
      <h2 id="novel-stats-title" className="font-bold">
        작품 통계
      </h2>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        <Stat label="전체 글자수" value={`${formatNumber(stats.totalChars)}자`} note={stats.minutes ? `다 읽는 데 ${formatReadingTime(stats.minutes)}` : '아직 본문이 없어요'} />
        <Stat
          label="회차 평균"
          value={stats.average === null ? '—' : `${formatNumber(stats.average)}자`}
          note={stats.withText > 0 ? `본문 있는 ${formatNumber(stats.withText)}화 기준` : '본문 있는 회차가 없어요'}
        />
        <Stat label="회차" value={`${formatNumber(stats.counts.all)}화`} note={chapterStateSummary(stats.counts)} />
        {stats.longest ? (
          <Stat
            label="가장 긴 회차"
            value={`${formatNumber(stats.longest.charCount)}자`}
            note={
              // 아주 긴 제목은 두 줄까지만 (전체 제목은 마우스를 올리면, 낭독기는 다 읽음)
              <Link
                href={`/admin/novels/${novelId}/chapters/${stats.longest.id}`}
                title={stats.longest.title || undefined}
                className="line-clamp-2 min-h-6 pt-1 font-semibold text-accent wrap-anywhere hover:underline"
              >
                {stats.longest.position}화 {stats.longest.title || '(제목 없음)'}
              </Link>
            }
          />
        ) : null}
      </dl>
      <p className="text-xs text-muted">글자수는 공백 포함이고 임시저장·예약 회차도 더해요. 템플릿 안의 글은 들어가지 않아요.</p>
    </section>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note: ReactNode }) {
  return (
    <div className="min-w-0 rounded-2xl border border-line bg-surface px-4 py-3">
      <dt className="text-xs font-semibold text-muted">{label}</dt>
      <dd className="mt-1 text-xl font-semibold break-keep text-fg">{value}</dd>
      <dd className="mt-0.5 text-xs break-keep text-muted">{note}</dd>
    </div>
  );
}

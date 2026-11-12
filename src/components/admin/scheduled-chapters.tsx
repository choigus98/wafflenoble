import Link from 'next/link';
import { Badge } from '@/components/ui';
import { formatSchedule, formatUntil } from '@/lib/format';
import { adminListScheduledChapters } from '@/lib/queries/admin';

/**
 * 관리자 홈: 예약해 둔 회차를 공개 시각이 빠른 순으로 (작품이 여러 개여도 한눈에). 예약이 없으면 아무것도 안 그린다.
 * 작품이 비공개면 시간이 돼도 길드원에게 안 보이므로 따로 표시한다
 */
export async function ScheduledChapters() {
  const items = await adminListScheduledChapters();
  if (items.length === 0) return null;
  const now = new Date();

  return (
    <section aria-labelledby="scheduled-chapters-title" className="space-y-3">
      <h2 id="scheduled-chapters-title" className="font-bold">
        예약된 회차 <span className="text-muted">{items.length}</span>
      </h2>
      <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
        {items.map((item) => (
          <li key={item.chapterId}>
            <Link
              href={`/admin/novels/${item.novelId}/chapters/${item.chapterId}`}
              className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-surface-2/60 sm:px-5"
            >
              <span className="min-w-0 flex-1 space-y-1">
                <span className="block truncate font-medium">
                  <span className="text-accent tabular-nums">{item.position}화</span> {item.title || '(제목 없음)'}
                </span>
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                  <span className="min-w-0 truncate">{item.novelTitle}</span>
                  {item.novelPublished ? null : <Badge tone="danger">작품 비공개라 안 보여요</Badge>}
                </span>
              </span>
              <span className="shrink-0 text-right text-xs text-muted tabular-nums">
                <span className="block font-semibold text-fg">{formatUntil(item.publishedAt, now)}</span>
                <time dateTime={item.publishedAt.toISOString()}>{formatSchedule(item.publishedAt)}</time>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

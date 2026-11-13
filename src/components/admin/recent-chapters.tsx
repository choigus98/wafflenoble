import Link from 'next/link';
import { Badge } from '@/components/ui';
import { formatNumber, formatRelative } from '@/lib/format';
import { adminRecentEditedChapters } from '@/lib/queries/admin';

/**
 * 관리자 홈 '최근 고친 회차': 모든 작품에서 최근에 고친 회차 3개를 바로 그 회차 에디터로 가는 줄로 (이어 쓰기).
 * 줄마다 회차 번호·제목, 상태(회차 목록과 같은 배지), 작품, 글자수, 고친 때. 회차가 하나도 없으면 칸째 안 그린다
 * 목록 상자가 모서리를 자르므로(overflow-hidden) 키보드 포커스 테두리는 줄 안쪽에 그린다
 */
export async function RecentChapters() {
  const items = await adminRecentEditedChapters();
  if (items.length === 0) return null;
  const now = new Date();

  return (
    <section aria-labelledby="recent-chapters-title" className="space-y-3">
      <h2 id="recent-chapters-title" className="font-bold">
        최근 고친 회차
      </h2>
      <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
        {items.map((item) => (
          <li key={item.chapterId}>
            <Link
              href={`/admin/novels/${item.novelId}/chapters/${item.chapterId}`}
              className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-surface-2/60 sm:px-5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
            >
              <span className="min-w-0 flex-1 space-y-1">
                <span className="block truncate font-medium">
                  <span className="text-accent tabular-nums">{item.position}화</span> {item.title || '(제목 없음)'}
                </span>
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                  <Badge tone={item.scheduled ? 'neutral' : item.status === 'published' ? 'accent' : 'muted'}>
                    {item.scheduled ? '예약' : item.status === 'published' ? '발행' : '임시저장'}
                  </Badge>
                  <span className="min-w-0 truncate">{item.novelTitle}</span>
                  <span className="tabular-nums">{formatNumber(item.charCount)}자</span>
                </span>
              </span>
              <span className="shrink-0 text-right text-xs text-muted">
                <span className="block font-semibold text-accent">이어 쓰기 ›</span>
                <time dateTime={item.updatedAt.toISOString()}>{formatRelative(item.updatedAt, now)} 수정</time>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

import Link from 'next/link';
import { formatRelative, particle } from '@/lib/format';
import { adminLast24h, adminRecentActivity, type Activity } from '@/lib/queries/admin';
import { cn } from '@/lib/utils';

/** 관리자 홈: 누가 어느 회차를 읽고 좋아요를 눌렀는지, 새 길드원은 누구인지 (최근 순) */
export async function RecentActivity() {
  const [items, summary] = await Promise.all([adminRecentActivity(), adminLast24h()]);
  const now = new Date();

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="font-bold">최근 반응</h2>
        <p className="text-[13px] text-muted">
          최근 24시간 · 읽은 사람 {summary.readers}명 · 좋아요 {summary.likes}개 · 새 길드원 {summary.joins}명
        </p>
      </div>
      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line px-6 py-10 text-center text-sm text-muted">
          아직 반응이 없어요. 길드원이 읽거나 좋아요를 누르면 여기에 보여요.
        </p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {items.map((item, index) => (
            <li key={`${item.kind}-${item.at.getTime()}-${index}`} className="flex items-start gap-3 px-4 py-3 sm:px-5">
              <ActivityIcon kind={item.kind} />
              <p className="min-w-0 flex-1 text-sm leading-relaxed break-keep">
                <ActivityText item={item} />
              </p>
              <time dateTime={item.at.toISOString()} className="shrink-0 pt-0.5 text-xs text-muted">
                {formatRelative(item.at, now)}
              </time>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function chapterTarget(item: Extract<Activity, { kind: 'like' | 'read' }>) {
  const title = item.chapterTitle ? `${item.position}화 ${item.chapterTitle}` : `${item.position}화`;
  const label = item.chapterTitle ? `${item.position}화 「${item.chapterTitle}」` : `${item.position}화`;
  return { title, label, href: `/admin/novels/${item.novelId}/chapters/${item.chapterId}` };
}

function ActivityText({ item }: { item: Activity }) {
  const name = <strong className="font-semibold">{item.nickname}</strong>;
  if (item.kind === 'join') return <>{name}님이 처음 들어왔어요</>;

  const { title, label, href } = chapterTarget(item);
  const link = (
    <Link href={href} className="font-medium text-accent underline-offset-2 hover:underline">
      {label}
    </Link>
  );
  if (item.kind === 'like') return <>{name}님이 {link}에 좋아요를 눌렀어요</>;
  // 조사는 제목(「」 빼고)의 받침 기준으로, 링크 밖에 붙인다
  return (
    <>
      {name}님이 {link}
      {particle(title, '을', '를')} {item.viewCount > 1 ? `다시 읽었어요 · ${item.viewCount}번째` : '읽었어요'}
    </>
  );
}

function ActivityIcon({ kind }: { kind: Activity['kind'] }) {
  const styles = {
    like: 'bg-like/12 text-like',
    read: 'bg-accent-soft text-accent',
    join: 'bg-surface-2 text-muted',
  };
  return (
    <span aria-hidden="true" className={cn('grid size-7 shrink-0 place-items-center rounded-full', styles[kind])}>
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {kind === 'like' ? (
          <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" fill="currentColor" stroke="none" />
        ) : kind === 'read' ? (
          <path d="M3 5.5C5 4.5 8 4.3 12 6.5c4-2.2 7-2 9-1v13c-2-1-5-1.2-9 1-4-2.2-7-2-9-1zM12 6.5v13" />
        ) : (
          <>
            <circle cx="10" cy="8" r="3.5" />
            <path d="M3.5 19.5c1-3.6 3.6-5.5 6.5-5.5s5.5 1.9 6.5 5.5M19 8v6M16 11h6" />
          </>
        )}
      </svg>
    </span>
  );
}

import { adminUnreadCommentCount } from '@/lib/queries/admin';

/** 메뉴 '댓글' 옆 새 댓글 수. 없으면 아무것도 그리지 않는다 */
export async function UnreadCommentsBadge() {
  const unread = await adminUnreadCommentCount();
  if (unread === 0) return null;
  return (
    <span className="ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 py-px text-[11px] leading-4 font-bold text-accent-fg tabular-nums">
      <span aria-hidden="true">{unread > 99 ? '99+' : unread}</span>
      <span className="sr-only">, 새 댓글 {unread}개</span>
    </span>
  );
}

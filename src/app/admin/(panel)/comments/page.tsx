import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AdminCommentList } from '@/components/admin/admin-comment-list';
import { Skeleton } from '@/components/ui';
import { adminListComments } from '@/lib/queries/admin';

export const metadata: Metadata = { title: '댓글' };

export default function CommentsPage() {
  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-bold tracking-tight">댓글</h1>
      <p className="mt-1.5 mb-6 text-sm leading-relaxed text-muted">
        모든 회차의 댓글을 최근 것부터 모았어요. 길드원끼리는 익명으로 보이고, 쓴 사람 이름은 여기(작가)에게만 보여요.
      </p>
      <Suspense fallback={<Skeleton className="h-60" />}>
        <CommentList />
      </Suspense>
    </div>
  );
}

async function CommentList() {
  const rows = await adminListComments();
  return (
    <>
      {rows.length > 0 ? <p className="mb-3 text-[13px] text-muted">{rows.length}개</p> : null}
      <AdminCommentList
        empty="아직 댓글이 없어요. 길드원이 회차 끝에 댓글을 남기면 여기에 모여요."
        items={rows.map((row) => ({
          id: row.id,
          author: row.nickname,
          body: row.body,
          createdAt: row.createdAt.toISOString(),
          chapter: {
            label: `${row.novelTitle} · ${row.position}화${row.chapterTitle ? ` 「${row.chapterTitle}」` : ''}`,
            href: `/admin/novels/${row.novelId}/chapters/${row.chapterId}`,
            readerHref: `/novels/${row.novelId}/${row.chapterId}#comments-title`,
          },
        }))}
      />
    </>
  );
}

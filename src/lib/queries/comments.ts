import 'server-only';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { chapterComments, readers } from '@/lib/db/schema';
import { toCommentItems, type CommentItem } from '@/lib/comments';

/** 회차 댓글 (오래된 것부터). 쓴 사람 이름은 관리자에게만 (lib/comments.ts) */
export async function getComments(chapterId: number, viewer: { readerId: string | null; isAdmin: boolean }): Promise<CommentItem[]> {
  const rows = await db
    .select({
      id: chapterComments.id,
      body: chapterComments.body,
      createdAt: chapterComments.createdAt,
      readerId: chapterComments.readerId,
      nickname: readers.nickname,
    })
    .from(chapterComments)
    .innerJoin(readers, eq(readers.id, chapterComments.readerId))
    .where(eq(chapterComments.chapterId, chapterId))
    .orderBy(asc(chapterComments.createdAt), asc(chapterComments.id));
  return toCommentItems(rows, viewer);
}

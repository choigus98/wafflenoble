// 회차 댓글: 글 다듬기와 화면에 보낼 모양 만들기 (DB와 상관없는 부분만 — 테스트용으로 따로 둔다)

export const COMMENT_MAX = 500;
/** 1분에 쓸 수 있는 댓글 수 (연타·도배 막기) */
export const COMMENT_PER_MINUTE = 5;

/** 앞뒤 공백을 지우고, 줄바꿈은 \n으로 맞추고, 빈 줄은 한 줄까지만. 비거나 너무 길면 null */
export function normalizeComment(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const body = raw
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (!body || [...body].length > COMMENT_MAX) return null;
  return body;
}

export type CommentRow = { id: number; body: string; createdAt: Date; readerId: string; nickname: string };

/**
 * 화면에 보낼 댓글. 길드원에게는 쓴 사람을 아예 보내지 않는다(author: null → '익명').
 * 작가(관리자)에게만 이름을 보낸다
 */
export type CommentItem = { id: number; body: string; createdAt: string; mine: boolean; author: string | null };

export function toCommentItems(rows: CommentRow[], viewer: { readerId: string | null; isAdmin: boolean }): CommentItem[] {
  return rows.map((row) => ({
    id: row.id,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    mine: viewer.readerId !== null && row.readerId === viewer.readerId,
    author: viewer.isAdmin ? row.nickname : null,
  }));
}

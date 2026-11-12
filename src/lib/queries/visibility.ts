import 'server-only';
import { sql, type SQL } from 'drizzle-orm';
import { chapterLikes, chapterViews, chapters, novels, readers } from '@/lib/db/schema';

// ─── 회차 공개 규칙 (예약 발행 포함) ──────────────────────────
// 시각 비교는 서버·브라우저 시계가 아니라 DB 시계(now()) 기준이다.
// - 길드원에게 보임: 발행 상태이고 공개 시각이 지남
// - 예약 대기: 발행 상태지만 공개 시각이 아직 안 옴 (관리자만 봄)

/** chapters 테이블을 직접 조회할 때 쓰는 조건 */
export const isVisibleChapter = sql<boolean>`(${chapters.status} = 'published' and ${chapters.publishedAt} <= now())`;
export const isScheduledChapter = sql<boolean>`(${chapters.status} = 'published' and ${chapters.publishedAt} > now())`;

// ─── 상관 하위 쿼리 ──────────────────────────────────────────
// 주의: drizzle은 조인 없는 쿼리에서 컬럼을 "id"처럼 테이블 이름 없이 쓴다.
// 그대로 하위 쿼리에 넣으면 바깥 테이블이 아니라 안쪽 테이블 컬럼으로 읽혀서 개수가 틀어진다.
// 그래서 안쪽 테이블에는 별칭(c, l, v)을 붙이고, 바깥 테이블은 ${table}.id처럼 이름으로 가리킨다.

const visibleIn = (alias: string): SQL => sql.raw(`(${alias}.status = 'published' and ${alias}.published_at <= now())`);
const scheduledIn = (alias: string): SQL => sql.raw(`(${alias}.status = 'published' and ${alias}.published_at > now())`);

/** 작품(novels)별 전체 회차 수 */
export const novelChapterCount = sql<number>`(select count(*)::int from ${chapters} c where c.novel_id = ${novels}.id)`;

/** 작품별 길드원에게 보이는 회차 수 */
export const novelVisibleChapterCount = sql<number>`(
  select count(*)::int from ${chapters} c where c.novel_id = ${novels}.id and ${visibleIn('c')}
)`;

/** 작품별 예약 대기 회차 수 */
export const novelScheduledChapterCount = sql<number>`(
  select count(*)::int from ${chapters} c where c.novel_id = ${novels}.id and ${scheduledIn('c')}
)`;

/** 작품별 '최근 업데이트': 길드원에게 보이는 회차의 공개 시각 중 가장 최근 (예약 대기는 빼고) */
export const novelLastVisibleAt = sql<Date | null>`(
  select max(c.published_at) from ${chapters} c where c.novel_id = ${novels}.id and ${visibleIn('c')}
)`.mapWith(chapters.publishedAt);

/** 회차(chapters)별 좋아요 수 */
export const chapterLikeCount = sql<number>`(select count(*)::int from ${chapterLikes} l where l.chapter_id = ${chapters}.id)`;

/** 회차별 읽은 사람 수 */
export const chapterReaderCount = sql<number>`(select count(*)::int from ${chapterViews} v where v.chapter_id = ${chapters}.id)`;

/** 이 길드원이 이 회차를 읽었는지 */
export const chapterReadBy = (readerId: string) =>
  sql<boolean>`exists(select 1 from ${chapterViews} v where v.chapter_id = ${chapters}.id and v.reader_id = ${readerId})`;

/** 길드원(readers)별 읽은 회차 수 */
export const readerReadCount = sql<number>`(select count(*)::int from ${chapterViews} v where v.reader_id = ${readers}.id)`;

/** 길드원별 좋아요 수 */
export const readerLikeCount = sql<number>`(select count(*)::int from ${chapterLikes} l where l.reader_id = ${readers}.id)`;

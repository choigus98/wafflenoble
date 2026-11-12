import { PgDialect } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import {
  chapterIsNewFor,
  chapterLikeCount,
  chapterReadBy,
  chapterReaderCount,
  novelChapterCount,
  novelLastVisibleAt,
  novelNewChapterCount,
  novelScheduledChapterCount,
  novelVisibleChapterCount,
  readerLikeCount,
  readerReadCount,
} from './visibility';

const dialect = new PgDialect();
const render = (fragment: Parameters<PgDialect['sqlToQuery']>[0]) => dialect.sqlToQuery(fragment).sql.replace(/\s+/g, ' ');

// drizzle은 조인 없는 쿼리에서 컬럼을 테이블 이름 없이 쓰기 때문에, 하위 쿼리가 바깥 테이블을
// 이름으로 가리키지 않으면 안쪽 테이블 컬럼으로 잘못 읽힌다 (실제로 회차 수가 틀렸던 버그)
describe('상관 하위 쿼리는 바깥 테이블을 이름으로 가리킨다', () => {
  it.each([
    ['작품별 전체 회차 수', novelChapterCount, 'c.novel_id = "novels".id'],
    ['작품별 보이는 회차 수', novelVisibleChapterCount, 'c.novel_id = "novels".id'],
    ['작품별 예약 회차 수', novelScheduledChapterCount, 'c.novel_id = "novels".id'],
    ['작품별 최근 업데이트', novelLastVisibleAt, 'c.novel_id = "novels".id'],
    ['회차별 좋아요 수', chapterLikeCount, 'l.chapter_id = "chapters".id'],
    ['회차별 읽은 사람 수', chapterReaderCount, 'v.chapter_id = "chapters".id'],
    ['길드원별 읽은 회차 수', readerReadCount, 'v.reader_id = "readers".id'],
    ['길드원별 좋아요 수', readerLikeCount, 'l.reader_id = "readers".id'],
  ])('%s', (_name, fragment, expected) => {
    expect(render(fragment)).toContain(expected);
  });

  it('이 길드원이 읽었는지', () => {
    expect(render(chapterReadBy('00000000-0000-0000-0000-000000000000'))).toContain('v.chapter_id = "chapters".id');
  });

  it('새 회차: 보이는 회차 중 3일 안에 공개됐고 이 길드원이 안 읽은 것', () => {
    const reader = '00000000-0000-0000-0000-000000000000';
    const perNovel = dialect.sqlToQuery(novelNewChapterCount(reader));
    expect(perNovel.sql.replace(/\s+/g, ' ')).toContain('c.novel_id = "novels".id');
    expect(perNovel.sql).toContain("c.published_at > now() - interval '3 days'");
    expect(perNovel.sql).toContain('v.chapter_id = c.id and v.reader_id = $1');
    expect(perNovel.params).toEqual([reader]);

    const perChapter = dialect.sqlToQuery(chapterIsNewFor(reader));
    expect(perChapter.sql).toContain("interval '3 days'");
    expect(perChapter.sql).toContain('not exists(select 1 from "chapter_views" v where v.chapter_id = "chapters".id');
  });

  it('보이는 회차는 발행 상태이면서 공개 시각이 지난 것', () => {
    expect(render(novelVisibleChapterCount)).toContain("c.status = 'published' and c.published_at <= now()");
    expect(render(novelScheduledChapterCount)).toContain("c.status = 'published' and c.published_at > now()");
  });
});

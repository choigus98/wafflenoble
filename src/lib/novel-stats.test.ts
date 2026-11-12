import { describe, expect, it } from 'vitest';
import { chapterStateSummary, novelStats } from '@/lib/novel-stats';

const chapter = (id: number, position: number, charCount: number, status: 'draft' | 'published' = 'published', scheduled = false) => ({
  id,
  position,
  title: `${position}화 제목`,
  charCount,
  status,
  scheduled,
});

describe('작품 통계', () => {
  it('전체 글자수는 임시저장·예약까지, 평균은 본문이 있는 회차만, 가장 긴 회차는 같으면 앞 회차', () => {
    const stats = novelStats([chapter(1, 1, 5200), chapter(2, 2, 0, 'draft'), chapter(3, 3, 6100, 'published', true), chapter(4, 4, 6100, 'draft'), chapter(5, 5, 3000)]);
    expect(stats.totalChars).toBe(20400);
    expect(stats.minutes).toBe(34);
    expect(stats.withText).toBe(4);
    expect(stats.average).toBe(5100);
    expect(stats.longest).toEqual({ id: 3, position: 3, title: '3화 제목', charCount: 6100 });
    expect(stats.counts).toEqual({ all: 5, published: 2, scheduled: 1, draft: 2 });
  });

  it('본문이 있는 회차가 하나뿐이면 가장 긴 회차는 없음, 하나도 없으면 평균·읽는 시간도 없음', () => {
    expect(novelStats([chapter(1, 1, 288), chapter(2, 2, 0, 'draft')]).longest).toBeNull();
    const empty = novelStats([chapter(1, 1, 0, 'draft')]);
    expect(empty).toMatchObject({ totalChars: 0, minutes: null, withText: 0, average: null, longest: null });
    expect(novelStats([]).counts.all).toBe(0);
  });

  it('회차 상태 요약은 0인 것을 뺌', () => {
    expect(chapterStateSummary({ all: 3, published: 2, scheduled: 0, draft: 1 })).toBe('발행 2 · 임시저장 1');
    expect(chapterStateSummary({ all: 4, published: 1, scheduled: 2, draft: 1 })).toBe('발행 1 · 예약 2 · 임시저장 1');
    expect(chapterStateSummary({ all: 0, published: 0, scheduled: 0, draft: 0 })).toBe('');
  });
});

import { describe, expect, it } from 'vitest';
import { weekReadsByNovel } from '@/lib/week-reads';

describe('최근 7일 열람', () => {
  it('작품마다 읽은 길드원 수와 가장 많이 읽힌 회차 (같으면 앞 회차)', () => {
    const result = weekReadsByNovel(
      [
        { novelId: 1, readers: 3 },
        { novelId: 2, readers: 1 },
      ],
      [
        { novelId: 1, chapterId: 12, position: 5, title: '다섯째', readers: 2 },
        { novelId: 1, chapterId: 10, position: 3, title: '셋째', readers: 2 },
        { novelId: 1, chapterId: 11, position: 4, title: '넷째', readers: 1 },
        { novelId: 2, chapterId: 20, position: 1, title: '', readers: 1 },
      ],
    );
    expect(result.get(1)).toEqual({ readers: 3, top: { chapterId: 10, position: 3, title: '셋째', readers: 2 } });
    expect(result.get(2)).toEqual({ readers: 1, top: { chapterId: 20, position: 1, title: '', readers: 1 } });
    expect(result.get(3)).toBeUndefined();
  });
});

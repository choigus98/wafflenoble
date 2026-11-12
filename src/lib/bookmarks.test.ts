import { describe, expect, it } from 'vitest';
import { bookmarkSnippet, bookmarksOf, findBookmarkTarget, parseBookmarks, removeBookmark, toggleBookmark, type Bookmark } from '@/lib/bookmarks';

const mark = (patch: Partial<Bookmark> = {}): Bookmark => ({ novelId: 1, chapterId: 3, position: 3, title: '템플릿 예시', index: 4, snippet: '수진이 휴대폰을 확인했다.', at: 1000, ...patch });

describe('책갈피', () => {
  it('저장 값 읽기: 모양이 틀린 것은 버림', () => {
    expect(parseBookmarks(null)).toEqual([]);
    expect(parseBookmarks('{망가짐')).toEqual([]);
    expect(parseBookmarks(JSON.stringify([mark(), { ...mark(), index: -1 }, { ...mark(), title: 3 }, null, 'x']))).toEqual([mark()]);
  });

  it('첫머리: 띄어쓰기 한 칸, 40자까지', () => {
    expect(bookmarkSnippet('  지은은\n  문을   열었다. ')).toBe('지은은 문을 열었다.');
    expect([...bookmarkSnippet('가'.repeat(60))]).toHaveLength(40);
  });

  it('같은 회차·같은 자리면 빼고, 아니면 맨 앞에 꽂음', () => {
    const first = toggleBookmark([], mark());
    expect(first).toEqual({ list: [mark()], added: true });
    const second = toggleBookmark(first.list, mark({ index: 9, at: 2000 }));
    expect(second.list.map((item) => item.index)).toEqual([9, 4]);
    expect(toggleBookmark(second.list, mark({ at: 3000 }))).toEqual({ list: [mark({ index: 9, at: 2000 })], added: false });
    expect(removeBookmark(second.list, 3, 9)).toEqual([mark()]);
  });

  it('자리 찾기: 순번과 첫머리가 맞으면 그대로, 밀렸으면 첫머리가 같은 가장 가까운 덩어리, 없으면 순번(끝을 넘으면 마지막)', () => {
    const snippets = ['첫 문단', '둘째', '셋째', '둘째', '다섯째'];
    expect(findBookmarkTarget(snippets, 2, '셋째')).toBe(2);
    expect(findBookmarkTarget(snippets, 4, '둘째')).toBe(3);
    expect(findBookmarkTarget(snippets, 0, '둘째')).toBe(1);
    expect(findBookmarkTarget(snippets, 2, '사라진 문단')).toBe(2);
    expect(findBookmarkTarget(snippets, 9, '사라진 문단')).toBe(4);
    expect(findBookmarkTarget([], 0, '')).toBe(-1);
  });

  it('작품마다, 최근에 꽂은 차례로', () => {
    const list = [mark({ at: 1 }), mark({ novelId: 2, at: 5 }), mark({ index: 7, at: 3 })];
    expect(bookmarksOf(list, 1).map((item) => item.at)).toEqual([3, 1]);
  });
});

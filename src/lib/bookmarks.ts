// 열람 '책갈피': 회차를 읽다가 지금 읽는 곳(화면 맨 위 문단)에 꽂아 두고, 작품 화면에서 바로 간다.
// 이 기기의 localStorage에만 (회원이 없어서 길드원 기기마다 따로). 최대 100개, 넘치면 오래된 것부터 뺀다.
// 문단은 본문 안 몇 번째 덩어리(문단·인용·템플릿)인지와 첫머리 글로 찾는다 — 작가가 글을 고쳐 자리가 밀려도 첫머리로 다시 찾게

export const BOOKMARKS_KEY = 'wn:bookmarks';
export const BOOKMARKS_CHANGE = 'wn:bookmarks';
const MAX_BOOKMARKS = 100;
const SNIPPET_LENGTH = 40;

export type Bookmark = {
  novelId: number;
  chapterId: number;
  position: number; // 몇 화
  title: string; // 회차 제목
  index: number; // 본문 안 몇 번째 덩어리 (0부터)
  snippet: string; // 그 덩어리 첫머리 (띄어쓰기 한 칸으로, 40자까지)
  at: number; // 꽂은 때
};

const isInt = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

/** 저장해 둔 글 읽기 (모양이 틀린 것은 버림) */
export function parseBookmarks(raw: string | null): Bookmark[] {
  if (!raw) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  return data.flatMap((item): Bookmark[] => {
    if (typeof item !== 'object' || item === null) return [];
    const { novelId, chapterId, position, title, index, snippet, at } = item as Record<string, unknown>;
    if (!isInt(novelId) || !isInt(chapterId) || !isInt(position) || !isInt(index) || !isInt(at)) return [];
    if (typeof title !== 'string' || typeof snippet !== 'string') return [];
    return [{ novelId, chapterId, position, title: title.slice(0, 100), index, snippet: snippet.slice(0, SNIPPET_LENGTH), at }];
  });
}

/** 본문 덩어리 글을 책갈피 첫머리로 (띄어쓰기 한 칸, 40자까지) */
export function bookmarkSnippet(text: string): string {
  return [...text.replace(/\s+/g, ' ').trim()].slice(0, SNIPPET_LENGTH).join('');
}

/** 같은 회차·같은 자리면 빼고(꽂혀 있었으면 false), 아니면 맨 앞에 꽂는다(true). 넘치면 오래된 것부터 */
export function toggleBookmark(list: Bookmark[], bookmark: Bookmark): { list: Bookmark[]; added: boolean } {
  const same = (item: Bookmark) => item.chapterId === bookmark.chapterId && item.index === bookmark.index;
  if (list.some(same)) return { list: list.filter((item) => !same(item)), added: false };
  return { list: [bookmark, ...list].slice(0, MAX_BOOKMARKS), added: true };
}

export function removeBookmark(list: Bookmark[], chapterId: number, index: number): Bookmark[] {
  return list.filter((item) => !(item.chapterId === chapterId && item.index === index));
}

/**
 * 책갈피 자리 찾기: 그 순번의 덩어리 첫머리가 같으면 그대로, 아니면(글이 고쳐져 밀렸으면) 첫머리가 같은 덩어리 중 원래 순번에 가장 가까운 것,
 * 그것도 없으면 원래 순번(본문보다 뒤면 마지막 덩어리). 덩어리가 없으면 -1
 */
export function findBookmarkTarget(snippets: string[], index: number, snippet: string): number {
  if (snippets.length === 0) return -1;
  if (snippets[index] === snippet) return index;
  let best = -1;
  snippets.forEach((value, at) => {
    if (value === snippet && (best === -1 || Math.abs(at - index) < Math.abs(best - index))) best = at;
  });
  if (best !== -1) return best;
  return Math.min(index, snippets.length - 1);
}

/** 작품 화면 목록 · 회차 화면에서 이 작품(회차) 책갈피만, 최근에 꽂은 차례로 */
export function bookmarksOf(list: Bookmark[], novelId: number): Bookmark[] {
  return list.filter((item) => item.novelId === novelId).sort((a, b) => b.at - a.at);
}

// 회차 에디터 '쓰던 곳으로': 회차마다 마지막으로 글을 쓴 자리를 이 기기의 localStorage에 기억했다가,
// 회차를 다시 열었을 때 그 자리가 첫 화면에 안 보이면 그리로 가는 단추를 띄운다.
// 자리는 본문 맨 위 덩어리(문단·인용·템플릿) 순번 + 그 안의 위치 + 덩어리 첫머리 글로 기억한다
// — 다른 기기에서 앞쪽을 고쳐 자리가 밀려도 첫머리로 다시 찾게 (책갈피와 같은 방식).
// 최대 100회차, 넘치면 오래전에 쓴 회차부터 뺀다. 에디터(DOM) 없이 계산만 해서 테스트할 수 있다

import type { Node as PMNode } from '@tiptap/pm/model';
import { bookmarkSnippet, findBookmarkTarget } from '@/lib/bookmarks';

export const EDIT_SPOT_KEY = 'wn:edit-spot';
const MAX_SPOTS = 100;
// 단추에 보여 줄 '자리 바로 앞 글' 길이 (320px 화면에서도 한 줄에 들어가게)
const BEFORE_LENGTH = 12;
// 자리 앞 글을 찾을 때 거슬러 볼 길이 (문서 위치 단위)
const LOOK_BACK = 200;

export type EditSpot = {
  index: number; // 본문 맨 위 덩어리 순번 (0부터)
  offset: number; // 그 덩어리 안 위치 (덩어리 바로 앞이 0)
  snippet: string; // 그 덩어리 첫머리 (책갈피와 같이 띄어쓰기 한 칸, 40자까지)
  before: string; // 자리 바로 앞 글 (띄어쓰기 한 칸, 12자까지, 더 있었으면 앞에 …)
  at: number; // 쓴 때
};
export type EditSpots = Record<string, EditSpot>;

const isCount = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

/** 저장해 둔 글 읽기 (회차 번호가 아니거나 모양이 틀린 것은 버림) */
export function parseEditSpots(raw: string | null): EditSpots {
  if (!raw) return {};
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return {};
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return {};
  const spots: EditSpots = {};
  for (const [id, value] of Object.entries(data)) {
    if (!/^[1-9]\d{0,15}$/.test(id) || typeof value !== 'object' || value === null) continue;
    const { index, offset, snippet, before, at } = value as Record<string, unknown>;
    if (!isCount(index) || !isCount(offset) || !isCount(at) || typeof snippet !== 'string' || typeof before !== 'string') continue;
    spots[id] = { index, offset, snippet: bookmarkSnippet(snippet), before: [...before].slice(0, BEFORE_LENGTH + 1).join(''), at };
  }
  return spots;
}

/** 이 회차 자리를 바꿔 넣기 (넘치면 오래전에 쓴 회차부터 뺌) */
export function noteEditSpot(spots: EditSpots, chapterId: number, spot: EditSpot): EditSpots {
  const entries = Object.entries({ ...spots, [String(chapterId)]: spot });
  if (entries.length <= MAX_SPOTS) return Object.fromEntries(entries);
  return Object.fromEntries(entries.sort((a, b) => b[1].at - a[1].at).slice(0, MAX_SPOTS));
}

/** 문서 위치 pos를 기억할 자리로 (문서가 비었으면 null) */
export function editSpotAt(doc: PMNode, pos: number, at: number): EditSpot | null {
  if (doc.childCount === 0) return null;
  const clamped = Math.max(0, Math.min(pos, doc.content.size));
  const index = Math.min(doc.resolve(clamped).index(0), doc.childCount - 1);
  let start = 0;
  for (let i = 0; i < index; i += 1) start += doc.child(i).nodeSize;
  const block = doc.child(index);
  const text = doc.textBetween(Math.max(0, clamped - LOOK_BACK), clamped, ' ', ' ').replace(/\s+/g, ' ').trim();
  const chars = [...text];
  const before = chars.length > BEFORE_LENGTH ? `…${chars.slice(-BEFORE_LENGTH).join('').trimStart()}` : text;
  return { index, offset: Math.min(clamped - start, block.nodeSize), snippet: bookmarkSnippet(block.textContent), before, at };
}

/**
 * 기억한 자리를 지금 문서의 위치로: 첫머리로 덩어리를 다시 찾고(밀렸으면 가장 가까운 같은 첫머리, 없으면 같은 순번),
 * 그 안 위치는 덩어리 길이에 맞춰 줄인다. 커서를 둘 수 있는 자리로 고르는 건 부르는 쪽(Selection.near)
 */
export function editSpotPosition(doc: PMNode, spot: EditSpot): number {
  const snippets: string[] = [];
  doc.forEach((block) => snippets.push(bookmarkSnippet(block.textContent)));
  const index = findBookmarkTarget(snippets, spot.index, spot.snippet);
  if (index === -1) return 0;
  let start = 0;
  for (let i = 0; i < index; i += 1) start += doc.child(i).nodeSize;
  const block = doc.child(index);
  // 템플릿처럼 안에 글자가 없는 덩어리는 그 앞, 문단·인용은 안쪽 끝까지
  return block.isLeaf ? start : start + Math.max(1, Math.min(spot.offset, block.nodeSize - 1));
}

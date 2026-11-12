import type { Node as PMNode } from '@tiptap/pm/model';
import { storyBlockToText } from '@/lib/chapter-text';
import { findMatches } from '@/lib/find';
import { parseStoryBlock } from '@/lib/story-blocks';

// 회차 에디터 '등장인물 횟수': 작품 정보의 등장인물 이름이 이 회차에 몇 번 나오는지.
// - 본문은 찾기·바꾸기와 같은 방식으로 센다 (그래서 누르면 찾기 창의 개수와 같다. 영문 대소문자는 안 가림)
// - 템플릿(카톡·게시글 등) 안의 글은 텍스트로 내보내기와 같은 글로 풀어서 따로 센다 (찾기 창은 템플릿 안을 못 찾아서)
// - 한 이름이 더 긴 다른 이름 안에 든 자리('주인 할머니' 안의 '할머니')는 긴 이름 몫으로만 센다
// 에디터(DOM) 없이 문서만 보고 계산해서 테스트할 수 있다.

export type CharacterCount = { name: string; body: number; templates: number };
export type CharacterCounts = { appeared: CharacterCount[]; missing: string[] };

type Range = { from: number; to: number };

/** 영문 대문자만 소문자로 (글자 수가 안 바뀌어서 위치가 그대로) */
const fold = (text: string) => text.replace(/[A-Z]/g, (char) => char.toLowerCase());

function textMatches(text: string, name: string): Range[] {
  const haystack = fold(text);
  const needle = fold(name);
  const ranges: Range[] = [];
  for (let index = haystack.indexOf(needle); index !== -1; index = haystack.indexOf(needle, index + needle.length)) {
    ranges.push({ from: index, to: index + needle.length });
  }
  return ranges;
}

/** 긴 이름부터 자리를 차지하고, 짧은 이름은 이미 차지된 자리 안에 든 것을 뺀다 */
function claim(names: string[], matchesOf: (name: string) => Range[]): Map<string, number> {
  const counts = new Map<string, number>();
  const taken: Range[] = [];
  for (const name of [...names].sort((a, b) => b.length - a.length)) {
    const free = matchesOf(name).filter((range) => !taken.some((other) => other.from <= range.from && range.to <= other.to));
    taken.push(...free);
    counts.set(name, free.length);
  }
  return counts;
}

/** 등장인물 이름 정리: 띄어쓰기 한 칸으로, 빈 이름·같은 이름은 한 번만 (적은 순서 그대로) */
export function characterNames(names: string[]): string[] {
  const seen = new Set<string>();
  const list: string[] = [];
  for (const raw of names) {
    const name = raw.replace(/\s+/g, ' ').trim();
    const key = fold(name);
    if (!name || seen.has(key)) continue;
    seen.add(key);
    list.push(name);
  }
  return list;
}

export function characterCounts(doc: PMNode, rawNames: string[]): CharacterCounts {
  const names = characterNames(rawNames);
  if (names.length === 0) return { appeared: [], missing: [] };

  const body = claim(names, (name) => findMatches(doc, name));

  // 템플릿은 하나씩 글로 풀어서 (템플릿끼리 자리가 섞이지 않게 따로 센 뒤 더함)
  const templates = new Map(names.map((name) => [name, 0]));
  doc.descendants((node) => {
    if (node.type.name !== 'storyBlock') return true;
    const block = parseStoryBlock(node.attrs.kind, node.attrs.data);
    if (block) {
      const text = storyBlockToText(block);
      for (const [name, count] of claim(names, (name) => textMatches(text, name))) templates.set(name, (templates.get(name) ?? 0) + count);
    }
    return false;
  });

  const all = names.map((name) => ({ name, body: body.get(name) ?? 0, templates: templates.get(name) ?? 0 }));
  return {
    // 많이 나온 차례로 (같으면 적은 순서)
    appeared: all.filter((item) => item.body + item.templates > 0).sort((a, b) => b.body + b.templates - (a.body + a.templates)),
    missing: all.filter((item) => item.body + item.templates === 0).map((item) => item.name),
  };
}

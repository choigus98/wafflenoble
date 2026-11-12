import type { Node as PMNode } from '@tiptap/pm/model';

// 회차 에디터 '찾기·바꾸기'에서 쓰는 찾기 계산. 에디터(DOM) 없이 문서만 보고 계산해서 테스트할 수 있다.
// - 본문 문단(글이 들어가는 블록)만 찾는다. 템플릿 블록은 글이 속성(data)에 들어 있어서 저절로 빠진다
// - 굵게·기울임이 섞여 글자가 여러 조각으로 나뉘어 있어도 한 문단 안이면 이어서 찾는다
// - 영문 대소문자는 가리지 않는다 (한글은 영향 없음)

export type FindMatch = { from: number; to: number };

/** 글자 수가 바뀌지 않게 영문 대문자만 소문자로 (위치 계산이 어긋나지 않게) */
function fold(text: string): string {
  return text.replace(/[A-Z]/g, (char) => char.toLowerCase());
}

export function findMatches(doc: PMNode, query: string): FindMatch[] {
  const needle = fold(query);
  if (!needle) return [];
  const matches: FindMatch[] = [];

  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;
    // 문단 안의 글을 이어 붙인다. 줄바꿈 같은 글자 아닌 칸은 한 칸짜리 기호로 둬서 위치를 맞춘다
    let text = '';
    node.forEach((child) => {
      text += child.isText ? (child.text ?? '') : '￼'.repeat(child.nodeSize);
    });
    const haystack = fold(text);
    const start = pos + 1; // 문단 안쪽 첫 위치
    for (let index = haystack.indexOf(needle); index !== -1; index = haystack.indexOf(needle, index + needle.length)) {
      matches.push({ from: start + index, to: start + index + needle.length });
    }
    return false; // 문단 안쪽은 이미 봤다
  });

  return matches;
}

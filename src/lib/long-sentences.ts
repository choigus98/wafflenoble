import type { Node as PMNode } from '@tiptap/pm/model';

// 회차 에디터 '긴 문장 찾기': 한 문장이 기준(80 · 100 · 150자)보다 긴 곳.
// - 문장은 문단 안에서 마침표·물음표·느낌표·말줄임표(+ 닫는 따옴표·괄호) 뒤에 띄어쓰기·줄바꿈·문단 끝이 오면 나눈다 ('3.5초'처럼 바로 글자가 이어지면 안 나눔)
// - 문단 안 줄바꿈도 문장 경계로 본다. 글자 수는 띄어쓰기 포함 (에디터 글자수와 같은 셈)
// - 템플릿 안의 글은 빠진다 (글이 속성에 들어 있어서)
// 에디터(DOM) 없이 문서만 보고 계산해서 테스트할 수 있다.

export const SENTENCE_LIMITS = [80, 100, 150] as const;
export type SentenceLimit = (typeof SENTENCE_LIMITS)[number];

/** 줄바꿈 같은 글자 아닌 칸 (lib/find.ts와 같은 자리표) */
const PLACEHOLDER = '￼';
const END = /[.!?…]+["”’'」』)\]]*(?=[\s￼]|$)/g;

/** 글 한 덩어리를 문장 자리(앞뒤 띄어쓰기는 뺀 [start, end))로 */
export function sentenceRanges(text: string): Array<{ start: number; end: number }> {
  const cuts: Array<{ at: number; skip: number }> = [];
  for (const match of text.matchAll(END)) cuts.push({ at: match.index + match[0].length, skip: 0 });
  for (let index = 0; index < text.length; index += 1) if (text[index] === PLACEHOLDER) cuts.push({ at: index, skip: 1 });
  cuts.sort((a, b) => a.at - b.at);

  const ranges: Array<{ start: number; end: number }> = [];
  const push = (from: number, to: number) => {
    let start = from;
    let end = to;
    while (start < end && /\s/.test(text[start])) start += 1;
    while (end > start && /\s/.test(text[end - 1])) end -= 1;
    if (end > start) ranges.push({ start, end });
  };
  let start = 0;
  for (const cut of cuts) {
    push(start, cut.at);
    start = cut.at + cut.skip;
  }
  push(start, text.length);
  return ranges;
}

export type LongSentence = { from: number; to: number; length: number; preview: string };

const PREVIEW_CHARS = 36;

/** 문서에서 기준보다 긴 문장 (문서 앞에서부터). from·to는 에디터 위치 */
export function longSentences(doc: PMNode, limit: number): LongSentence[] {
  const found: LongSentence[] = [];
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;
    let text = '';
    node.forEach((child) => {
      text += child.isText ? (child.text ?? '') : PLACEHOLDER.repeat(child.nodeSize);
    });
    for (const { start, end } of sentenceRanges(text)) {
      const chars = Array.from(text.slice(start, end));
      if (chars.length <= limit) continue;
      found.push({
        from: pos + 1 + start,
        to: pos + 1 + end,
        length: chars.length,
        preview: `${chars.slice(0, PREVIEW_CHARS).join('')}…`,
      });
    }
    return false;
  });
  return found;
}

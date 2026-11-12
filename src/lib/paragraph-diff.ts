// '발행본과 바뀐 곳 보기': 마지막 발행본과 지금 에디터 내용을 문단 단위로 비교한다.
// - 문단 하나(템플릿은 글로 푼 것 하나)를 비교 단위로, 빈 문단(간격)은 뺀다
// - 가장 긴 공통 부분(LCS)으로 같은 문단을 맞추고, 지운 문단·새 문단이 붙어 있으면 차례로 짝지어 '고친 문단'으로
// - 붙어 있는 바뀐 문단은 한 묶음으로, 묶음마다 바로 앞의 같은 문단을 '어디쯤인지' 보여 주는 실마리로 붙인다
// - 고친 문단은 앞뒤 같은 글자를 떼어 내서 실제로 바뀐 부분만 강조할 수 있게 한다

import { inlineText, storyBlockToText, type DocNode } from '@/lib/chapter-text';
import { htmlToDoc } from '@/lib/html-doc';
import { parseStoryBlock } from '@/lib/story-blocks';

export const SCENE_BREAK_UNIT = '* * *';

/** 비교 단위: 글이 든 문단(장면 전환·인용 문단 포함) 하나 또는 템플릿 하나 */
export type Unit = { text: string; template: boolean };

/** 문서를 비교 단위 목록으로 */
export function docUnits(doc: DocNode): Unit[] {
  const units: Unit[] = [];
  const add = (text: string) => {
    const clean = text.replace(/\u00a0/g, ' ').trim();
    if (clean) units.push({ text: clean, template: false });
  };
  for (const node of doc.content ?? []) {
    if (node.type === 'paragraph') add(inlineText(node));
    else if (node.type === 'horizontalRule') units.push({ text: SCENE_BREAK_UNIT, template: false });
    else if (node.type === 'blockquote') for (const child of node.content ?? []) add(`> ${inlineText(child)}`);
    else if (node.type === 'storyBlock') {
      const block = parseStoryBlock(node.attrs?.kind, node.attrs?.data);
      if (block) units.push({ text: storyBlockToText(block), template: true });
    }
  }
  return units;
}

export type DiffOp = { type: 'same' | 'removed' | 'added'; unit: Unit };

/** 비교 단위 목록 두 개의 차이 (LCS). 너무 길면 앞뒤 같은 부분만 맞추고 가운데는 통째로 바뀐 것으로 */
export function diffUnits(before: Unit[], after: Unit[]): DiffOp[] {
  // 같은 글이어도 문단과 템플릿은 다른 것으로 본다
  const key = (unit: Unit) => `${unit.template ? 'T' : 'P'}${unit.text}`;
  const keysBefore = before.map(key);
  const keysAfter = after.map(key);
  // 앞뒤 같은 부분은 먼저 떼어 낸다 (보통 고친 곳은 몇 군데뿐이라 계산이 훨씬 줄어든다)
  let start = 0;
  while (start < before.length && start < after.length && keysBefore[start] === keysAfter[start]) start += 1;
  let endBefore = before.length;
  let endAfter = after.length;
  while (endBefore > start && endAfter > start && keysBefore[endBefore - 1] === keysAfter[endAfter - 1]) {
    endBefore -= 1;
    endAfter -= 1;
  }
  const head: DiffOp[] = before.slice(0, start).map((unit) => ({ type: 'same', unit }));
  const tail: DiffOp[] = before.slice(endBefore).map((unit) => ({ type: 'same', unit }));
  const a = keysBefore.slice(start, endBefore);
  const b = keysAfter.slice(start, endAfter);
  const removed = (i: number): DiffOp => ({ type: 'removed', unit: before[start + i] });
  const added = (j: number): DiffOp => ({ type: 'added', unit: after[start + j] });

  const middle: DiffOp[] = [];
  if (a.length * b.length > 4_000_000) {
    a.forEach((_, i) => middle.push(removed(i)));
    b.forEach((_, j) => middle.push(added(j)));
  } else {
    // lcs[i][j] = a[i..]와 b[j..]의 공통 길이
    const width = b.length + 1;
    const lcs = new Uint32Array((a.length + 1) * width);
    for (let i = a.length - 1; i >= 0; i -= 1) {
      for (let j = b.length - 1; j >= 0; j -= 1) {
        lcs[i * width + j] = a[i] === b[j] ? lcs[(i + 1) * width + j + 1] + 1 : Math.max(lcs[(i + 1) * width + j], lcs[i * width + j + 1]);
      }
    }
    let i = 0;
    let j = 0;
    while (i < a.length && j < b.length) {
      if (a[i] === b[j]) {
        middle.push({ type: 'same', unit: after[start + j] });
        i += 1;
        j += 1;
      } else if (lcs[(i + 1) * width + j] >= lcs[i * width + j + 1]) {
        middle.push(removed(i));
        i += 1;
      } else {
        middle.push(added(j));
        j += 1;
      }
    }
    while (i < a.length) middle.push(removed(i++));
    while (j < b.length) middle.push(added(j++));
  }
  return [...head, ...middle, ...tail];
}

export type Change = ({ kind: 'changed'; before: string; after: string } | { kind: 'added'; text: string } | { kind: 'removed'; text: string }) & {
  template: boolean;
};
/** 붙어 있는 바뀐 것 묶음. anchor: 바로 앞의 같은 문단·템플릿 (본문 맨 처음이면 null) */
export type ChangeGroup = { anchor: string | null; changes: Change[] };

/**
 * 차이를 '바뀐 곳' 묶음으로. 묶음 안에서 새로 쓴 것마다 아직 짝이 없는 같은 종류(문단·템플릿)의 지운 것을 차례로 짝지어
 * '고친 것'으로, 짝이 없으면 '새 것'으로 (새 본문 순서대로). 끝까지 짝이 없는 지운 것은 묶음 끝에
 */
export function summarizeChanges(ops: DiffOp[]): ChangeGroup[] {
  const groups: ChangeGroup[] = [];
  let anchor: string | null = null;
  let index = 0;
  while (index < ops.length) {
    if (ops[index].type === 'same') {
      anchor = ops[index].unit.text;
      index += 1;
      continue;
    }
    const removed: Unit[] = [];
    const added: Unit[] = [];
    while (index < ops.length && ops[index].type !== 'same') {
      (ops[index].type === 'removed' ? removed : added).push(ops[index].unit);
      index += 1;
    }
    const changes: Change[] = [];
    for (const unit of added) {
      const pair = removed.findIndex((candidate) => candidate.template === unit.template);
      if (pair >= 0) {
        changes.push({ kind: 'changed', before: removed[pair].text, after: unit.text, template: unit.template });
        removed.splice(pair, 1);
      } else changes.push({ kind: 'added', text: unit.text, template: unit.template });
    }
    for (const unit of removed) changes.push({ kind: 'removed', text: unit.text, template: unit.template });
    groups.push({ anchor, changes });
  }
  return groups;
}

/** '고친 문단', '새 템플릿' 같은 이름 */
export function changeLabel(change: Pick<Change, 'kind' | 'template'>): string {
  return `${{ changed: '고친', added: '새', removed: '지운' }[change.kind]} ${change.template ? '템플릿' : '문단'}`;
}

/** 고친 문단에서 실제로 바뀐 부분: 앞뒤 같은 글자를 떼어 낸 나머지 (글자 단위라 이모지도 반쪽으로 안 잘림) */
export function inlineChange(before: string, after: string): { prefix: string; removed: string; added: string; suffix: string } {
  const a = Array.from(before);
  const b = Array.from(after);
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start += 1;
  let end = 0;
  while (end < a.length - start && end < b.length - start && a[a.length - 1 - end] === b[b.length - 1 - end]) end += 1;
  return {
    prefix: a.slice(0, start).join(''),
    removed: a.slice(start, a.length - end).join(''),
    added: b.slice(start, b.length - end).join(''),
    suffix: a.slice(a.length - end).join(''),
  };
}

export type FieldChange = { before: string; after: string };
export type ChapterChanges = { groups: ChangeGroup[]; title: FieldChange | null; note: FieldChange | null };

const fieldChange = (before: string, after: string): FieldChange | null =>
  before.trim() === after.trim() ? null : { before: before.trim(), after: after.trim() };

/** 마지막 발행본(저장된 HTML)과 지금 에디터 내용(문서·제목·작가의 말)을 비교 */
export function compareChapter(
  published: { html: string; title: string; authorNote: string },
  current: { doc: DocNode; title: string; authorNote: string },
): ChapterChanges {
  return {
    groups: summarizeChanges(diffUnits(docUnits(htmlToDoc(published.html)), docUnits(current.doc))),
    title: fieldChange(published.title, current.title),
    note: fieldChange(published.authorNote, current.authorNote),
  };
}

const SUMMARY_ORDER = ['고친 문단', '새 문단', '지운 문단', '고친 템플릿', '새 템플릿', '지운 템플릿'];

/** 창 맨 위 요약, 회차에 보이는 차례대로(제목 → 본문 → 작가의 말): ['제목', '고친 문단 2', '새 템플릿 1'] (바뀐 게 없으면 빈 목록) */
export function changeSummary(result: ChapterChanges): string[] {
  const counts = new Map<string, number>();
  for (const group of result.groups) for (const change of group.changes) counts.set(changeLabel(change), (counts.get(changeLabel(change)) ?? 0) + 1);
  return [
    ...(result.title ? ['제목'] : []),
    ...SUMMARY_ORDER.filter((label) => counts.has(label)).map((label) => `${label} ${counts.get(label)}`),
    ...(result.note ? ['작가의 말'] : []),
  ];
}

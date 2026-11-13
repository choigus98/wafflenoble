import type { Node as PMNode } from '@tiptap/pm/model';

// 회차 에디터 '따옴표 짝': 문단마다 여는 따옴표와 닫는 따옴표의 짝을 맞춰 보고, 짝이 안 맞는 문단을 모은다.
// - 짝: “ ” · ‘ ’ · 「 」 · 『 』. 곧은 따옴표(" ')는 여닫이가 같은 글자라 같은 종류가 열려 있으면 닫고, 아니면 연다
//   (그래서 "그래” 처럼 곧은 것과 둥근 것을 섞어도 짝이 맞는다 — 모양 통일은 '문장 부호 다듬기'가 한다)
// - 방향만 반대인 둥근 따옴표: 여는 자리(문단 맨 앞 · 띄어쓰기 · 여는 괄호 뒤)에 놓인 닫는 따옴표(”그래”)와,
//   같은 종류가 열려 있는데 닫는 자리에 놓인 여는 따옴표(“그래“)는 '방향 반대'로 알려 주고 짝으로 친다
// - 영어 낱말 속 ' ’ (don't · it’s)와, 열린 짝 없이 영어 글자 뒤에 오는 ' ’ (boys’)는 따옴표가 아니라 줄임표라 뺀다
// - 문단 안 줄바꿈은 같은 문단, 문단을 넘는 대사는 문단마다 따로 본다. 템플릿 안의 글은 빠진다 (글이 속성에 들어 있어서)
// 에디터(DOM) 없이 문서만 보고 계산해서 테스트할 수 있다.

type Family = 'double' | 'single' | 'corner' | 'double-corner';

const QUOTES: Record<string, { family: Family; role: 'open' | 'close' | 'both' }> = {
  '“': { family: 'double', role: 'open' },
  '”': { family: 'double', role: 'close' },
  '"': { family: 'double', role: 'both' },
  '‘': { family: 'single', role: 'open' },
  '’': { family: 'single', role: 'close' },
  "'": { family: 'single', role: 'both' },
  '「': { family: 'corner', role: 'open' },
  '」': { family: 'corner', role: 'close' },
  '『': { family: 'double-corner', role: 'open' },
  '』': { family: 'double-corner', role: 'close' },
};

/** 종류마다 [여는, 닫는] 둥근 따옴표 */
const PAIR: Record<Family, readonly [string, string]> = {
  double: ['“', '”'],
  single: ['‘', '’'],
  corner: ['「', '」'],
  'double-corner': ['『', '』'],
};

/** 줄바꿈 같은 글자 아닌 칸 (lib/find.ts와 같은 자리표) */
const PLACEHOLDER = '￼';
/** 이 글자 뒤면 여는 자리 (lib/punctuation.ts '문장 부호 다듬기'와 같은 기준) */
const OPENS_AFTER = /[\s([{<「『〈《“‘—–\-￼]/;
const LATIN = /[A-Za-z]/;

/**
 * - unclosed: 열기만 하고 안 닫음 (fix = 모자란 닫는 따옴표)
 * - unopened: 닫기만 함 (fix = 모자란 여는 따옴표)
 * - reversed: 방향만 반대인 둥근 따옴표 (fix로 바꾸면 짝이 맞음)
 */
export type QuoteProblem = { kind: 'unclosed' | 'unopened' | 'reversed'; char: string; fix: string; offset: number };

type Opened = { char: string; family: Family; offset: number };

/** 그 자리가 여는 자리인지 (문단 맨 앞 · 띄어쓰기 · 여는 괄호 · 줄바꿈 뒤) */
function openingSpot(text: string, index: number): boolean {
  return index === 0 || OPENS_AFTER.test(text[index - 1]);
}

/** 문단 글 하나에서 짝이 안 맞는 따옴표 (앞에서부터) */
export function quoteProblems(text: string): QuoteProblem[] {
  const problems: QuoteProblem[] = [];
  const stack: Opened[] = [];
  const isOpen = (family: Family) => stack.some((opened) => opened.family === family);
  const unclosed = (opened: Opened) => {
    // 곧은 따옴표는 놓인 자리로 무엇이 모자란지 짐작한다 (여는 자리면 닫는 짝이, 아니면 여는 짝이 없음)
    const straight = opened.char === '"' || opened.char === "'";
    if (straight && !openingSpot(text, opened.offset)) problems.push({ kind: 'unopened', char: opened.char, fix: opened.char, offset: opened.offset });
    else problems.push({ kind: 'unclosed', char: opened.char, fix: straight ? opened.char : PAIR[opened.family][1], offset: opened.offset });
  };
  /** 같은 종류의 가장 안쪽 짝을 닫는다 (그 안에서 열고 안 닫은 것은 '닫는 짝 없음') */
  const close = (family: Family) => {
    let index = stack.length - 1;
    while (stack[index].family !== family) index -= 1;
    for (const inner of stack.splice(index).slice(1)) unclosed(inner);
  };

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const quote = QUOTES[char];
    if (!quote) continue;
    const { family, role } = quote;
    if (family === 'single' && role !== 'open' && LATIN.test(text[index - 1] ?? '')) {
      // don't · it’s (영어 글자 사이), boys’ (열린 짝 없이 영어 글자 뒤)는 줄임표
      if (LATIN.test(text[index + 1] ?? '') || !isOpen('single')) continue;
    }
    const opening = openingSpot(text, index);
    if (role === 'both') {
      if (isOpen(family)) close(family);
      else stack.push({ char, family, offset: index });
    } else if (role === 'open') {
      if (!opening && isOpen(family) && (char === '“' || char === '‘')) {
        // “그래“ — 닫는 자리의 여는 따옴표는 방향만 반대인 닫는 따옴표로
        problems.push({ kind: 'reversed', char, fix: PAIR[family][1], offset: index });
        close(family);
      } else {
        stack.push({ char, family, offset: index });
      }
    } else if (isOpen(family)) {
      close(family);
    } else if (opening && (char === '”' || char === '’')) {
      // ”그래” — 여는 자리의 닫는 따옴표는 방향만 반대인 여는 따옴표로
      problems.push({ kind: 'reversed', char, fix: PAIR[family][0], offset: index });
      stack.push({ char, family, offset: index });
    } else {
      problems.push({ kind: 'unopened', char, fix: PAIR[family][0], offset: index });
    }
  }
  for (const opened of stack) unclosed(opened);
  // 닫는 짝 없음은 문단 끝에서 모으므로 자리 순서로 다시 줄 세운다
  return problems.sort((a, b) => a.offset - b.offset);
}

/** 목록에 쓰는 짧은 말: '닫는 ” 없음' · '여는 “ 없음' · '” → “ (방향 반대)' */
export function quoteProblemLabel(problem: QuoteProblem): string {
  if (problem.kind === 'reversed') return `${problem.char} → ${problem.fix} (방향 반대)`;
  return `${problem.kind === 'unclosed' ? '닫는' : '여는'} ${problem.fix} 없음`;
}

export type QuoteSpot = QuoteProblem & { from: number; to: number };
export type QuoteIssue = { pos: number; preview: string; problems: QuoteSpot[] };

const PREVIEW_BEFORE = 12;
const PREVIEW_CHARS = 40;

/** 첫 문제 자리 둘레의 글 (줄바꿈은 띄어쓰기로, 잘린 쪽은 …) */
function previewAround(text: string, offset: number): string {
  const chars = Array.from(text.replaceAll(PLACEHOLDER, ' '));
  // 글자 단위 자리 (이모지처럼 두 칸짜리 글자가 앞에 있어도 어긋나지 않게)
  const at = Array.from(text.slice(0, offset)).length;
  const start = Math.max(0, Math.min(at - PREVIEW_BEFORE, chars.length - PREVIEW_CHARS));
  const end = Math.min(chars.length, start + PREVIEW_CHARS);
  const body = chars.slice(start, end).join('').replace(/\s+/g, ' ');
  return `${start > 0 ? '…' : ''}${start > 0 ? body.trimStart() : body}${end < chars.length ? '…' : ''}`.trim();
}

/** 문서에서 따옴표 짝이 안 맞는 문단 (문서 앞에서부터). pos는 문단 자리(문단 노드 바로 앞), from·to는 문제 따옴표의 에디터 위치 */
export function quoteIssues(doc: PMNode): QuoteIssue[] {
  const issues: QuoteIssue[] = [];
  doc.descendants((node, pos) => {
    if (node.type.name === 'storyBlock') return false;
    if (!node.isTextblock) return true;
    let text = '';
    node.forEach((child) => {
      text += child.isText ? (child.text ?? '') : PLACEHOLDER.repeat(child.nodeSize);
    });
    const problems = quoteProblems(text);
    if (problems.length > 0) {
      issues.push({
        pos,
        preview: previewAround(text, problems[0].offset),
        problems: problems.map((problem) => ({ ...problem, from: pos + 1 + problem.offset, to: pos + 1 + problem.offset + problem.char.length })),
      });
    }
    return false;
  });
  return issues;
}

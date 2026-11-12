import type { Node as PMNode } from '@tiptap/pm/model';

// 회차 에디터 '문장 부호 다듬기': 본문의 ... → …, 곧은 따옴표 → 둥근 따옴표(“ ” ‘ ’).
// - 따옴표는 앞 글자를 보고 방향을 정한다: 문단 맨 앞·띄어쓰기·여는 괄호·줄바꿈 뒤면 여는 따옴표, 아니면 닫는 따옴표
//   ('don't'처럼 글자 사이의 '는 닫는 따옴표 ’ = 아포스트로피와 같은 글자라 그대로 맞다)
// - 점 세 개마다 … 하나 ('......' → '……', '....' → '….')
// - 템플릿 블록은 글이 속성(data)에 들어 있어서 저절로 빠진다
// 에디터(DOM) 없이 문서만 보고 계산해서 테스트할 수 있다.

export type PunctuationFix = { index: number; length: number; text: string };

/** 줄바꿈 같은 글자 아닌 칸 (lib/find.ts와 같은 자리표) */
const PLACEHOLDER = '\uFFFC';
const OPENS_AFTER = /[\s([{<「『〈《“‘—–\-\uFFFC]/;

export function punctuationFixes(text: string): PunctuationFix[] {
  const fixes: PunctuationFix[] = [];
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '.' && text.startsWith('...', i)) {
      fixes.push({ index: i, length: 3, text: '…' });
      i += 2;
      continue;
    }
    if (char === '"' || char === "'") {
      const opening = i === 0 || OPENS_AFTER.test(text[i - 1]);
      fixes.push({ index: i, length: 1, text: char === '"' ? (opening ? '“' : '”') : opening ? '‘' : '’' });
    }
  }
  return fixes;
}

/** 글 한 덩어리를 다듬은 결과 (테스트·미리보기용) */
export function polishPunctuation(text: string): string {
  let result = '';
  let cursor = 0;
  for (const fix of punctuationFixes(text)) {
    result += text.slice(cursor, fix.index) + fix.text;
    cursor = fix.index + fix.length;
  }
  return result + text.slice(cursor);
}

export type PunctuationEdit = { from: number; to: number; text: string };

/** 문서에서 바꿀 곳 (문단마다, 문서 앞에서부터). 적용할 때는 뒤에서부터 바꿔야 위치가 안 어긋난다 */
export function punctuationEdits(doc: PMNode): PunctuationEdit[] {
  const edits: PunctuationEdit[] = [];
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;
    let text = '';
    node.forEach((child) => {
      text += child.isText ? (child.text ?? '') : PLACEHOLDER.repeat(child.nodeSize);
    });
    const start = pos + 1;
    for (const fix of punctuationFixes(text)) edits.push({ from: start + fix.index, to: start + fix.index + fix.length, text: fix.text });
    return false;
  });
  return edits;
}

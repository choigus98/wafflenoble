// 회차 에디터 '따옴표로 감싸기'의 계산: 고른 글을 “ ”로 감싸고, 다시 누르면 ‘ ’ → 「 」 → 『 』 → 벗기기 → “ ” … 차례로.
// - 고른 글 자체가 짝으로 감싸여 있으면(감싼 뒤 바로 다시 누른 경우) 그 짝을 다음 것으로 (inside)
// - 고른 글 바로 앞뒤가 짝이면(안쪽 글만 골랐거나, 빈 짝 “|” 사이에 커서가 있으면) 그 짝을 다음 것으로 (outside)
// - 아니면 “ ”로 감싼다 (wrap). 아무것도 안 골랐으면 빈 “ ”를 넣고 커서를 가운데에
// 에디터(DOM) 없이 계산만 해서 테스트할 수 있다

export const QUOTE_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['“', '”'],
  ['‘', '’'],
  ['「', '」'],
  ['『', '』'],
];

export type QuoteAction = { kind: 'inside' | 'outside' | 'wrap'; open: string; close: string };

/** 짝의 다음 차례 (마지막 다음은 벗기기 = 빈 글) */
function nextPair(index: number): readonly [string, string] {
  return index + 1 < QUOTE_PAIRS.length ? QUOTE_PAIRS[index + 1] : ['', ''];
}

function pairIndex(open: string, close: string): number {
  return QUOTE_PAIRS.findIndex(([o, c]) => o === open && c === close);
}

/** text: 고른 글, before · after: 고른 곳 바로 앞뒤 한 글자 (없으면 '') */
export function nextQuote(text: string, before: string, after: string): QuoteAction {
  if (text.length >= 2) {
    const inside = pairIndex(text[0], text[text.length - 1]);
    if (inside !== -1) {
      const [open, close] = nextPair(inside);
      return { kind: 'inside', open, close };
    }
  }
  const outside = pairIndex(before, after);
  if (outside !== -1) {
    const [open, close] = nextPair(outside);
    return { kind: 'outside', open, close };
  }
  return { kind: 'wrap', open: QUOTE_PAIRS[0][0], close: QUOTE_PAIRS[0][1] };
}

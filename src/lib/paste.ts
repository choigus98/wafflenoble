// 메모장·한글·카톡 등에서 붙여 넣은 '서식 없는 글'을 문단으로 나누는 규칙.
// 에디터(Tiptap)의 붙여넣기에서 쓰고, 테스트하기 쉽게 순수 함수로 둔다.
//
// 원고마다 줄바꿈 습관이 달라서 먼저 어떤 방식인지 알아본다.
// - 문단마다 빈 줄을 두는 원고: 빈 줄 하나는 '문단 구분'일 뿐이라 빈 문단을 만들지 않고, 더 띄운 만큼만 빈 문단으로 남긴다
// - 한 줄 = 한 문단인 원고: 빈 줄은 일부러 띄운 것이라 그대로 빈 문단으로 남긴다
// 장면 전환 기호만 있는 줄(* * *, ---, ◇◇◇ 등)은 장면 전환으로 바꾼다. 말줄임(……) 같은 줄은 건드리지 않는다.

export type PastedBlock = { kind: 'paragraph'; text: string } | { kind: 'scene' };

const SCENE_BREAK =
  /^(?:[*＊]\s*){3,}$|^(?:-\s*){3,}$|^(?:=\s*){3,}$|^(?:[─━—ㅡ]\s*){3,}$|^(?:[◇◆◈]\s*){1,5}$|^(?:[☆★]\s*){3,}$/;

/** 문단마다 빈 줄을 두는 원고로 볼 비율 (문단 사이의 60% 이상에 빈 줄이 있으면) */
const SPACED_RATIO = 0.6;

export function isSceneBreakLine(line: string): boolean {
  return SCENE_BREAK.test(line.trim());
}

export function plainTextToBlocks(text: string): PastedBlock[] {
  // 줄 끝 공백은 지우되, 줄 앞의 전각 공백(들여쓰기)은 남긴다
  const lines = text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/^[ \t]+|[ \t]+$/g, ''));

  // 글이 있는 줄과, 그 앞에 있던 빈 줄 개수
  const items: Array<{ text: string; blanksBefore: number }> = [];
  let blanks = 0;
  for (const line of lines) {
    if (line === '') {
      blanks += 1;
      continue;
    }
    items.push({ text: line, blanksBefore: items.length === 0 ? 0 : blanks });
    blanks = 0;
  }
  if (items.length === 0) return [];

  const gaps = items.slice(1).map((item) => item.blanksBefore);
  const spaced = gaps.length > 0 && gaps.filter((gap) => gap > 0).length / gaps.length >= SPACED_RATIO;

  const blocks: PastedBlock[] = [];
  for (const item of items) {
    if (isSceneBreakLine(item.text)) {
      // 장면 전환 앞뒤의 빈 줄은 넣지 않는다 (장면 전환 자체가 간격을 만든다)
      blocks.push({ kind: 'scene' });
      continue;
    }
    const empties = spaced ? Math.max(0, item.blanksBefore - 1) : item.blanksBefore;
    if (blocks.at(-1)?.kind !== 'scene') {
      for (let i = 0; i < empties; i++) blocks.push({ kind: 'paragraph', text: '' });
    }
    blocks.push({ kind: 'paragraph', text: item.text });
  }
  return blocks;
}

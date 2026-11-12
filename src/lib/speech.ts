import type { Node as PMNode } from '@tiptap/pm/model';
import { storyBlockToText } from '@/lib/chapter-text';
import { parseStoryBlock, type StoryBlock } from '@/lib/story-blocks';

// 회차 에디터 '소리 내어 읽기': 브라우저 목소리로 읽을 단위(문단 하나 · 인용 하나 · 템플릿 하나).
// - 빈 문단과 장면 전환은 건너뛴다
// - 템플릿은 텍스트로 내보내기와 같은 글로 풀고, 머리 '[카톡 1:1 대화]'는 괄호를 떼고 읽는다
// - 위치는 본문 맨 위 블록의 자리라서, 읽는 동안 글을 고쳐도 다음 단위를 그때의 문서에서 다시 찾는다
// 에디터(DOM) 없이 문서만 보고 계산해서 테스트할 수 있다.

export type SpeechUnit = { pos: number; text: string };

/** 템플릿 하나를 읽을 글로: 텍스트로 내보내기와 같은 글, 머리 '[카톡 1:1 대화]'는 괄호를 떼고 '카톡 1:1 대화.' (회차 화면 '소리 내어 듣기'도 씀) */
export function templateSpeech(block: StoryBlock): string {
  const [head, ...rest] = storyBlockToText(block).split('\n');
  return [head.replace(/^\[(.*)\]$/, '$1.'), ...rest].join('\n');
}

/** 블록 하나를 읽을 글로 (읽을 게 없으면 null) */
export function speechText(node: PMNode): string | null {
  if (node.type.name === 'storyBlock') {
    const block = parseStoryBlock(node.attrs.kind, node.attrs.data);
    return block ? templateSpeech(block) : null;
  }
  if (!node.isTextblock && node.type.name !== 'blockquote') return null;
  const text = node.textBetween(0, node.content.size, ' ', ' ').replace(/\s+/g, ' ').trim();
  return text || null;
}

/**
 * pos에서부터 읽을 첫 단위. inclusive면 pos가 들어 있는 블록부터(읽기 시작),
 * 아니면 pos에서 시작하는 블록 다음부터(다음 문단으로)
 */
export function speechUnitFrom(doc: PMNode, pos: number, inclusive: boolean): SpeechUnit | null {
  let found: SpeechUnit | null = null;
  doc.forEach((node, offset) => {
    if (found) return;
    if (inclusive ? offset + node.nodeSize <= pos : offset <= pos) return;
    const text = speechText(node);
    if (text) found = { pos: offset, text };
  });
  return found;
}

/** 지금 읽는 단위가 몇 번째인지 (1부터) · 읽을 단위가 모두 몇 개인지 */
export function speechProgress(doc: PMNode, pos: number): { index: number; total: number } {
  let total = 0;
  let index = 0;
  doc.forEach((node, offset) => {
    if (!speechText(node)) return;
    total += 1;
    if (offset <= pos) index = total;
  });
  return { index, total };
}

/** 회차 화면 '소리 내어 듣기': 덩어리 글을 읽을 모양으로 (줄 안 띄어쓰기는 한 칸, 빈 줄은 빼고 줄바꿈은 쉼으로 남김). 읽을 게 없으면 null */
export function listenText(text: string): string | null {
  const lines = text
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  return lines.length > 0 ? lines.join('\n') : null;
}

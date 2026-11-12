import type { Node as PMNode } from '@tiptap/pm/model';
import { DIALOGUE_START } from '@/lib/body-stats';
import { koreanIncludes } from '@/lib/korean-search';

// 회차 에디터 '대사 모아 보기': 따옴표(" “ ' ‘ 「 『)로 시작하는 문단만 문서 앞에서부터 모아서, 인물 말투를 이어 읽으며 살핀다.
// 대사를 세는 기준은 '본문 통계'와 같다 (인용 안 문단도, 템플릿 안 글은 빼고).
// 에디터(DOM) 없이 문서만 보고 계산해서 테스트할 수 있다.

export type DialogueLine = { pos: number; text: string };

/** 대사 문단들: pos는 그 문단 자리(문단 노드 바로 앞), text는 띄어쓰기를 한 칸으로 (줄바꿈도 한 칸) */
export function dialogueLines(doc: PMNode): DialogueLine[] {
  const lines: DialogueLine[] = [];
  doc.descendants((node, pos) => {
    if (node.type.name === 'storyBlock') return false;
    if (!node.isTextblock) return true;
    const text = node.textBetween(0, node.content.size, ' ', ' ').replace(/\s+/g, ' ').trim();
    if (text && DIALOGUE_START.test(text)) lines.push({ pos, text });
    return false;
  });
  return lines;
}

/** 낱말·이름으로 거르기 (초성·치는 중인 한글도 맞춤, 빈 칸이면 전부) */
export function filterDialogue(lines: DialogueLine[], query: string): DialogueLine[] {
  return query.trim() ? lines.filter((line) => koreanIncludes(line.text, query)) : lines;
}

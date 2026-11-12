import type { Node as PMNode } from '@tiptap/pm/model';
import { parseStoryBlock, templateLabel } from '@/lib/story-blocks';

// 회차 에디터 '장면 바로가기': 장면 전환(✦, 가로줄)으로 나뉜 장면 목록.
// - 장면마다 첫 문장(없으면 첫 템플릿 이름)과 글자 수(공백 포함, 템플릿 안 글자는 빼고 — 에디터 글자수와 같은 규칙)
// - 맨 앞이나 장면 전환이 두 번 이어진 자리처럼 글이 없는 장면도 '빈 장면'으로 보여 준다 (잘못 넣은 장면 전환을 찾기 쉽게)
// 에디터(DOM) 없이 문서만 보고 계산해서 테스트할 수 있다.

export type SceneTarget = { pos: number; kind: 'text' | 'node' | 'near' };

export type Scene = {
  number: number; // 1부터
  from: number; // 장면 첫 블록 위치
  to: number; // 장면 끝 (다음 장면 전환 앞, 마지막 장면은 문서 끝)
  target: SceneTarget; // 바로가기 자리: 장면 첫 블록 — 글 문단이면 맨 앞(text), 템플릿이면 그 템플릿(node). 빈 장면이면 그 장면을 연 장면 전환 줄(node), 맨 앞이면 가까운 곳(near)
  lead: string; // 첫 문장 · 글이 없으면 '[카톡 1:1 대화]' 같은 첫 템플릿 이름 · 빈 장면이면 ''
  chars: number;
};

const LEAD_CHARS = 40;

/** 문단 글에서 첫 문장 (마침표·물음표·느낌표·말줄임표 + 닫는 따옴표까지), 길면 40자에서 자름 */
export function firstSentence(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  const sentence = clean.match(/^.+?[.!?…。](?:["”’'」』)\]]*)(?=\s|$)/)?.[0] ?? clean;
  const chars = Array.from(sentence);
  return chars.length > LEAD_CHARS ? `${chars.slice(0, LEAD_CHARS).join('')}…` : sentence;
}

/** 장면 첫 블록으로 바로가기 자리 */
function targetOf(node: PMNode, offset: number): SceneTarget {
  if (node.isTextblock) return { pos: offset + 1, kind: 'text' };
  if (node.type.name === 'blockquote') return { pos: offset + 2, kind: 'text' };
  return { pos: offset, kind: 'node' };
}

export function sceneOutline(doc: PMNode): Scene[] {
  const scenes: Scene[] = [];
  // 빈 장면의 바로가기 자리는 그 장면을 연 장면 전환 줄 (뒤쪽 줄을 고르면 '지금'이 다음 장면으로 잡혀서)
  const start = (from: number): Scene => ({
    number: scenes.length + 1,
    from,
    to: from,
    target: from > 0 ? { pos: from - 1, kind: 'node' } : { pos: 0, kind: 'near' },
    lead: '',
    chars: 0,
  });
  let current = start(0);
  let empty = true; // 아직 블록이 없음
  let textLead = false; // 첫 문장을 찾음 (템플릿 이름보다 먼저)

  doc.forEach((node, offset) => {
    if (node.type.name === 'horizontalRule') {
      current.to = offset;
      scenes.push(current);
      current = start(offset + node.nodeSize);
      empty = true;
      textLead = false;
      return;
    }
    if (empty) {
      current.target = targetOf(node, offset);
      empty = false;
    }
    current.chars += Array.from(node.textContent).length;
    if (textLead) return;
    if (node.textContent.trim()) {
      // 문단이나 인용: 글이 든 첫 문단의 첫 문장
      const paragraph = node.isTextblock ? node : (Array.from({ length: node.childCount }, (_, index) => node.child(index)).find((child) => child.textContent.trim()) ?? node);
      current.lead = firstSentence(paragraph.textContent);
      textLead = true;
    } else if (node.type.name === 'storyBlock' && !current.lead) {
      const block = parseStoryBlock(node.attrs.kind, node.attrs.data);
      current.lead = `[${block ? templateLabel(block) : '템플릿'}]`;
    }
  });
  current.to = doc.content.size;
  scenes.push(current);
  return scenes;
}

/** 이 위치가 들어 있는 장면의 순번(0부터). 장면 전환 줄 위면 그 뒤 장면 */
export function sceneIndexAt(scenes: Scene[], pos: number): number {
  for (let index = scenes.length - 1; index >= 0; index -= 1) {
    if (pos >= scenes[index].from - 1) return index;
  }
  return 0;
}

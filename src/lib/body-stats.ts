import type { Node as PMNode } from '@tiptap/pm/model';

// 회차 에디터 '본문 통계': 글자수 옆에 문단 · 대사 · 템플릿 수.
// - 문단: 글이 든 문단 (빈 문단은 간격이라 안 셈, 인용 안의 문단도 셈)
// - 대사: 따옴표(" “ ' ‘ 「 『)로 시작하는 문단
// - 템플릿: 본문에 넣은 템플릿 블록 (안의 글은 문단·대사로 세지 않음)

const DIALOGUE_START = /^["“”'‘’「『]/;

export type BodyStats = { paragraphs: number; dialogue: number; templates: number };

export function bodyStats(doc: PMNode): BodyStats {
  const stats: BodyStats = { paragraphs: 0, dialogue: 0, templates: 0 };
  doc.descendants((node) => {
    if (node.type.name === 'storyBlock') {
      stats.templates += 1;
      return false;
    }
    if (!node.isTextblock) return true;
    const text = node.textContent.trim();
    if (text) {
      stats.paragraphs += 1;
      if (DIALOGUE_START.test(text)) stats.dialogue += 1;
    }
    return false;
  });
  return stats;
}

/** '대사 8 (33%)'의 비율: 문단이 없으면 0 */
export function dialogueShare(stats: BodyStats): number {
  return stats.paragraphs > 0 ? Math.round((stats.dialogue / stats.paragraphs) * 100) : 0;
}

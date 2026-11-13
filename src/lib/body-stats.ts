import type { Node as PMNode } from '@tiptap/pm/model';

// 회차 에디터 '본문 통계': 글자수 옆에 문단 · 대사 · 템플릿 수.
// - 문단: 글이 든 문단 (빈 문단은 간격이라 안 셈, 인용 안의 문단도 셈)
// - 대사: 따옴표(" “ ' ‘ 「 『)로 시작하는 문단
// - 템플릿: 본문에 넣은 템플릿 블록 (안의 글은 문단·대사로 세지 않음)

export const DIALOGUE_START = /^["“”'‘’「『]/;

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

// ─── 글자수 ──────────────────────────────────────
// 본문 글자수와 '고른 글 글자수'는 같은 셈: 문서의 글만 (문단 사이 줄바꿈 · 템플릿 안의 글은 안 셈), 글자 단위(이모지·한글도 한 글자)

export type CharCounts = { all: number; noSpace: number };

/** 공백 포함 · 공백 제외 글자수 */
export function charCounts(text: string): CharCounts {
  return { all: [...text].length, noSpace: [...text.replace(/\s/g, '')].length };
}

/** 고른 범위(from~to)의 글자수. 고른 게 없거나 고른 곳에 글이 없으면(템플릿만 고른 경우 등) null */
export function rangeCharCounts(doc: PMNode, from: number, to: number): CharCounts | null {
  if (from >= to) return null;
  const counts = charCounts(doc.textBetween(from, to));
  return counts.all > 0 ? counts : null;
}

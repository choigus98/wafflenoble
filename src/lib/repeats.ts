import type { Node as PMNode } from '@tiptap/pm/model';

// 회차 에디터 '반복되는 말 찾기': 본문에서 자주 나온 낱말(어절)을 센다. 조사는 떼고 같은 말로 묶는다 ('그녀는'·'그녀가' → '그녀').
// - 조사는 앞 글자의 받침에 맞을 때만 뗀다 ('사이'의 '이', '마을'의 '을'은 조사가 아니라서 안 뗌), 떼고 남는 말이 두 글자 이상일 때만
// - '하지만'·'그대로'처럼 조사로 끝나는 것처럼 보이는 낱말은 그대로 센다
// - 한 글자 낱말과 숫자는 세지 않는다. 템플릿 안의 글은 빠진다 (글이 속성에 들어 있어서)
// 에디터(DOM) 없이 문서만 보고 계산해서 테스트할 수 있다.

type After = 'any' | 'batchim' | 'vowel' | 'vowelOrRieul';

/** 긴 것부터 (에서는 → 에서 → 에) */
const PARTICLES: Array<[string, After]> = [
  ['에서는', 'any'],
  ['에게서', 'any'],
  ['으로는', 'batchim'],
  ['에서', 'any'],
  ['에게', 'any'],
  ['한테', 'any'],
  ['께서', 'any'],
  ['으로', 'batchim'],
  ['부터', 'any'],
  ['까지', 'any'],
  ['처럼', 'any'],
  ['마저', 'any'],
  ['조차', 'any'],
  ['하고', 'any'],
  ['은', 'batchim'],
  ['는', 'vowel'],
  ['이', 'batchim'],
  ['가', 'vowel'],
  ['을', 'batchim'],
  ['를', 'vowel'],
  ['과', 'batchim'],
  ['와', 'vowel'],
  ['로', 'vowelOrRieul'],
  ['의', 'any'],
  ['에', 'any'],
  ['도', 'any'],
  ['만', 'any'],
];

/** 조사로 끝나는 것처럼 보여도 한 낱말인 것 */
const KEEP = new Set([
  '하지만',
  '그래도',
  '그런데',
  '그래서',
  '그리고',
  '그러면',
  '그러니까',
  '그러나',
  '아니면',
  '어쩌면',
  '그나마',
  '그만큼',
  '이만큼',
  '언제나',
  '누구나',
  '얼마나',
  '그대로',
  '제대로',
  '스스로',
  '저절로',
  '함부로',
  '억지로',
  '실제로',
  '정말로',
  '진짜로',
  '마음대로',
  '멋대로',
  '아무도',
  '하나도',
  '조금도',
]);

/** 마지막 글자의 받침 번호 (0이면 받침 없음, 8이면 ㄹ). 한글이 아니면 null */
function finalConsonant(syllable: string): number | null {
  const code = syllable.charCodeAt(0) - 0xac00;
  return code >= 0 && code < 11172 ? code % 28 : null;
}

/** 낱말에서 조사를 뗀 말 (뗄 조사가 없거나 떼면 한 글자만 남으면 그대로) */
export function stemOf(word: string): string {
  if (KEEP.has(word)) return word;
  const chars = Array.from(word);
  // 긴 조사를 못 떼면 그 끝부분인 짧은 조사도 안 뗀다 ('집으로'에서 '으로'를 못 떼면 '로'만 떼어 '집으'가 되지 않게)
  const rejected: string[] = [];
  for (const [particle, after] of PARTICLES) {
    if (!word.endsWith(particle) || rejected.some((longer) => longer.endsWith(particle))) continue;
    const stem = chars.slice(0, chars.length - Array.from(particle).length);
    const final = stem.length >= 2 ? finalConsonant(stem[stem.length - 1]) : null;
    const fits =
      final !== null &&
      (after === 'any' ||
        (after === 'batchim' && final !== 0) ||
        (after === 'vowel' && final === 0) ||
        (after === 'vowelOrRieul' && (final === 0 || final === 8)));
    if (fits) return stem.join('');
    rejected.push(particle);
  }
  return word;
}

/** 앞뒤 따옴표·문장 부호를 떼고 낱말만 */
const TRIM = /^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu;
const NUMBER = /^[\p{N},.]+$/u;

export type RepeatedWord = { word: string; count: number; forms: Array<{ form: string; count: number }> };

/** 글 덩어리들에서 자주 나온 말: 세 번 이상 나온 것을 많은 차례로(같으면 먼저 나온 차례로), 상위 limit개 */
export function repeatedWordsInTexts(texts: string[], limit = 15, min = 3): RepeatedWord[] {
  const counts = new Map<string, { count: number; first: number; forms: Map<string, number> }>();
  let order = 0;
  for (const text of texts) {
    for (const raw of text.split(/\s+/)) {
      const word = raw.replace(TRIM, '');
      if (Array.from(word).length < 2 || NUMBER.test(word)) continue;
      const stem = stemOf(word);
      const entry = counts.get(stem) ?? { count: 0, first: order, forms: new Map<string, number>() };
      entry.count += 1;
      entry.forms.set(word, (entry.forms.get(word) ?? 0) + 1);
      counts.set(stem, entry);
      order += 1;
    }
  }
  return [...counts.entries()]
    .filter(([, entry]) => entry.count >= min)
    .sort(([, a], [, b]) => b.count - a.count || a.first - b.first)
    .slice(0, limit)
    .map(([word, entry]) => ({
      word,
      count: entry.count,
      forms: [...entry.forms.entries()].sort((a, b) => b[1] - a[1]).map(([form, count]) => ({ form, count })),
    }));
}

/** 문서의 본문 문단(인용 안 문단 포함)에서 자주 나온 말 */
export function repeatedWords(doc: PMNode, limit = 15, min = 3): RepeatedWord[] {
  const texts: string[] = [];
  doc.descendants((node) => {
    if (!node.isTextblock) return true;
    // 줄바꿈(hardBreak)은 글자가 없어서 앞뒤 낱말이 붙지 않게 띄어 준다
    texts.push(node.textBetween(0, node.content.size, ' ', ' '));
    return false;
  });
  return repeatedWordsInTexts(texts, limit, min);
}

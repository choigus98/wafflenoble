import type { Node as PMNode } from '@tiptap/pm/model';

// 회차 에디터 '자주 틀리는 말 찾기': 틀림이 확실한 말만 찾는다 (됬 → 됐, 몇일 → 며칠, 할께 → 할게 …).
// - 뜻에 따라 맞을 수도 있는 말(로서/로써, 던지/든지, 바램 …)은 넣지 않는다
// - 맞는 말을 잘못 잡지 않게 자리를 본다: '연구지원'의 '구지'(낱말 중간), '월말께'·'아들께'·'하늘께'(때·높임의 '께'), '껄껄' 웃음
// - 템플릿 블록은 글이 속성(data)에 들어 있어서 저절로 빠진다
// 에디터(DOM) 없이 문서만 보고 계산해서 테스트할 수 있다.

type Rule = { pattern: RegExp; fix: (match: RegExpExecArray) => string | null; why: string };

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** 그대로 바꾸는 규칙. wordStart면 낱말 첫머리에서만 (앞 글자가 한글이 아닐 때) */
const word = (wrong: string, right: string, why: string, wordStart = false): Rule => ({
  pattern: new RegExp(`${wordStart ? '(?<![가-힣])' : ''}${escape(wrong)}`, 'g'),
  fix: () => right,
  why,
});

/** 받침이 ㄹ인 글자 ('할', '갈', '을') */
function hasRieul(syllable: string): boolean {
  const code = syllable.charCodeAt(0) - 0xac00;
  return code >= 0 && code < 11172 && code % 28 === 8;
}

const RULES: Rule[] = [
  word('됬', '됐', "'되었'을 줄이면 '됐'"),
  word('되요', '돼요', "'되어요'를 줄이면 '돼요'"),
  word('되서', '돼서', "'되어서'를 줄이면 '돼서'"),
  word('뵈요', '봬요', "'뵈어요'를 줄이면 '봬요'"),
  word('뵜', '뵀', "'뵈었'을 줄이면 '뵀'"),
  word('몇일', '며칠', "날수는 '며칠'"),
  word('어떻해', '어떡해', "'어떻게 해'를 줄이면 '어떡해'"),
  word('어떡게', '어떻게', "방법을 물을 때는 '어떻게'"),
  word('웬지', '왠지', "'왜인지'를 줄인 말이라 '왠지'"),
  word('왠일', '웬일', "'어찌 된'의 뜻은 '웬'"),
  word('왠만', '웬만', "'웬만하다'"),
  word('금새', '금세', "'금시에'를 줄인 말이라 '금세'", true),
  word('구지', '굳이', "'굳이'", true),
  word('할려', '하려', "'하다'에 '-려고'가 붙으면 '하려고'"),
  word('역활', '역할', "'역할'"),
  word('희안하', '희한하', "'희한하다'"),
  word('설겆이', '설거지', "'설거지'"),
  word('어의없', '어이없', "'어이없다'"),
  word('오랫만', '오랜만', "'오래간만'을 줄인 말이라 '오랜만'"),
  word('오랜동안', '오랫동안', "'오랫동안'"),
  word('통채로', '통째로', "'통째로'"),
  word('무릎쓰', '무릅쓰', "어려움을 견딜 때는 '무릅쓰다'"),
  word('넓직', '널찍', "'널찍하다'"),
  word('짜집기', '짜깁기', "'짜깁기'"),
  word('서슴치', '서슴지', "'서슴다'라서 '서슴지'"),
  word('일찌기', '일찍이', "'일찍이'"),
  word('어줍잖', '어쭙잖', "'어쭙잖다'"),
  word('귀뜸', '귀띔', "'귀띔'"),
  word('도데체', '도대체', "'도대체'"),
  word('씁슬', '씁쓸', "'씁쓸하다'"),
  word('괜시리', '괜스레', "'괜스레'"),
  word('눈쌀', '눈살', "'눈살'"),
  word('닥달', '닦달', "'닦달'"),
  word('되뇌였', '되뇌었', "'되뇌다'라서 '되뇌었다'"),
  word('되뇌이', '되뇌', "'되뇌다'"),
  word('뒤치닥거리', '뒤치다꺼리', "'뒤치다꺼리'"),
  word('있슴', '있음', "'-음'으로 적는다"),
  word('없슴', '없음', "'-음'으로 적는다"),
  word('읍니다', '습니다', "'-습니다'로 적는다"),
  word('깨끗히', '깨끗이', "'-이'로 끝나는 말"),
  word('틈틈히', '틈틈이', "'-이'로 끝나는 말"),
  word('곰곰히', '곰곰이', "'-이'로 끝나는 말"),
  word('일일히', '일일이', "'-이'로 끝나는 말"),
  word('번번히', '번번이', "'-이'로 끝나는 말"),
  word('따뜻히', '따뜻이', "'-이'로 끝나는 말"),
  word('느긋히', '느긋이', "'-이'로 끝나는 말"),
  word('꼼꼼이', '꼼꼼히', "'-히'로 끝나는 말"),
  word('솔직이', '솔직히', "'-히'로 끝나는 말"),
  // '할께'·'갈께요' → '할게'·'갈게요'. 높임·때의 '께'(아들께, 하늘께, 월말께, 딸께)는 빼고
  {
    pattern: /([가-힣])께(?=요|[^가-힣]|$)/g,
    fix: (match) => (hasRieul(match[1]) && !'들늘말딸'.includes(match[1]) ? `${match[1]}게` : null),
    why: "'-ㄹ게'는 '께'가 아니라 '게'",
  },
  // '그럴껄' → '그럴걸'. '껄껄' 웃음은 빼고
  {
    pattern: /([가-힣])껄(?=요|[^가-힣]|$)/g,
    fix: (match) => (hasRieul(match[1]) && !'들말껄'.includes(match[1]) ? `${match[1]}걸` : null),
    why: "'-ㄹ걸'은 '껄'이 아니라 '걸'",
  },
];

export type SpellingIssue = { index: number; length: number; wrong: string; right: string; why: string };

/** 글 한 덩어리에서 틀린 곳 (앞에서부터, 겹치지 않게) */
export function spellingIssuesInText(text: string): SpellingIssue[] {
  const found: SpellingIssue[] = [];
  for (const rule of RULES) {
    for (const match of text.matchAll(rule.pattern)) {
      const right = rule.fix(match);
      if (right === null) continue;
      found.push({ index: match.index, length: match[0].length, wrong: match[0], right, why: rule.why });
    }
  }
  found.sort((a, b) => a.index - b.index);
  const issues: SpellingIssue[] = [];
  for (const issue of found) {
    const last = issues.at(-1);
    if (!last || issue.index >= last.index + last.length) issues.push(issue);
  }
  return issues;
}

/** 마지막 글자의 받침 번호 (0이면 받침 없음, 8이면 ㄹ). 한글로 안 끝나면 null */
function finalConsonant(word: string): number | null {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  return code >= 0 && code < 11172 ? code % 28 : null;
}

/** 알림 글의 조사: '몇일'을 · '구지'를 */
export function objectParticle(word: string): string {
  const final = finalConsonant(word);
  return final === null ? '을(를)' : final === 0 ? '를' : '을';
}

/** 알림 글의 조사: '며칠'로 · '웬만하면'으로 · '굳이'로 */
export function toParticle(word: string): string {
  const final = finalConsonant(word);
  return final === null ? '(으)로' : final === 0 || final === 8 ? '로' : '으로';
}

/** 줄바꿈 같은 글자 아닌 칸 (lib/find.ts와 같은 자리표) */
const PLACEHOLDER = '￼';
const EDGE = /[\s￼]/;
/** 앞뒤 따옴표·문장 부호는 보여 줄 낱말에서 뺀다 */
const TRIM = /^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu;

export type SpellingMatch = { from: number; to: number; wrong: string; right: string; why: string; word: string; fixedWord: string };

/** 문서에서 틀린 곳 (문단마다, 문서 앞에서부터). word·fixedWord는 목록에 보여 줄 낱말 하나 (고치기 전·후) */
export function spellingMatches(doc: PMNode): SpellingMatch[] {
  const matches: SpellingMatch[] = [];
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;
    let text = '';
    node.forEach((child) => {
      text += child.isText ? (child.text ?? '') : PLACEHOLDER.repeat(child.nodeSize);
    });
    const start = pos + 1;
    for (const issue of spellingIssuesInText(text)) {
      let left = issue.index;
      while (left > 0 && !EDGE.test(text[left - 1]) && issue.index - left < 15) left -= 1;
      let right = issue.index + issue.length;
      while (right < text.length && !EDGE.test(text[right]) && right - issue.index < 20) right += 1;
      const before = text.slice(left, issue.index);
      const after = text.slice(issue.index + issue.length, right);
      matches.push({
        from: start + issue.index,
        to: start + issue.index + issue.length,
        wrong: issue.wrong,
        right: issue.right,
        why: issue.why,
        word: `${before}${issue.wrong}${after}`.replace(TRIM, '') || issue.wrong,
        fixedWord: `${before}${issue.right}${after}`.replace(TRIM, '') || issue.right,
      });
    }
    return false;
  });
  return matches;
}

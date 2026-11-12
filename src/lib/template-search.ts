// '＋ 템플릿' 메뉴 찾기 칸: 템플릿 이름·설명으로 거른다.
// - 띄어쓰기와 영문 대소문자는 가리지 않는다 ('카톡단체' → 카톡 단체방, 'sns' → SNS 게시물)
// - 초성으로도 찾는다 ('ㅇㅅㅈ' → 영수증, '영ㅅ'처럼 섞어도 됨)
// - 한글을 치는 중간에도 이어서 맞춘다: 마지막 글자가 받침 없이('영수즈') 또는 다음 글자 첫소리가 받침으로 붙어('영숮') 있어도
// - 이름에 맞는 것을 먼저, 설명에만 맞는 것은 뒤에 (각각은 메뉴 순서 그대로)

const INITIALS = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
// 받침 순서 (0은 받침 없음). 겹받침은 첫소리로 옮겨 가지 않는 것으로 본다
const FINALS = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
const FIRST_SYLLABLE = 0xac00;
const LAST_SYLLABLE = 0xd7a3;

type Syllable = { initial: number; medial: number; final: number };

function syllable(char: string | undefined): Syllable | null {
  if (!char) return null;
  const code = char.charCodeAt(0);
  if (code < FIRST_SYLLABLE || code > LAST_SYLLABLE) return null;
  const offset = code - FIRST_SYLLABLE;
  return { initial: Math.floor(offset / 588), medial: Math.floor((offset % 588) / 28), final: offset % 28 };
}

/** 찾는 글자 하나가 본문 글자에 맞는지. last: 찾는 말의 마지막 글자(아직 치는 중일 수 있음), next: 본문의 다음 글자 */
function charMatches(query: string, text: string, next: string | undefined, last: boolean): boolean {
  if (query === text) return true;
  const target = syllable(text);
  if (!target) return false;
  const initial = INITIALS.indexOf(query);
  if (initial !== -1) return target.initial === initial; // 초성
  if (!last) return false;
  const typed = syllable(query);
  if (!typed || typed.initial !== target.initial || typed.medial !== target.medial) return false;
  // '즈' → '증' (받침을 아직 안 침)
  if (typed.final === 0) return true;
  // '숮' → '수' + 다음 글자 'ㅈ…' (받침으로 붙은 자음이 다음 글자 첫소리가 될 참)
  const moved = INITIALS.indexOf(FINALS[typed.final]);
  return target.final === 0 && moved !== -1 && syllable(next)?.initial === moved;
}

function normalize(text: string): string[] {
  return [...text.toLowerCase().replace(/\s+/g, '')];
}

function contains(text: string, query: string): boolean {
  const haystack = normalize(text);
  const needle = normalize(query);
  if (needle.length === 0) return true;
  for (let start = 0; start + needle.length <= haystack.length; start += 1) {
    let ok = true;
    for (let i = 0; i < needle.length && ok; i += 1) {
      ok = charMatches(needle[i], haystack[start + i], haystack[start + i + 1], i === needle.length - 1);
    }
    if (ok) return true;
  }
  return false;
}

export function matchTemplates<T extends { label: string; hint: string }>(templates: readonly T[], query: string): T[] {
  if (normalize(query).length === 0) return [...templates];
  const byLabel: T[] = [];
  const byHint: T[] = [];
  for (const template of templates) {
    if (contains(template.label, query)) byLabel.push(template);
    else if (contains(template.hint, query)) byHint.push(template);
  }
  return [...byLabel, ...byHint];
}

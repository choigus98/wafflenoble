// 회차 에디터 '자주 틀리는 말'의 '그대로 두기': 일부러 쓴 말(사투리·말투 '할께요' 등)을 이 기기에서 점검에서 뺀다.
// 낱말 모양 그대로(앞뒤 문장 부호는 뺀 것) 기억해서, 같은 모양만 빠진다 ('할께요'를 두어도 '할께'는 다시 잡힘).
// 회차마다가 아니라 이 기기에 하나 (인물 말투는 여러 회차에 걸쳐 나오니까)

export const SPELLING_KEEP_KEY = 'wn:spelling-keep';
const MAX_WORDS = 200;
const MAX_LENGTH = 40;

/** 저장해 둔 글 읽기 (글자가 아닌 것·너무 긴 것·같은 것은 버림) */
export function parseSpellingKeep(raw: string | null): string[] {
  if (!raw) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  const list: string[] = [];
  for (const item of data) {
    if (typeof item !== 'string') continue;
    const word = item.trim();
    if (!word || word.length > MAX_LENGTH || list.includes(word)) continue;
    list.push(word);
    if (list.length >= MAX_WORDS) break;
  }
  return list;
}

/** 그대로 둘 말 더하기 (이미 있으면 그대로, 가장 오래된 것부터 넘치면 뺌) */
export function addSpellingKeep(list: string[], word: string): string[] {
  const value = word.trim();
  if (!value || value.length > MAX_LENGTH || list.includes(value)) return list;
  return [...list, value].slice(-MAX_WORDS);
}

export function removeSpellingKeep(list: string[], word: string): string[] {
  return list.filter((item) => item !== word);
}

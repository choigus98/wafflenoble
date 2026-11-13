// 회차 에디터 '상용구': 자주 쓰는 말(인물 이름 · 말버릇 · 장면 문구)을 이 기기에 저장해 두고 도구 막대 메뉴(⌘;)에서 넣는다.
// - 한 줄에 하나, 30개까지, 하나에 200자까지. 줄 안의 줄바꿈 · 겹친 빈칸은 빈칸 하나로, 같은 말은 한 번만
// - 적은 순서 그대로 (메뉴에서 앞의 아홉 개는 숫자 키로 바로 넣으므로 순서가 바뀌지 않게)
// 저장 모양: ["하연화", "자정의 와플 가게", …]. 에디터(DOM) 없이 계산만 해서 테스트할 수 있다

export const SNIPPETS_KEY = 'wn:snippets';
export const MAX_SNIPPETS = 30;
export const MAX_SNIPPET_LENGTH = 200;

/** 상용구로 정리: 빈칸 정리 · 빈 것과 같은 말 빼기 · 200자에서 자르기 · 30개까지 */
export function cleanSnippets(values: readonly unknown[]): string[] {
  const list: string[] = [];
  for (const value of values) {
    if (typeof value !== 'string') continue;
    const text = [...value.replace(/\s+/g, ' ').trim()].slice(0, MAX_SNIPPET_LENGTH).join('').trim();
    if (!text || list.includes(text)) continue;
    list.push(text);
    if (list.length >= MAX_SNIPPETS) break;
  }
  return list;
}

/** 저장해 둔 글 읽기 (모양이 틀리면 빈 목록) */
export function parseSnippets(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const data: unknown = JSON.parse(raw);
    return Array.isArray(data) ? cleanSnippets(data) : [];
  } catch {
    return [];
  }
}

/** '상용구 고치기' 칸의 글(한 줄에 하나) ↔ 목록 */
export function snippetsFromText(text: string): string[] {
  return cleanSnippets(text.split(/\r?\n/));
}

export function snippetsToText(list: readonly string[]): string {
  return list.join('\n');
}

export type AddSnippetResult = { list: string[]; added: true; text: string } | { list: string[]; added: false; reason: 'empty' | 'duplicate' | 'full' };

/** 고른 글을 상용구 맨 뒤에 (빈 글 · 이미 있는 말 · 30개가 찼으면 그대로) */
export function addSnippet(list: readonly string[], value: string): AddSnippetResult {
  const [text] = cleanSnippets([value]);
  if (!text) return { list: [...list], added: false, reason: 'empty' };
  if (list.includes(text)) return { list: [...list], added: false, reason: 'duplicate' };
  if (list.length >= MAX_SNIPPETS) return { list: [...list], added: false, reason: 'full' };
  return { list: [...list, text], added: true, text };
}

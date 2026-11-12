// 작품 '등장인물' 칸: 한 줄에 한 명씩 '이름: 소개'. 이름만 적어도 된다.
//   지은: 골목 끝 와플 가게의 단골
//   주인 할머니: 자정에만 문을 여는 가게 주인. 좋아하는 것: 버터 냄새   ← 첫 쌍점에서만 나눈다
//   수진                                                                 ← 이름만
// 줄 앞에 붙인 '-', '·', '•', '*' 같은 목록 기호는 떼고 읽는다.

export const CHARACTERS_MAX_LENGTH = 3000;

export type Character = { name: string; description: string };

const BULLET = /^(?:[-*·•▪◦]|\d+[.)])\s+/;
const COLON = /[:：]/;

export function parseCharacters(text: string): Character[] {
  const list: Character[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim().replace(BULLET, '').trim();
    if (!line) continue;
    const colon = line.search(COLON);
    if (colon === -1) {
      list.push({ name: line, description: '' });
      continue;
    }
    const name = line.slice(0, colon).trim();
    const description = line.slice(colon + 1).trim();
    // ': 소개'처럼 이름이 비면 쌍점 뒤 글을 이름으로
    if (!name) {
      if (description) list.push({ name: description, description: '' });
      continue;
    }
    list.push({ name, description });
  }
  return list;
}

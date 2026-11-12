// 작품 목차 '회차 찾기': 번호('12', '12화')나 제목 일부로 거른다.
// 띄어 쓴 낱말은 모두 들어 있어야 한다 ('자정 손님' → '자정의 손님'). 영문은 대소문자를 가리지 않는다.

/** 회차가 이만큼 이상일 때만 찾기 칸을 보여 준다 (10화 넘을 때) */
export const TOC_FILTER_MIN = 11;

export type TocFilterItem = { position: number; title: string };

export function filterToc<T extends TocFilterItem>(items: T[], query: string): T[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return items;
  // 낱말 하나가 '12'·'12화'면 그 번호 회차
  const number = terms.length === 1 ? terms[0].match(/^(\d+)화?$/) : null;
  return items.filter((item) => {
    if (number && item.position === Number(number[1])) return true;
    const title = (item.title || `${item.position}화`).toLowerCase();
    return terms.every((term) => title.includes(term));
  });
}

// 작품 목차 정렬 (1화부터 / 최신 화부터). 이 기기에 쿠키로 기억해서 서버가 처음부터 그 순서로 그린다
// (그리고 나서 뒤집으면 순서가 한 번 바뀌어 보이고, 화면 낭독기가 읽는 순서와 보이는 순서가 달라진다)

export const TOC_ORDER_COOKIE = 'wn_toc';
export type TocOrder = 'asc' | 'desc';

export function parseTocOrder(value: string | undefined): TocOrder {
  return value === 'desc' ? 'desc' : 'asc';
}

/** 목록은 늘 1화부터 오고, 최신 화부터면 뒤집는다 (원래 배열은 건드리지 않음) */
export function orderChapters<T>(list: readonly T[], order: TocOrder): T[] {
  return order === 'desc' ? [...list].reverse() : [...list];
}

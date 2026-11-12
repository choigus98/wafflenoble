// 회차 복제할 때 새 회차 제목: '원래 제목 (복사본)', 제목이 비었으면 'N화 (복사본)'. 100자를 넘지 않게 (글자 단위로 자름)

export const TITLE_MAX = 100;
const SUFFIX = ' (복사본)';

export function copyTitle(title: string, position: number): string {
  const base = title.trim() || `${position}화`;
  const room = TITLE_MAX - [...SUFFIX].length;
  return [...base].slice(0, room).join('') + SUFFIX;
}

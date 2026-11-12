// 관리자 회차 목록의 '위/아래로 옮기기' 계산. DB 없이 테스트할 수 있게 순수 함수로 둔다.

export const MAX_POSITION = 9999;

export type ChapterSlot = { id: number; position: number };

/**
 * list: 한 작품의 회차를 (번호, id) 순서로 정렬한 것.
 * - 바로 옆 회차와 번호가 다르면 두 번호를 맞바꾼다 (다른 회차 번호와 빈 번호는 그대로)
 * - 번호가 같으면 맞바꿔도 순서가 안 바뀌므로, 겹친 곳만 앞 번호 + 1로 밀어서 순서를 만든다
 * 바꿀 회차와 새 번호, 옮긴 회차의 새 번호를 돌려준다. 더 옮길 곳이 없으면 null
 */
export function planChapterMove(
  list: ChapterSlot[],
  chapterId: number,
  direction: 'up' | 'down',
): { updates: ChapterSlot[]; position: number } | null {
  const index = list.findIndex((chapter) => chapter.id === chapterId);
  const other = direction === 'up' ? index - 1 : index + 1;
  if (index < 0 || other < 0 || other >= list.length) return null;

  const current = list[index];
  const neighbor = list[other];
  if (current.position !== neighbor.position) {
    return {
      updates: [
        { id: current.id, position: neighbor.position },
        { id: neighbor.id, position: current.position },
      ],
      position: neighbor.position,
    };
  }

  const order = [...list];
  [order[index], order[other]] = [order[other], order[index]];
  const updates: ChapterSlot[] = [];
  let previous = Number.NEGATIVE_INFINITY;
  let position = current.position;
  for (const slot of order) {
    const next = Math.min(Math.max(previous + 1, slot.position), MAX_POSITION);
    previous = next;
    if (next !== slot.position) updates.push({ id: slot.id, position: next });
    if (slot.id === chapterId) position = next;
  }
  return { updates, position };
}

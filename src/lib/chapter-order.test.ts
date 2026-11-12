import { describe, expect, it } from 'vitest';
import { planChapterMove, type ChapterSlot } from '@/lib/chapter-order';

const slots = (...positions: number[]): ChapterSlot[] => positions.map((position, index) => ({ id: index + 1, position }));

describe('회차 위/아래로 옮기기', () => {
  it('바로 옆 회차와 번호를 맞바꾼다', () => {
    expect(planChapterMove(slots(1, 2, 3), 3, 'up')).toEqual({
      updates: [
        { id: 3, position: 2 },
        { id: 2, position: 3 },
      ],
      position: 2,
    });
    expect(planChapterMove(slots(1, 2, 3), 1, 'down')?.position).toBe(2);
  });

  it('빈 번호가 있어도 두 번호만 맞바꾸고 나머지는 그대로', () => {
    expect(planChapterMove(slots(1, 5, 9), 3, 'up')).toEqual({
      updates: [
        { id: 3, position: 5 },
        { id: 2, position: 9 },
      ],
      position: 5,
    });
  });

  it('맨 위에서 위로, 맨 아래에서 아래로, 없는 회차는 아무것도 안 한다', () => {
    expect(planChapterMove(slots(1, 2), 1, 'up')).toBeNull();
    expect(planChapterMove(slots(1, 2), 2, 'down')).toBeNull();
    expect(planChapterMove(slots(1, 2), 99, 'up')).toBeNull();
  });

  it('번호가 겹친 회차는 겹친 곳만 밀어서 순서를 만든다 (뒤쪽 빈 번호는 유지)', () => {
    // 1화, 2화, 2화(id 3), 5화 → id 3을 위로
    expect(planChapterMove(slots(1, 2, 2, 5), 3, 'up')).toEqual({ updates: [{ id: 2, position: 3 }], position: 2 });
    // 같은 상황에서 id 2를 아래로 옮겨도 결과가 같다
    expect(planChapterMove(slots(1, 2, 2, 5), 2, 'down')).toEqual({ updates: [{ id: 2, position: 3 }], position: 3 });
    // 뒤 번호와 맞닿아 있으면 뒤도 한 칸씩 밀린다: 1, 1, 2 → id 2를 위로
    expect(planChapterMove(slots(1, 1, 2), 2, 'up')).toEqual({
      updates: [
        { id: 1, position: 2 },
        { id: 3, position: 3 },
      ],
      position: 1,
    });
  });
});

import { describe, expect, it } from 'vitest';
import { guildProgress, progressLabel, progressPercent, type ChapterView, type VisibleChapter } from '@/lib/guild-progress';

// 작품 1: 1화(id 1) · 3화(id 3) · 4화(id 7) · 4화(id 8, 같은 번호면 id 순) / 작품 2: 1화(id 20) · 2화(id 21)
const chapters: VisibleChapter[] = [
  { id: 8, novelId: 1, position: 4 },
  { id: 1, novelId: 1, position: 1 },
  { id: 7, novelId: 1, position: 4 },
  { id: 3, novelId: 1, position: 3 },
  { id: 20, novelId: 2, position: 1 },
  { id: 21, novelId: 2, position: 2 },
];
const at = (minute: number) => new Date(Date.UTC(2026, 10, 13, 0, minute));
const view = (readerId: string, chapterId: number, minute: number): ChapterView => ({ readerId, chapterId, at: at(minute) });

describe('길드원 읽기 진행', () => {
  it('작품마다 가장 뒤에 읽은 공개 회차 · 몇 번째 · 건너뛴 수, 최근에 연 작품부터', () => {
    const progress = guildProgress(chapters, [
      view('a', 1, 1),
      view('a', 7, 5), // 3화를 건너뛰고 첫 번째 4화
      view('a', 20, 3),
      view('b', 8, 2), // 두 번째 4화만 → 마지막까지 왔지만 앞의 셋을 건너뜀
      view('c', 99, 9), // 지금은 안 보이는 회차는 뺌
    ]);
    expect(progress.get('a')).toEqual([
      { novelId: 1, position: 4, reached: 3, total: 4, skipped: 1, at: at(5) },
      { novelId: 2, position: 1, reached: 1, total: 2, skipped: 0, at: at(3) },
    ]);
    expect(progress.get('b')).toEqual([{ novelId: 1, position: 4, reached: 4, total: 4, skipped: 3, at: at(2) }]);
    expect(progress.has('c')).toBe(false);
  });

  it('글로: 최신 화까지면 \'최신 화\', 아니면 남은 회차 수, 건너뛴 게 있으면 덧붙임 · 막대 몫', () => {
    const base = { novelId: 1, position: 3, at: at(0) };
    expect(progressLabel({ ...base, reached: 3, total: 3, skipped: 0 })).toBe('3화까지 · 최신 화');
    expect(progressLabel({ ...base, reached: 1, total: 3, skipped: 0, position: 1 })).toBe('1화까지 · 남은 회차 2');
    expect(progressLabel({ ...base, reached: 3, total: 4, skipped: 1 })).toBe('3화까지 · 남은 회차 1 · 건너뛴 회차 1');
    expect(progressPercent({ ...base, reached: 1, total: 3, skipped: 0 })).toBe(33);
    expect(progressPercent({ ...base, reached: 0, total: 0, skipped: 0 })).toBe(0);
  });
});

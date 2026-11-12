// 관리자 '길드원' 화면 '읽기 진행': 길드원마다, 작품마다 공개된 회차 중 어디까지 읽었는지.
// - 공개된 회차(발행 + 공개 시각이 지남)만 센다. 순서는 회차 번호, 같으면 먼저 만든 것(id) 순 — 열람 화면 목차와 같다
// - '어디까지' = 읽은 회차 중 가장 뒤의 것. 막대는 그 회차까지의 몫 (그 회차가 몇 번째인지 / 공개 회차 수)
// - 그 앞에서 안 읽고 건너뛴 회차 수도 센다 (중간부터 읽었거나 하나 빼먹은 경우)
// - 지금은 안 보이는 회차(임시저장으로 돌렸거나 지운 것)를 읽은 기록은 뺀다
// DB 없이 계산만 해서 테스트할 수 있다

export type VisibleChapter = { id: number; novelId: number; position: number };
export type ChapterView = { readerId: string; chapterId: number; at: Date };
export type NovelProgress = {
  novelId: number;
  position: number; // 가장 뒤에 읽은 회차 번호
  reached: number; // 그 회차가 공개 회차 중 몇 번째인지 (1부터)
  total: number; // 공개 회차 수
  skipped: number; // 그 앞에서 안 읽은 회차 수
  at: Date; // 이 작품에서 마지막으로 연 때
};

/** 길드원 id → 작품별 진행 (이 작품을 마지막으로 연 때가 최근인 순) */
export function guildProgress(chapters: VisibleChapter[], views: ChapterView[]): Map<string, NovelProgress[]> {
  const place = new Map<number, { novelId: number; index: number; position: number }>();
  const totals = new Map<number, number>();
  for (const chapter of [...chapters].sort((a, b) => a.novelId - b.novelId || a.position - b.position || a.id - b.id)) {
    const index = totals.get(chapter.novelId) ?? 0;
    place.set(chapter.id, { novelId: chapter.novelId, index, position: chapter.position });
    totals.set(chapter.novelId, index + 1);
  }

  type Tally = { furthest: number; position: number; read: Set<number>; at: Date };
  const byReader = new Map<string, Map<number, Tally>>();
  for (const view of views) {
    const where = place.get(view.chapterId);
    if (!where) continue;
    let novels = byReader.get(view.readerId);
    if (!novels) byReader.set(view.readerId, (novels = new Map()));
    const tally = novels.get(where.novelId);
    if (!tally) {
      novels.set(where.novelId, { furthest: where.index, position: where.position, read: new Set([view.chapterId]), at: view.at });
      continue;
    }
    tally.read.add(view.chapterId);
    if (where.index > tally.furthest) {
      tally.furthest = where.index;
      tally.position = where.position;
    }
    if (view.at > tally.at) tally.at = view.at;
  }

  const result = new Map<string, NovelProgress[]>();
  for (const [readerId, novels] of byReader) {
    const list = [...novels].map(([novelId, tally]) => ({
      novelId,
      position: tally.position,
      reached: tally.furthest + 1,
      total: totals.get(novelId) ?? 0,
      skipped: tally.furthest + 1 - tally.read.size,
      at: tally.at,
    }));
    result.set(readerId, list.sort((a, b) => b.at.getTime() - a.at.getTime()));
  }
  return result;
}

/** '3화까지 · 최신 화' / '1화까지 · 남은 회차 2', 건너뛴 게 있으면 ' · 건너뛴 회차 1' ('2화'가 몇 번째 화로 읽히지 않게 개수는 '회차 N') */
export function progressLabel(progress: NovelProgress): string {
  const parts = [`${progress.position}화까지`, progress.reached >= progress.total ? '최신 화' : `남은 회차 ${progress.total - progress.reached}`];
  if (progress.skipped > 0) parts.push(`건너뛴 회차 ${progress.skipped}`);
  return parts.join(' · ');
}

/** 막대 몫 0~100 (공개 회차가 없으면 0) */
export function progressPercent(progress: NovelProgress): number {
  return progress.total > 0 ? Math.round((progress.reached / progress.total) * 100) : 0;
}

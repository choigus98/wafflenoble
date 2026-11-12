// 관리자 홈 '최근 7일 열람': 작품마다 최근 7일 동안 읽은 길드원 수와 가장 많이 읽힌 회차.
// 열람 기록은 (회차, 길드원)마다 '마지막으로 읽은 때' 하나라서, 7일 안에 마지막으로 읽은 사람을 센다
// (예전에 읽고 7일 안에 다시 읽은 사람도 들어감). 가장 많이 읽힌 회차는 읽은 길드원 수로, 같으면 앞 회차.

export type WeekChapter = { chapterId: number; position: number; title: string; readers: number };
export type WeekReads = { readers: number; top: WeekChapter | null };

export function weekReadsByNovel(
  perNovel: Array<{ novelId: number; readers: number }>,
  perChapter: Array<{ novelId: number } & WeekChapter>,
): Map<number, WeekReads> {
  const result = new Map<number, WeekReads>();
  for (const row of perNovel) result.set(row.novelId, { readers: row.readers, top: null });
  for (const { novelId, ...chapter } of perChapter) {
    const entry = result.get(novelId) ?? { readers: 0, top: null };
    const top = entry.top;
    if (!top || chapter.readers > top.readers || (chapter.readers === top.readers && chapter.position < top.position)) entry.top = chapter;
    result.set(novelId, entry);
  }
  return result;
}

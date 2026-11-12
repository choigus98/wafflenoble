import { countChapters, type ChapterFilter } from '@/lib/chapter-filter';
import { readingMinutes } from '@/lib/reading-time';

// 관리자 작품 화면 '작품 통계': 전체 글자수 · 회차 평균 · 발행/예약/임시저장 수 · 가장 긴 회차.
// 글자수는 저장할 때 센 공백 포함 글자수 (템플릿 안의 글은 안 들어감). 임시저장·예약 회차도 더한다 (쓴 분량이라서).

type StatChapter = { id: number; position: number; title: string; charCount: number; status: 'draft' | 'published'; scheduled: boolean };

export type NovelStats = {
  totalChars: number;
  /** 다 읽는 데 걸리는 분 (본문이 없으면 null) */
  minutes: number | null;
  /** 본문이 있는 회차 수 (평균의 기준. 막 만든 빈 회차는 평균을 끌어내리지 않게 뺀다) */
  withText: number;
  /** 본문이 있는 회차의 평균 글자수 (반올림, 없으면 null) */
  average: number | null;
  /** 가장 긴 회차 (같으면 앞 회차, 본문이 있는 회차가 둘 이상일 때만) */
  longest: { id: number; position: number; title: string; charCount: number } | null;
  counts: Record<ChapterFilter, number>;
};

export function novelStats(chapters: StatChapter[]): NovelStats {
  const written = chapters.filter((chapter) => chapter.charCount > 0);
  const totalChars = written.reduce((sum, chapter) => sum + chapter.charCount, 0);
  const longest = written.reduce<StatChapter | null>(
    (best, chapter) =>
      !best || chapter.charCount > best.charCount || (chapter.charCount === best.charCount && chapter.position < best.position) ? chapter : best,
    null,
  );
  return {
    totalChars,
    minutes: readingMinutes(totalChars),
    withText: written.length,
    average: written.length > 0 ? Math.round(totalChars / written.length) : null,
    longest: longest && written.length > 1 ? { id: longest.id, position: longest.position, title: longest.title, charCount: longest.charCount } : null,
    counts: countChapters(chapters),
  };
}

/** '발행 2 · 임시저장 1' (0인 것은 뺌, 회차가 없으면 빈 글) */
export function chapterStateSummary(counts: Record<ChapterFilter, number>): string {
  return (
    [
      ['발행', counts.published],
      ['예약', counts.scheduled],
      ['임시저장', counts.draft],
    ] as const
  )
    .filter(([, value]) => value > 0)
    .map(([label, value]) => `${label} ${value}`)
    .join(' · ');
}

/**
 * 관리자 작품 화면 '회차별 글자수' 막대: 작품에서 가장 긴 회차 대비 몫 0~100 (거르기와 상관없이 작품 전체 기준).
 * 글자가 있는 회차는 너무 짧아도 3은 보이게, 가장 긴 회차가 0자면 0
 */
export function lengthShare(count: number, longest: number): number {
  if (longest <= 0 || count <= 0) return 0;
  return Math.max(3, Math.min(100, Math.round((count / longest) * 100)));
}

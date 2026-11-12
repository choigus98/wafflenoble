import { fileSafeTitle } from '@/lib/chapter-text';
import { formatSheetDateTime } from '@/lib/format';

// 관리자 '회차 목록 표 파일로 내보내기': 회차마다 번호 · 제목 · 상태 · 공개일 · 글자수 · 읽은 사람 · 좋아요를 한 줄씩 CSV로.
// - 엑셀이 한글을 깨뜨리지 않게 맨 앞에 UTF-8 BOM, 줄 끝은 CRLF (RFC 4180)
// - 쉼표 · 따옴표 · 줄바꿈이 든 칸은 따옴표로 감싸고 안의 따옴표는 두 번 ("")
// - = + - @ 로 시작하는 글은 엑셀·시트가 수식으로 읽어 오류(#NAME?)가 나므로 앞에 '를 붙여 글로 둔다 (예: -프롤로그-)
// - 숫자는 쉼표 없이 그대로 (표에서 더하고 정렬할 수 있게), 공개일은 한국 시각 'YYYY-MM-DD HH:mm'
// - 공개일은 발행·예약 회차만 (임시저장은 예전에 발행했던 회차라도 비운다 — 지금 공개된 게 아니라서)

export type ChapterTableRow = {
  position: number;
  title: string;
  status: 'draft' | 'published';
  /** 발행이지만 공개 시각이 아직 안 온 회차 */
  scheduled: boolean;
  publishedAt: Date | null;
  charCount: number;
  readCount: number;
  likeCount: number;
};

export const CHAPTER_TABLE_HEADER = ['번호', '제목', '상태', '공개일', '글자수', '읽은 사람', '좋아요'] as const;

/** 회차 목록의 배지와 같은 말 */
export function chapterStatusLabel(row: Pick<ChapterTableRow, 'status' | 'scheduled'>): string {
  if (row.scheduled) return '예약';
  return row.status === 'published' ? '발행' : '임시저장';
}

/** CSV 한 칸 */
export function csvCell(value: string | number): string {
  if (typeof value === 'number') return String(value);
  const text = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function chapterTableCsv(rows: readonly ChapterTableRow[]): string {
  const lines: ReadonlyArray<ReadonlyArray<string | number>> = [
    CHAPTER_TABLE_HEADER,
    ...rows.map((row) => [
      row.position,
      row.title.trim(),
      chapterStatusLabel(row),
      row.status === 'published' && row.publishedAt ? formatSheetDateTime(row.publishedAt) : '',
      row.charCount,
      row.readCount,
      row.likeCount,
    ]),
  ];
  return `﻿${lines.map((cells) => cells.map(csvCell).join(',')).join('\r\n')}\r\n`;
}

/** '달빛 와플 가게의 비밀 회차 목록 (2026-11-13).csv' — 읽은 사람·좋아요는 날마다 달라지니 받은 날짜를 붙인다 (한국 날짜) */
export function chapterTableFileName(title: string, now: Date): string {
  return `${fileSafeTitle(title)} 회차 목록 (${formatSheetDateTime(now).slice(0, 10)}).csv`;
}

import { describe, expect, it } from 'vitest';
import { type ChapterTableRow, CHAPTER_TABLE_HEADER, chapterStatusLabel, chapterTableCsv, chapterTableFileName, csvCell } from '@/lib/chapter-table';
import { novelFileName } from '@/lib/chapter-text';

/** RFC 4180 CSV를 칸 배열로 (받은 파일을 표 프로그램이 읽는 대로 되읽어 보는 용도) */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\r' && text[i + 1] === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      i += 1;
    } else cell += ch;
  }
  if (cell || row.length) rows.push([...row, cell]);
  return rows;
}

const base: ChapterTableRow = {
  position: 1,
  title: '달빛 아래에서',
  status: 'published',
  scheduled: false,
  // 한국 시각 2026-11-12 16:00
  publishedAt: new Date('2026-11-12T07:00:00Z'),
  charCount: 12345,
  readCount: 3,
  likeCount: 2,
};

describe('회차 목록 표 파일 (CSV)', () => {
  it('BOM + 머리줄 + 회차마다 한 줄, 줄 끝은 CRLF, 숫자는 쉼표 없이, 공개일은 한국 시각', () => {
    const csv = chapterTableCsv([
      base,
      { ...base, position: 2, title: '새벽 시장', scheduled: true, publishedAt: new Date('2026-11-20T11:00:00Z'), readCount: 0, likeCount: 0 },
      { ...base, position: 3, title: '쓰는 중', status: 'draft', publishedAt: null, charCount: 0, readCount: 0, likeCount: 0 },
    ]);
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv.endsWith('\r\n')).toBe(true);
    expect(csv.slice(1).split('\r\n')).toEqual([
      '번호,제목,상태,공개일,글자수,읽은 사람,좋아요',
      '1,달빛 아래에서,발행,2026-11-12 16:00,12345,3,2',
      '2,새벽 시장,예약,2026-11-20 20:00,12345,0,0',
      '3,쓰는 중,임시저장,,0,0,0',
      '',
    ]);
  });

  it('임시저장은 예전에 발행했던 회차라도 공개일을 비운다, 회차가 없으면 머리줄만', () => {
    const [, row] = parseCsv(chapterTableCsv([{ ...base, status: 'draft' }]).slice(1));
    expect(row).toEqual(['1', '달빛 아래에서', '임시저장', '', '12345', '3', '2']);
    expect(chapterTableCsv([])).toBe(`﻿${CHAPTER_TABLE_HEADER.join(',')}\r\n`);
  });

  it('쉼표 · 따옴표 · 줄바꿈이 든 제목도 표 프로그램이 읽으면 그대로 (앞뒤 빈칸은 다듬음)', () => {
    const titles = ['그날, 비가 왔다', '“안녕”이라고 했다', '"따옴표" 속 "따옴표"', '첫 줄\n둘째 줄', '  여백  ', '', '쉼표,와 "따옴표"\r\n와 줄바꿈'];
    const csv = chapterTableCsv(titles.map((title, index) => ({ ...base, position: index + 1, title })));
    const rows = parseCsv(csv.slice(1));
    expect(rows).toHaveLength(titles.length + 1);
    expect(rows.slice(1).map((row) => row[1])).toEqual(titles.map((title) => title.trim()));
    for (const row of rows) expect(row).toHaveLength(CHAPTER_TABLE_HEADER.length);
  });

  it('= + - @ 로 시작하는 제목은 수식으로 읽히지 않게 앞에 \'를 붙인다', () => {
    expect(csvCell('-프롤로그-')).toBe("'-프롤로그-");
    expect(csvCell('=SUM(A1)')).toBe("'=SUM(A1)");
    expect(csvCell('+1화')).toBe("'+1화");
    expect(csvCell('@모두')).toBe("'@모두");
    // 쉼표까지 있으면 '를 붙인 뒤 따옴표로 감싼다
    expect(csvCell('=1,2')).toBe(`"'=1,2"`);
    // 가운데의 = - 와 숫자 칸은 그대로
    expect(csvCell('1-2화 합본')).toBe('1-2화 합본');
    expect(csvCell(-3)).toBe('-3');
    expect(csvCell('')).toBe('');
  });

  it('상태 이름은 회차 목록 배지와 같게', () => {
    expect(chapterStatusLabel({ status: 'published', scheduled: false })).toBe('발행');
    expect(chapterStatusLabel({ status: 'published', scheduled: true })).toBe('예약');
    expect(chapterStatusLabel({ status: 'draft', scheduled: false })).toBe('임시저장');
  });

  it('파일 이름: 작품 제목 + 회차 목록 + 받은 날(한국 날짜), 못 쓰는 글자는 뺀다', () => {
    // UTC 11월 12일 15:30 = 한국 11월 13일 00:30
    const now = new Date('2026-11-12T15:30:00Z');
    expect(chapterTableFileName('달빛 와플 가게의 비밀', now)).toBe('달빛 와플 가게의 비밀 회차 목록 (2026-11-13).csv');
    expect(chapterTableFileName('a/b: "c"', now)).toBe('ab c 회차 목록 (2026-11-13).csv');
    expect(chapterTableFileName('  ', now)).toBe('작품 회차 목록 (2026-11-13).csv');
    // 텍스트 내보내기와 같은 규칙
    expect(novelFileName('a/b: "c"', 'all')).toBe('ab c (전체 회차).txt');
  });
});

// 링크 복사: 단톡방에 붙여 넣을 글. 링크 미리보기에는 입장 전 화면이라 작품 제목이 안 나오므로 제목을 같이 적는다
// 회차 링크면 '3화 「제목」'도 붙인다
export function shareText(title: string, url: string, chapterLabel?: string): string {
  const head = chapterLabel?.trim() ? `『${title.trim()}』 ${chapterLabel.trim()}` : `『${title.trim()}』`;
  return `${head} · 와플노블에서 읽기\n${url}`;
}

const QUOTE_MAX = 1000;
const OPENS = /^["“'‘「『]/;
const CLOSES = /["”'’」』]$/;

/**
 * '출처와 함께 복사': 고른 본문 글 + 『작품』 N화 「제목」 + 링크(길드원이 들어올 수 있는 회차일 때만).
 * 줄마다 앞뒤 빈칸을 정리하고 빈 줄은 하나까지, 너무 길면 1,000자에서 자른다.
 * 대사처럼 이미 따옴표로 시작하거나 끝나면 그쪽 따옴표는 또 두르지 않는다 (대사를 반만 골라도 따옴표가 겹치지 않게)
 */
export function quoteText(selected: string, title: string, chapterLabel: string, url?: string | null): string {
  const lines = selected
    .split(/\r?\n/)
    .map((line) => line.replace(/[ \t\u00a0]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  const chars = [...lines];
  const body = chars.length > QUOTE_MAX ? `${chars.slice(0, QUOTE_MAX).join('').trimEnd()}…` : lines;
  const quoted = `${OPENS.test(body) ? '' : '“'}${body}${CLOSES.test(body) ? '' : '”'}`;
  const source = `— 『${title.trim()}』${chapterLabel.trim() ? ` ${chapterLabel.trim()}` : ''}`;
  return [quoted, source, url ?? ''].filter(Boolean).join('\n');
}

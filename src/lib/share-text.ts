// 링크 복사: 단톡방에 붙여 넣을 글. 링크 미리보기에는 입장 전 화면이라 작품 제목이 안 나오므로 제목을 같이 적는다
// 회차 링크면 '3화 「제목」'도 붙인다
export function shareText(title: string, url: string, chapterLabel?: string): string {
  const head = chapterLabel?.trim() ? `『${title.trim()}』 ${chapterLabel.trim()}` : `『${title.trim()}』`;
  return `${head} · 와플노블에서 읽기\n${url}`;
}

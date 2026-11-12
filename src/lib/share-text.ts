// 작품 링크 복사: 단톡방에 붙여 넣을 글. 링크 미리보기에는 작품 제목이 안 나오므로(입장 전 화면이라) 제목을 같이 적는다
export function shareText(title: string, url: string): string {
  return `『${title.trim()}』 · 와플노블에서 읽기\n${url}`;
}

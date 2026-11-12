// 내려받기 응답의 content-disposition 머리: 한글 파일 이름은 filename*(RFC 5987), 옛 브라우저용 filename은 영문.
// encodeURIComponent는 ' ( ) * 를 그대로 두는데 RFC 5987에서는 이 글자들도 %로 적어야 해서 따로 바꾼다
// (예: '… 회차 목록 (2026-11-13).csv'의 괄호)

export function attachmentDisposition(asciiName: string, fileName: string): string {
  const encoded = encodeURIComponent(fileName).replace(/['()*]/g, (ch) => `%${ch.charCodeAt(0).toString(16).toUpperCase()}`);
  return `attachment; filename="${asciiName}"; filename*=UTF-8''${encoded}`;
}

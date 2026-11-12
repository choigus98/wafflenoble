import { describe, expect, it } from 'vitest';
import { attachmentDisposition } from '@/lib/download';

describe('내려받기 파일 이름 머리', () => {
  it("한글 이름은 filename*로, ' ( ) * 까지 %로 적고 되풀면 원래 이름", () => {
    const name = "달빛 와플 (전체 회차) 'b'*.csv";
    const header = attachmentDisposition('wafflenoble-novel-1.txt', name);
    expect(header).toBe(
      `attachment; filename="wafflenoble-novel-1.txt"; filename*=UTF-8''%EB%8B%AC%EB%B9%9B%20%EC%99%80%ED%94%8C%20%28%EC%A0%84%EC%B2%B4%20%ED%9A%8C%EC%B0%A8%29%20%27b%27%2A.csv`,
    );
    const value = header.split("filename*=UTF-8''")[1];
    // RFC 5987 attr-char 밖의 글자가 남지 않음
    expect(value).toMatch(/^[A-Za-z0-9!#$&+\-.^_`|~%]+$/);
    expect(decodeURIComponent(value)).toBe(name);
  });
});

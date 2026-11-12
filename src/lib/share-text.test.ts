import { describe, expect, it } from 'vitest';
import { shareText } from '@/lib/share-text';

describe('링크 복사 글', () => {
  it('작품: 제목과 링크를 두 줄로', () => {
    expect(shareText(' 달빛 와플 가게의 비밀 ', 'https://example.com/novels/1')).toBe('『달빛 와플 가게의 비밀』 · 와플노블에서 읽기\nhttps://example.com/novels/1');
  });

  it('회차: 작품 제목 뒤에 회차 이름', () => {
    expect(shareText('달빛 와플 가게의 비밀', 'https://example.com/novels/1/3', '3화 「템플릿 예시」')).toBe(
      '『달빛 와플 가게의 비밀』 3화 「템플릿 예시」 · 와플노블에서 읽기\nhttps://example.com/novels/1/3',
    );
    expect(shareText('작품', 'u', '  ')).toBe('『작품』 · 와플노블에서 읽기\nu');
  });
});

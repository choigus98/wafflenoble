import { describe, expect, it } from 'vitest';
import { shareText } from '@/lib/share-text';

describe('작품 링크 복사 글', () => {
  it('제목과 링크를 두 줄로', () => {
    expect(shareText(' 달빛 와플 가게의 비밀 ', 'https://example.com/novels/1')).toBe('『달빛 와플 가게의 비밀』 · 와플노블에서 읽기\nhttps://example.com/novels/1');
  });
});

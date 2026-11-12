import { describe, expect, it } from 'vitest';
import { quoteText, shareText } from '@/lib/share-text';

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

describe('출처와 함께 복사', () => {
  it('고른 글을 따옴표로 감싸고 『작품』 회차 · 링크', () => {
    expect(quoteText('  종소리 대신   버터 녹는 소리가 났다. ', '달빛 와플 가게의 비밀', '1화 「자정의 손님」', 'https://example.com/novels/1/1')).toBe(
      ['“종소리 대신 버터 녹는 소리가 났다.”', '— 『달빛 와플 가게의 비밀』 1화 「자정의 손님」', 'https://example.com/novels/1/1'].join('\n'),
    );
  });

  it('대사처럼 이미 따옴표면 그쪽은 또 두르지 않음, 링크가 없으면 두 줄, 빈 줄은 하나까지', () => {
    expect(quoteText('“어서 와.”', '작품', '3화')).toBe('“어서 와.”\n— 『작품』 3화');
    // 대사를 반만 골라도 따옴표가 겹치지 않게
    expect(quoteText('“어서 오세요. 오늘은', '작품', '1화').split('\n')[0]).toBe('“어서 오세요. 오늘은”');
    expect(quoteText('오늘은 문을 닫아요.”', '작품', '1화').split('\n')[0]).toBe('“오늘은 문을 닫아요.”');
    expect(quoteText('첫 문단\n\n\n\n둘째 문단', '작품', '', null)).toBe('“첫 문단\n\n둘째 문단”\n— 『작품』');
  });

  it('너무 길면 1,000자에서 자름', () => {
    const text = quoteText('가'.repeat(1200), '작품', '1화');
    expect([...text.split('\n')[0]]).toHaveLength(1003); // 따옴표 둘 + 1,000자 + …
  });
});

import { describe, expect, it } from 'vitest';
import { addSnippet, cleanSnippets, MAX_SNIPPETS, parseSnippets, snippetsFromText, snippetsToText } from '@/lib/snippets';

describe('상용구', () => {
  it('정리: 빈칸 · 줄바꿈은 빈칸 하나로, 빈 것 · 같은 말 · 글이 아닌 것은 빼고, 200자에서 자르고, 적은 순서 그대로', () => {
    expect(cleanSnippets(['  하연화 ', '자정의\n와플   가게', '', '하연화', 3, null, '“어서 오세요.”'])).toEqual(['하연화', '자정의 와플 가게', '“어서 오세요.”']);
    expect(cleanSnippets(['가'.repeat(250)])[0]).toHaveLength(200);
    expect(cleanSnippets(['😀'.repeat(250)])[0]).toBe('😀'.repeat(200));
    expect(cleanSnippets(Array.from({ length: 40 }, (_, index) => `말 ${index}`))).toHaveLength(MAX_SNIPPETS);
  });

  it('저장값 읽기와 고치기 칸 글 (한 줄에 하나)', () => {
    expect(parseSnippets('["하연화","하연화","  "]')).toEqual(['하연화']);
    expect(parseSnippets('{"a":1}')).toEqual([]);
    expect(parseSnippets('[')).toEqual([]);
    expect(parseSnippets(null)).toEqual([]);
    expect(snippetsFromText('하연화\r\n\n  자정의 와플 가게  \n하연화')).toEqual(['하연화', '자정의 와플 가게']);
    expect(snippetsToText(['하연화', '자정의 와플 가게'])).toBe('하연화\n자정의 와플 가게');
  });

  it('고른 글을 맨 뒤에 넣기: 빈 글 · 이미 있는 말 · 30개가 찼으면 그대로', () => {
    expect(addSnippet(['하연화'], '  수진이\n웃었다 ')).toEqual({ list: ['하연화', '수진이 웃었다'], added: true, text: '수진이 웃었다' });
    expect(addSnippet(['하연화'], '   ')).toEqual({ list: ['하연화'], added: false, reason: 'empty' });
    expect(addSnippet(['하연화'], '하연화')).toEqual({ list: ['하연화'], added: false, reason: 'duplicate' });
    const full = Array.from({ length: MAX_SNIPPETS }, (_, index) => `말 ${index}`);
    expect(addSnippet(full, '새 말')).toMatchObject({ added: false, reason: 'full' });
  });
});

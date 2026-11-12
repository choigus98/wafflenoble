import { describe, expect, it } from 'vitest';
import { nextQuote } from '@/lib/quotes';

describe('따옴표로 감싸기', () => {
  it('처음엔 “ ”로 감싸고, 감싼 글을 고른 채 다시 누르면 ‘ ’ → 「 」 → 『 』 → 벗기기', () => {
    expect(nextQuote('안녕', '', '')).toEqual({ kind: 'wrap', open: '“', close: '”' });
    expect(nextQuote('“안녕”', '', '')).toEqual({ kind: 'inside', open: '‘', close: '’' });
    expect(nextQuote('‘안녕’', '', '')).toEqual({ kind: 'inside', open: '「', close: '」' });
    expect(nextQuote('「안녕」', '', '')).toEqual({ kind: 'inside', open: '『', close: '』' });
    expect(nextQuote('『안녕』', '', '')).toEqual({ kind: 'inside', open: '', close: '' });
  });

  it('안쪽 글만 골랐거나 빈 짝 사이 커서면 바깥 짝을 바꾸고, 짝이 아니면 새로 감쌈', () => {
    expect(nextQuote('안녕', '“', '”')).toEqual({ kind: 'outside', open: '‘', close: '’' });
    expect(nextQuote('', '『', '』')).toEqual({ kind: 'outside', open: '', close: '' });
    expect(nextQuote('', '', '')).toEqual({ kind: 'wrap', open: '“', close: '”' });
    // 여는 것과 닫는 것이 짝이 아니면(“…』) 새로 감쌈
    expect(nextQuote('“안녕』', '', '')).toEqual({ kind: 'wrap', open: '“', close: '”' });
    expect(nextQuote('안녕', '“', '』')).toEqual({ kind: 'wrap', open: '“', close: '”' });
  });
});

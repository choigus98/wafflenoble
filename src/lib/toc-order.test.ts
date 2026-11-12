import { describe, expect, it } from 'vitest';
import { orderChapters, parseTocOrder } from '@/lib/toc-order';

describe('목차 정렬', () => {
  it('모르는 값은 1화부터', () => {
    expect(parseTocOrder(undefined)).toBe('asc');
    expect(parseTocOrder('desc')).toBe('desc');
    expect(parseTocOrder('random')).toBe('asc');
  });

  it('최신 화부터면 뒤집고, 원래 목록은 그대로', () => {
    const list = [1, 2, 3];
    expect(orderChapters(list, 'desc')).toEqual([3, 2, 1]);
    expect(orderChapters(list, 'asc')).toEqual([1, 2, 3]);
    expect(list).toEqual([1, 2, 3]);
  });
});

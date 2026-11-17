import { describe, expect, it } from 'vitest';
import { COMMENT_MAX, normalizeComment, toCommentItems } from './comments';

describe('normalizeComment', () => {
  it('앞뒤 공백을 지우고 빈 줄은 한 줄까지만', () => {
    expect(normalizeComment('  재밌어요 \r\n\r\n\r\n\r\n다음 화도  ')).toBe('재밌어요\n\n다음 화도');
  });
  it('비었거나 너무 길면 null', () => {
    expect(normalizeComment('   \n ')).toBeNull();
    expect(normalizeComment(123)).toBeNull();
    expect(normalizeComment('가'.repeat(COMMENT_MAX))).toHaveLength(COMMENT_MAX);
    expect(normalizeComment('가'.repeat(COMMENT_MAX + 1))).toBeNull();
  });
});

describe('toCommentItems', () => {
  const rows = [
    { id: 1, body: '첫 댓글', createdAt: new Date('2026-11-17T01:00:00Z'), readerId: 'a', nickname: '하늘' },
    { id: 2, body: '둘째', createdAt: new Date('2026-11-17T02:00:00Z'), readerId: 'b', nickname: '별' },
  ];
  it('길드원에게는 이름을 보내지 않고 내 댓글만 표시', () => {
    const items = toCommentItems(rows, { readerId: 'b', isAdmin: false });
    expect(items.map((item) => item.author)).toEqual([null, null]);
    expect(items.map((item) => item.mine)).toEqual([false, true]);
    expect(JSON.stringify(items)).not.toContain('하늘');
  });
  it('작가에게는 이름이 보인다', () => {
    const items = toCommentItems(rows, { readerId: null, isAdmin: true });
    expect(items.map((item) => item.author)).toEqual(['하늘', '별']);
    expect(items[0].createdAt).toBe('2026-11-17T01:00:00.000Z');
  });
});

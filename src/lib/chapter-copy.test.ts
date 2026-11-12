import { describe, expect, it } from 'vitest';
import { TITLE_MAX, copyTitle } from '@/lib/chapter-copy';

describe('회차 복제 제목', () => {
  it('원래 제목 뒤에 (복사본), 비었으면 N화', () => {
    expect(copyTitle('템플릿 예시', 3)).toBe('템플릿 예시 (복사본)');
    expect(copyTitle('  ', 7)).toBe('7화 (복사본)');
  });

  it('길어도 100자를 넘지 않고, (복사본)은 남긴다', () => {
    const copied = copyTitle('가'.repeat(100), 1);
    expect([...copied].length).toBe(TITLE_MAX);
    expect(copied.endsWith(' (복사본)')).toBe(true);
    // 이모지를 반으로 자르지 않는다
    expect(copyTitle('😀'.repeat(100), 1)).not.toContain('�');
  });
});

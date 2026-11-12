import { describe, expect, it } from 'vitest';
import { normalizeNickname, parseId, safeNextPath } from '@/lib/utils';

describe('이름 정규화', () => {
  it('앞뒤 공백을 지우고 가운데 공백은 하나로', () => {
    expect(normalizeNickname('  감자   도리 ')).toEqual({ display: '감자 도리', key: '감자 도리' });
  });

  it('중복 판정용 key는 소문자', () => {
    expect(normalizeNickname('Bob')).toEqual({ display: 'Bob', key: 'bob' });
  });

  it('보이지 않는 문자는 지운다', () => {
    expect(normalizeNickname('하​늘')?.display).toBe('하늘');
  });

  it('2~12자만 허용', () => {
    expect(normalizeNickname('가')).toBeNull();
    expect(normalizeNickname('가'.repeat(13))).toBeNull();
    expect(normalizeNickname('가'.repeat(12))).not.toBeNull();
  });
});

describe('돌아갈 경로', () => {
  it.each(['/novels/1', '/novels/1/3?x=1', '/'])('%s 는 허용', (path) => {
    expect(safeNextPath(path)).toBe(path);
  });

  it.each(['//evil.com', 'https://evil.com', '/\\evil.com', '/enter', '/enter?next=/', '/admin', '/admin/login', undefined, 3])(
    '%s 는 / 로',
    (path) => {
      expect(safeNextPath(path)).toBe('/');
    },
  );
});

describe('경로 id', () => {
  it('양의 정수만', () => {
    expect(parseId('12')).toBe(12);
    for (const value of ['0', '-1', '1e3', '12abc', '', '01', '1234567890']) expect(parseId(value)).toBeNull();
  });
});

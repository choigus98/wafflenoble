import { describe, expect, it } from 'vitest';
import { addSpellingKeep, parseSpellingKeep, removeSpellingKeep } from '@/lib/spelling-keep';

describe("자주 틀리는 말 '그대로 두기'", () => {
  it('저장 값 읽기: 글자만, 앞뒤 빈칸 정리, 같은 것·빈 것·너무 긴 것은 버림', () => {
    expect(parseSpellingKeep(null)).toEqual([]);
    expect(parseSpellingKeep('{망가짐')).toEqual([]);
    expect(parseSpellingKeep('{"a":1}')).toEqual([]);
    expect(parseSpellingKeep(JSON.stringify([' 할께요 ', '할께요', '', 3, '됬어', 'x'.repeat(41)]))).toEqual(['할께요', '됬어']);
  });

  it('더하기·빼기 (이미 있으면 그대로)', () => {
    expect(addSpellingKeep(['할께요'], '됬어')).toEqual(['할께요', '됬어']);
    const same = ['할께요'];
    expect(addSpellingKeep(same, ' 할께요')).toBe(same);
    expect(removeSpellingKeep(['할께요', '됬어'], '할께요')).toEqual(['됬어']);
  });
});

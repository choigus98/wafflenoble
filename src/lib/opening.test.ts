import { describe, expect, it } from 'vitest';
import { firstSentence } from '@/lib/opening';

describe('다음 화 미리 보기 첫 문장', () => {
  it('첫 문장까지 (닫는 따옴표·괄호는 붙이고, 숫자 사이 점은 문장 끝이 아님)', () => {
    expect(firstSentence('문이 열린 건 자정이었다. 종소리 대신 버터 녹는 소리가 났다.')).toBe('문이 열린 건 자정이었다.');
    expect(firstSentence('버전 1.5가 나왔다는 소식을 들었다! 정말?')).toBe('버전 1.5가 나왔다는 소식을 들었다!');
    expect(firstSentence('「편지 속 대사가 여기 있다.」 그리고 다음.')).toBe('「편지 속 대사가 여기 있다.」');
  });

  it('열 자가 안 되는 짧은 문장은 다음 문장까지 이어서', () => {
    expect(firstSentence('“어서 와.” 할머니가 말했다. 지은은 웃었다.')).toBe('“어서 와.” 할머니가 말했다.');
    expect(firstSentence('그런데... 이상하지 않아? 아무도 없잖아.')).toBe('그런데... 이상하지 않아?');
  });

  it('띄어쓰기 정리, 문장 끝이 없으면 전부, 길면 80자에서 자름', () => {
    expect(firstSentence('  지은은\n  문을   열었다.  ')).toBe('지은은 문을 열었다.');
    expect(firstSentence('마침표 없이 끝나는 문단')).toBe('마침표 없이 끝나는 문단');
    expect(firstSentence('가'.repeat(100))).toBe(`${'가'.repeat(80)}…`);
    expect(firstSentence('')).toBe('');
  });
});

import { describe, expect, it } from 'vitest';
import { isSceneBreakLine, plainTextToBlocks, type PastedBlock } from '@/lib/paste';

const p = (text: string): PastedBlock => ({ kind: 'paragraph', text });
const scene: PastedBlock = { kind: 'scene' };

describe('서식 없는 글 붙여넣기', () => {
  it('한 줄 = 한 문단인 원고는 빈 줄을 그대로 살린다', () => {
    expect(plainTextToBlocks('첫 문단\n둘째 문단\n\n셋째 문단\n넷째')).toEqual([p('첫 문단'), p('둘째 문단'), p(''), p('셋째 문단'), p('넷째')]);
  });

  it('문단마다 빈 줄을 두는 원고는 빈 줄 하나를 문단 구분으로만 본다', () => {
    expect(plainTextToBlocks('가\n\n나\n\n다\n\n\n라')).toEqual([p('가'), p('나'), p('다'), p(''), p('라')]);
  });

  it('장면 전환 기호는 장면 전환으로, 앞뒤 빈 줄은 없앤다', () => {
    expect(plainTextToBlocks('가\n\n* * *\n\n나')).toEqual([p('가'), scene, p('나')]);
    expect(plainTextToBlocks('가\n***\n나')).toEqual([p('가'), scene, p('나')]);
    expect(plainTextToBlocks('가\n\n\n---\n\n\n나')).toEqual([p('가'), scene, p('나')]);
  });

  it('윈도 줄바꿈, 줄 끝 공백, 앞뒤 빈 줄을 정리한다', () => {
    expect(plainTextToBlocks('\r\n\r\n  가  \r\n나\t\r\n\r\n')).toEqual([p('가'), p('나')]);
  });

  it('줄 앞의 전각 공백(들여쓰기)은 남긴다', () => {
    expect(plainTextToBlocks('　들여쓴 문단\n　다음 문단')).toEqual([p('　들여쓴 문단'), p('　다음 문단')]);
  });

  it('한 줄짜리는 그대로', () => {
    expect(plainTextToBlocks('그냥 한 줄')).toEqual([p('그냥 한 줄')]);
    expect(plainTextToBlocks('\n\n')).toEqual([]);
  });
});

describe('장면 전환 기호', () => {
  it.each(['***', '* * *', '＊＊＊', '---', '- - -', '===', 'ㅡㅡㅡ', '───', '◇', '◇◆◇', '☆☆☆'])('%s 는 장면 전환', (line) => {
    expect(isSceneBreakLine(line)).toBe(true);
  });

  it.each(['……', '...', '**', '--', '* 메모', '-끝-', '◇ 1장'])('%s 는 그냥 글', (line) => {
    expect(isSceneBreakLine(line)).toBe(false);
  });
});

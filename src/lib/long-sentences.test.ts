import { Schema } from '@tiptap/pm/model';
import { describe, expect, it } from 'vitest';
import { longSentences, sentenceRanges } from '@/lib/long-sentences';

const split = (text: string) => sentenceRanges(text).map(({ start, end }) => text.slice(start, end));

describe('긴 문장 찾기', () => {
  it('문장 끝(닫는 따옴표·괄호까지) 뒤에 띄어쓰기가 오면 나누고, 소수점·말줄임 안은 안 나눔', () => {
    expect(split('"가자." 그가 말했다. 정말이야?  응!')).toEqual(['"가자."', '그가 말했다.', '정말이야?', '응!']);
    expect(split('3.5초 뒤에 문이 열렸다. 그건…… 아니야.')).toEqual(['3.5초 뒤에 문이 열렸다.', '그건……', '아니야.']);
    expect(split('끝없이 이어지는 문장')).toEqual(['끝없이 이어지는 문장']);
    expect(split('「알겠어.」 (정말로?) 그래.')).toEqual(['「알겠어.」', '(정말로?)', '그래.']);
    // 문단 안 줄바꿈(자리표)도 경계
    expect(split('첫 줄￼둘째 줄. 셋째')).toEqual(['첫 줄', '둘째 줄.', '셋째']);
    expect(split('   ')).toEqual([]);
  });

  it('문서에서: 기준보다 긴 문장만, 에디터 위치·글자 수·앞부분 (템플릿 안은 빠짐)', () => {
    const schema = new Schema({
      nodes: {
        doc: { content: 'block+' },
        paragraph: { group: 'block', content: 'inline*' },
        storyBlock: { group: 'block', atom: true, attrs: { data: { default: null } } },
        text: { group: 'inline' },
        hardBreak: { group: 'inline', inline: true },
      },
    });
    const long = '가'.repeat(120);
    const doc = schema.node('doc', null, [
      schema.node('paragraph', null, [schema.text(`짧은 문장. ${long}. 다음.`)]),
      schema.node('storyBlock', { data: { script: '나'.repeat(300) } }),
      schema.node('paragraph', null, [schema.text('다'.repeat(90))]),
    ]);
    const found = longSentences(doc, 100);
    expect(found).toHaveLength(1);
    expect(found[0].length).toBe(121);
    expect(doc.textBetween(found[0].from, found[0].to)).toBe(`${long}.`);
    expect(found[0].preview).toBe(`${'가'.repeat(36)}…`);
    // 기준을 80자로 낮추면 90자 문단도
    expect(longSentences(doc, 80).map((item) => item.length)).toEqual([121, 90]);
  });
});

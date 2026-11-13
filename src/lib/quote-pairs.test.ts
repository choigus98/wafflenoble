import { Schema } from '@tiptap/pm/model';
import { describe, expect, it } from 'vitest';
import { quoteIssues, quoteProblemLabel, quoteProblems } from '@/lib/quote-pairs';

const brief = (text: string) => quoteProblems(text).map((problem) => `${problem.kind} ${problem.char}@${problem.offset} → ${problem.fix}`);

describe('따옴표 짝', () => {
  it('짝이 맞으면 없음: 둥근 · 겹친 · 낫표 · 곧은 따옴표, 곧은 것과 둥근 것을 섞어도', () => {
    for (const text of [
      '“그래.” 그가 말했다.',
      '“그가 ‘안녕’이라고 했어.”',
      '「경고: 체력이 부족합니다」 『달빛 와플』을 읽었다',
      '"가자." 그가 말했다. \'정말?\'',
      '"그래” 하고, “응" 했다',
      '“그가 “안녕”이라고 했어.”',
      '“첫 줄￼둘째 줄” 하고',
      '따옴표 없는 문단',
      '',
    ]) {
      expect(brief(text), text).toEqual([]);
    }
  });

  it("영어 줄임표(don't · it’s · boys’)는 따옴표가 아님", () => {
    expect(brief("don't · it’s · the boys’ room")).toEqual([]);
    expect(brief('‘Hello’ 하고 웃었다')).toEqual([]);
    expect(brief("'I'm fine' 하고 웃었다")).toEqual([]);
  });

  it('닫는 짝 없음 · 여는 짝 없음 · 안쪽에서 열고 안 닫음', () => {
    expect(brief('“어디 가? 하고 물었다.')).toEqual(['unclosed “@0 → ”']);
    expect(brief('집에 가.” 그가 말했다.')).toEqual(['unopened ”@5 → “']);
    expect(brief('“그가 ‘안녕 하고 말했다.”')).toEqual(['unclosed ‘@4 → ’']);
    expect(brief('「경고: 체력 부족')).toEqual(['unclosed 「@0 → 」']);
    expect(brief('체력 부족』')).toEqual(['unopened 』@5 → 『']);
    // 다른 종류로 닫으면 둘 다
    expect(brief('“그래’ 하고 웃었다.')).toEqual(['unclosed “@0 → ”', 'unopened ’@3 → ‘']);
  });

  it('곧은 따옴표는 놓인 자리로 무엇이 모자란지 짐작', () => {
    expect(brief('"그래 하고')).toEqual(['unclosed "@0 → "']);
    expect(brief('그래" 하고')).toEqual(['unopened "@2 → "']);
    expect(brief("'혼잣말 하고")).toEqual(["unclosed '@0 → '"]);
  });

  it('방향만 반대인 둥근 따옴표는 알려 주고 짝으로 친다', () => {
    expect(brief('”그래.”')).toEqual(['reversed ”@0 → “']);
    expect(brief('그는 ”그래.” 하고')).toEqual(['reversed ”@3 → “']);
    expect(brief('“그래.“ 하고')).toEqual(['reversed “@4 → ”']);
    expect(brief('‘그래‘')).toEqual(['reversed ‘@3 → ’']);
    // 방향도 반대고 닫지도 않음
    expect(brief('”그래')).toEqual(['reversed ”@0 → “', 'unclosed ”@0 → ”']);
  });

  it('목록에 쓰는 짧은 말', () => {
    expect(quoteProblems('“어디 가?').map(quoteProblemLabel)).toEqual(['닫는 ” 없음']);
    expect(quoteProblems('가.” 그가').map(quoteProblemLabel)).toEqual(['여는 “ 없음']);
    expect(quoteProblems('”그래.”').map(quoteProblemLabel)).toEqual(['” → “ (방향 반대)']);
    expect(quoteProblems('"그래 하고').map(quoteProblemLabel)).toEqual(['닫는 " 없음']);
    expect(quoteProblems('「경고').map(quoteProblemLabel)).toEqual(['닫는 」 없음']);
  });

  it('문서에서: 문제 있는 문단만, 따옴표의 에디터 위치 · 둘레 글 (인용 안 문단도, 템플릿 안은 빠짐)', () => {
    const schema = new Schema({
      nodes: {
        doc: { content: 'block+' },
        paragraph: { group: 'block', content: 'inline*' },
        blockquote: { group: 'block', content: 'block+' },
        storyBlock: { group: 'block', atom: true, attrs: { data: { default: null } } },
        text: { group: 'inline' },
        hardBreak: { group: 'inline', inline: true },
      },
    });
    const p = (...content: Parameters<typeof schema.text>[0][]) =>
      schema.node('paragraph', null, content.map((text) => (text === '⏎' ? schema.node('hardBreak') : schema.text(text))));
    const doc = schema.node('doc', null, [
      p('“괜찮아.” 그가 웃었다.'),
      p('“첫 줄', '⏎', '둘째 줄” 하고'),
      schema.node('storyBlock', { data: { script: '“안 닫힌 대사' } }),
      schema.node('blockquote', null, [p('집에 가.” 그가 말했다.')]),
      p(`앞부분이 아주 긴 문단입니다. ${'가'.repeat(60)} “끝에서 연 대사`),
      p(`”처음부터 반대${'나'.repeat(60)}”`),
    ]);
    const issues = quoteIssues(doc);
    expect(issues).toHaveLength(3);
    const [quote, tail, head] = issues;
    expect(doc.nodeAt(quote.pos)?.textContent).toBe('집에 가.” 그가 말했다.');
    expect(quote.preview).toBe('집에 가.” 그가 말했다.');
    expect(quote.problems.map((problem) => [problem.kind, doc.textBetween(problem.from, problem.to)])).toEqual([['unopened', '”']]);
    // 문단 끝 쪽 문제는 앞을 줄여서 끝까지
    expect(tail.preview).toBe(`…${'가'.repeat(30)} “끝에서 연 대사`);
    expect(doc.textBetween(tail.problems[0].from, tail.problems[0].to)).toBe('“');
    // 문단 앞쪽 문제는 앞부터, 뒤를 줄임
    // 40글자까지: '”처음부터 반대' 8글자 + 32글자
    expect(head.preview).toBe(`”처음부터 반대${'나'.repeat(32)}…`);
    expect(head.problems.map((problem) => problem.kind)).toEqual(['reversed']);
  });
});

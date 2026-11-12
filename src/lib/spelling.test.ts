import { Schema } from '@tiptap/pm/model';
import { describe, expect, it } from 'vitest';
import { objectParticle, spellingIssuesInText, spellingMatches, toParticle } from '@/lib/spelling';

const fixAll = (text: string) => {
  let result = '';
  let cursor = 0;
  for (const issue of spellingIssuesInText(text)) {
    result += text.slice(cursor, issue.index) + issue.right;
    cursor = issue.index + issue.length;
  }
  return result + text.slice(cursor);
};

describe('자주 틀리는 말', () => {
  it('확실히 틀린 말을 고친다', () => {
    expect(fixAll('안됬어. 몇일 뒤에 다시 올께요!')).toBe('안됐어. 며칠 뒤에 다시 올게요!');
    expect(fixAll('어떻해, 왠일이야. 웬지 금새 끝날 것 같아.')).toBe('어떡해, 웬일이야. 왠지 금세 끝날 것 같아.');
    expect(fixAll('왠만하면 구지 안 할려고 했는데 오랫만이네요.')).toBe('웬만하면 굳이 안 하려고 했는데 오랜만이네요.');
    expect(fixAll('잘 되요? 늦어서 죄송해요, 내일 뵈요. 깨끗히 치웠읍니다.')).toBe('잘 돼요? 늦어서 죄송해요, 내일 봬요. 깨끗이 치웠습니다.');
    expect(fixAll('그럴껄 그랬나 봐. 솔직이 눈쌀이 찌푸려졌다.')).toBe('그럴걸 그랬나 봐. 솔직히 눈살이 찌푸려졌다.');
    expect(fixAll('주문을 되뇌였다. 위험을 무릎쓰고 통채로 들고 왔다.')).toBe('주문을 되뇌었다. 위험을 무릅쓰고 통째로 들고 왔다.');
  });

  it('맞는 말은 그대로: 높임·때의 께, 낱말 중간, 껄껄 웃음, 되도록', () => {
    for (const text of [
      '아들께 드렸다. 하늘께 빌었다. 월말께 오겠다. 할머니께서 오셨다. 선생님께.',
      '연구지원 사업. 지금새벽이다. 함께 가자. 되도록 빨리 와.',
      '그는 껄껄 웃었다. 일부로 남겨 둔 조각.',
      '할게요. 됐다. 며칠. 금세. 굳이.',
    ]) {
      expect(spellingIssuesInText(text), text).toEqual([]);
    }
  });

  it('찾은 곳: 위치와 이유, 겹치지 않게 앞에서부터', () => {
    const issues = spellingIssuesInText('"할께!" 그리고 됬다');
    expect(issues.map(({ index, length, wrong, right }) => ({ index, length, wrong, right }))).toEqual([
      { index: 1, length: 2, wrong: '할께', right: '할게' },
      { index: 10, length: 1, wrong: '됬', right: '됐' },
    ]);
    expect(issues[0].why).toContain('게');
  });

  it('문서에서: 문단 위치로, 보여 줄 낱말은 따옴표·문장 부호를 빼고, 템플릿 안은 빠짐', () => {
    const schema = new Schema({
      nodes: {
        doc: { content: 'block+' },
        paragraph: { group: 'block', content: 'inline*' },
        storyBlock: { group: 'block', atom: true, attrs: { data: { default: null } } },
        text: { group: 'inline' },
        hardBreak: { group: 'inline', inline: true },
      },
    });
    const doc = schema.node('doc', null, [
      schema.node('paragraph', null, [schema.text('"안됬어?" 그가 물었다.')]),
      schema.node('storyBlock', { data: { script: '나: 몇일 뒤에 갈께' } }),
      schema.node('paragraph', null, [schema.text('첫 줄'), schema.node('hardBreak'), schema.text('내일 갈께요')]),
    ]);
    const matches = spellingMatches(doc);
    expect(matches.map(({ wrong, right, word, fixedWord }) => ({ wrong, right, word, fixedWord }))).toEqual([
      { wrong: '됬', right: '됐', word: '안됬어', fixedWord: '안됐어' },
      { wrong: '갈께', right: '갈게', word: '갈께요', fixedWord: '갈게요' },
    ]);
    // 위치: 첫 문단 안쪽은 1부터, '"안' 다음이 '됬'
    expect(matches[0].from).toBe(3);
    expect(doc.textBetween(matches[1].from, matches[1].to)).toBe('갈께');
    // '그대로 두기'한 낱말은 모양이 똑같을 때만 빠진다 ('갈께'를 두어도 '갈께요'는 그대로 잡힘)
    expect(spellingMatches(doc, new Set(['갈께요'])).map((match) => match.word)).toEqual(['안됬어']);
    expect(spellingMatches(doc, new Set(['갈께'])).map((match) => match.word)).toEqual(['안됬어', '갈께요']);
  });

  it('알림 글의 조사: 받침에 따라 을/를 · 으로/로 (ㄹ 받침은 로)', () => {
    expect(['몇일', '구지', '왠만하면'].map((word) => `${word}${objectParticle(word)}`)).toEqual(['몇일을', '구지를', '왠만하면을']);
    expect(['며칠', '굳이', '웬만하면', '오랜만에'].map((word) => `${word}${toParticle(word)}`)).toEqual(['며칠로', '굳이로', '웬만하면으로', '오랜만에로']);
    expect(`OK${objectParticle('OK')} 2${toParticle('2')}`).toBe('OK을(를) 2(으)로');
  });
});

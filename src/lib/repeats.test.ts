import { Schema } from '@tiptap/pm/model';
import { describe, expect, it } from 'vitest';
import { repeatedWords, repeatedWordsInTexts, stemOf } from '@/lib/repeats';

describe('반복되는 말', () => {
  it('조사는 받침에 맞을 때만 떼고, 떼면 한 글자만 남는 말은 그대로', () => {
    expect(['그녀는', '그녀가', '그녀를', '그녀의', '지은이', '지은은', '사람들이', '가게에서', '하늘로', '바다로', '집으로'].map(stemOf)).toEqual([
      '그녀',
      '그녀',
      '그녀',
      '그녀',
      '지은',
      '지은',
      '사람들',
      '가게',
      '하늘',
      '바다',
      '집으로',
    ]);
    // 조사가 아닌 끝 글자: '마을'의 을(앞 글자에 받침 없음), '사이'의 이, '가을', '노을'
    expect(['마을', '사이', '가을', '노을', '마을은', '사이에'].map(stemOf)).toEqual(['마을', '사이', '가을', '노을', '마을', '사이']);
    // 조사로 끝나는 것처럼 보이는 한 낱말
    expect(['하지만', '그대로', '스스로', '그래도'].map(stemOf)).toEqual(['하지만', '그대로', '스스로', '그래도']);
  });

  it('세 번 이상 나온 말을 많은 차례로, 같은 말의 여러 모양도 함께 (따옴표·문장 부호·숫자·한 글자는 빼고)', () => {
    const result = repeatedWordsInTexts([
      '"그녀는 웃었다." 그녀가 말했다.',
      '그녀를 보며 지은이 말했다. 지은은 고개를 저었다.',
      '그녀의 손. 지은이 다시 말했다. 3 3 3 그 그 그',
    ]);
    expect(result).toEqual([
      { word: '그녀', count: 4, forms: [{ form: '그녀는', count: 1 }, { form: '그녀가', count: 1 }, { form: '그녀를', count: 1 }, { form: '그녀의', count: 1 }] },
      { word: '말했다', count: 3, forms: [{ form: '말했다', count: 3 }] },
      { word: '지은', count: 3, forms: [{ form: '지은이', count: 2 }, { form: '지은은', count: 1 }] },
    ]);
    expect(repeatedWordsInTexts(['하나 둘 하나'], 15, 3)).toEqual([]);
  });

  it('문서에서: 본문 문단만 (템플릿 안 글은 빠짐), 줄바꿈 앞뒤 낱말은 붙지 않음', () => {
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
      schema.node('paragraph', null, [schema.text('와플을 굽고'), schema.node('hardBreak'), schema.text('와플이 식었다')]),
      schema.node('storyBlock', { data: { script: '와플 와플 와플' } }),
      schema.node('paragraph', null, [schema.text('와플은 맛있다')]),
    ]);
    expect(repeatedWords(doc)).toEqual([{ word: '와플', count: 3, forms: [{ form: '와플을', count: 1 }, { form: '와플이', count: 1 }, { form: '와플은', count: 1 }] }]);
  });
});

import { describe, expect, it } from 'vitest';
import type { DocNode } from '@/lib/chapter-text';
import { htmlToDoc } from '@/lib/html-doc';
import { changeSummary, clipAround, clipLines, compareChapter, diffUnits, docUnits, inlineChange, summarizeChanges, type Unit } from '@/lib/paragraph-diff';
import { createTemplate, serializeStoryBlock } from '@/lib/story-blocks';

const units = (texts: string[]): Unit[] => texts.map((text) => (text.startsWith('T:') ? { text: text.slice(2), template: true } : { text, template: false }));
const summarize = (before: string[], after: string[]) => summarizeChanges(diffUnits(units(before), units(after)));

describe('발행본과 바뀐 곳', () => {
  it('같으면 바뀐 곳 없음', () => {
    expect(summarize(['가', '나'], ['가', '나'])).toEqual([]);
  });

  it('고친 문단 · 새 문단 · 지운 문단, 묶음마다 실마리는 바로 앞의 같은 문단', () => {
    expect(summarize(['첫째', '둘째', '셋째', '넷째', '다섯째'], ['첫째', '둘째!', '셋째', '새 문단', '넷째'])).toEqual([
      { anchor: '첫째', changes: [{ kind: 'changed', before: '둘째', after: '둘째!', template: false }] },
      { anchor: '셋째', changes: [{ kind: 'added', text: '새 문단', template: false }] },
      { anchor: '넷째', changes: [{ kind: 'removed', text: '다섯째', template: false }] },
    ]);
  });

  it('붙어 있는 지운·새 것은 한 묶음: 같은 종류끼리 차례로 짝짓고, 짝 없는 지운 것은 묶음 끝에', () => {
    const groups = summarize(['앞', 'A', 'B', '뒤'], ['앞', 'A2', 'B2', 'C2', '뒤']);
    expect(groups).toHaveLength(1);
    expect(groups[0].anchor).toBe('앞');
    expect(groups[0].changes.map((change) => change.kind)).toEqual(['changed', 'changed', 'added']);
    // 문단 하나를 템플릿으로 바꾸면 고친 것이 아니라 지우고 새로 넣은 것
    const swapped = summarize(['앞', '문단', 'T:[카톡] 대화'], ['앞', 'T:[카톡] 대화!', '문단2']);
    expect(swapped[0].changes).toEqual([
      { kind: 'changed', before: '[카톡] 대화', after: '[카톡] 대화!', template: true },
      { kind: 'changed', before: '문단', after: '문단2', template: false },
    ]);
    expect(summarize(['앞', '문단'], ['앞', 'T:문단'])[0].changes.map((change) => `${change.kind}:${change.template}`)).toEqual([
      'added:true',
      'removed:false',
    ]);
  });

  it('맨 앞이 바뀌면 실마리 없음, 순서를 바꾸면 지우고 새로 쓴 것으로', () => {
    expect(summarize(['가', '나'], ['가!', '나'])).toEqual([{ anchor: null, changes: [{ kind: 'changed', before: '가', after: '가!', template: false }] }]);
    expect(summarize(['가', '나', '다'], ['다', '가', '나']).flatMap((group) => group.changes.map((change) => change.kind))).toEqual(['added', 'removed']);
  });

  it('고친 문단에서 바뀐 부분만: 앞뒤 같은 글자를 떼고, 이모지는 반쪽으로 안 자름', () => {
    expect(inlineChange('틈이 없었다.', '틈이 전혀 없었다.')).toEqual({ prefix: '틈이 ', removed: '', added: '전혀 ', suffix: '없었다.' });
    expect(inlineChange('그는 갔다', '그는 왔다')).toEqual({ prefix: '그는 ', removed: '갔', added: '왔', suffix: '다' });
    expect(inlineChange('웃음 😀 끝', '웃음 😃 끝')).toEqual({ prefix: '웃음 ', removed: '😀', added: '😃', suffix: ' 끝' });
    // 같은 글자가 이어지면 앞쪽을 먼저 맞추고, 뒤쪽은 남은 만큼만
    expect(inlineChange('ㅋㅋ', 'ㅋㅋㅋ')).toEqual({ prefix: 'ㅋㅋ', removed: '', added: 'ㅋ', suffix: '' });
  });

  it('긴 것은 바뀐 곳 둘레만: 앞뒤 한 줄씩(템플릿은 첫 줄도), 긴 줄은 바뀐 글자 앞뒤 40자', () => {
    const lines = ['[카톡 단체방]', '양띵크루 (9명)', '--- 날짜 ---', '양띵: 뭐 할까?', '다주: 마크 하자!', '삼식: 좋아요.', '나: 저도요', '퐁퐁: 그래'];
    const before = lines.join('\n');
    const after = before.replace('마크 하자!', '마크 하자!!');
    const { prefix, suffix } = inlineChange(before, after);
    expect(clipAround(prefix, suffix, true)).toEqual({ prefix: '[카톡 단체방]\n⋯\n양띵: 뭐 할까?\n다주: 마크 하자!', suffix: '\n삼식: 좋아요.\n⋯' });
    // 문단 안 줄바꿈이면 첫 줄은 안 남김, 바로 앞뒤 줄만 있으면 '⋯' 없음
    expect(clipAround('하나\n둘\n셋 ', ' 넷\n다섯', false)).toEqual({ prefix: '⋯\n둘\n셋 ', suffix: ' 넷\n다섯' });
    expect(clipAround('첫 줄\n', '', true)).toEqual({ prefix: '첫 줄\n', suffix: '' });
    const long = '가'.repeat(100);
    expect(clipAround(long, long, false)).toEqual({ prefix: `…${'가'.repeat(40)}`, suffix: `${'가'.repeat(40)}…` });
    expect(clipAround('짧은 앞 ', ' 짧은 뒤', false)).toEqual({ prefix: '짧은 앞 ', suffix: ' 짧은 뒤' });
  });

  it('통째로 넣거나 지운 것은 7줄까지 그대로, 더 길면 앞 6줄과 남은 줄 수', () => {
    const seven = Array.from({ length: 7 }, (_, i) => `줄 ${i + 1}`).join('\n');
    expect(clipLines(seven)).toBe(seven);
    expect(clipLines(`${seven}\n줄 8\n줄 9`)).toBe('줄 1\n줄 2\n줄 3\n줄 4\n줄 5\n줄 6\n⋯ 3줄 더');
  });

  it('회차 비교와 요약: 저장된 HTML과 에디터 문서, 제목·작가의 말은 앞뒤 공백을 빼고 비교', () => {
    const published = { html: '<p>처음</p><p>둘째</p><p>셋째</p>', title: '1화 ', authorNote: '' };
    const doc: DocNode = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: '처음' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '셋째!' }] },
      ],
    };
    const result = compareChapter(published, { doc, title: '1화', authorNote: '고마워요' });
    expect(result).toEqual({
      groups: [
        {
          anchor: '처음',
          changes: [
            { kind: 'changed', before: '둘째', after: '셋째!', template: false },
            { kind: 'removed', text: '셋째', template: false },
          ],
        },
      ],
      title: null,
      note: { before: '', after: '고마워요' },
    });
    expect(changeSummary(result)).toEqual(['고친 문단 1', '지운 문단 1', '작가의 말']);
    expect(changeSummary({ ...result, title: { before: '1화', after: '1화!' } })).toEqual(['제목', '고친 문단 1', '지운 문단 1', '작가의 말']);
    expect(changeSummary({ groups: [], title: null, note: null })).toEqual([]);
  });

  it('문서 → 비교 단위: 빈 문단은 빼고, 장면 전환·인용·템플릿도 하나씩 (저장 HTML과 에디터 문서가 같은 결과)', () => {
    const kakao = createTemplate('kakao-dm');
    const html = `<p>첫 문단</p><p></p><p>&nbsp;</p><hr><blockquote><p>편지</p></blockquote>${serializeStoryBlock(kakao)}<p>끝&nbsp;문단</p>`;
    const editorDoc: DocNode = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: '첫 문단' }] },
        { type: 'paragraph' },
        { type: 'paragraph', content: [{ type: 'text', text: '\u00a0' }] },
        { type: 'horizontalRule' },
        { type: 'blockquote', content: [{ type: 'paragraph', content: [{ type: 'text', text: '편지' }] }] },
        { type: 'storyBlock', attrs: { kind: kakao.kind, data: kakao.data } },
        { type: 'paragraph', content: [{ type: 'text', text: '끝\u00a0문단' }] },
      ],
    };
    const fromHtml = docUnits(htmlToDoc(html));
    expect(fromHtml.map((unit) => (unit.template ? `T:${unit.text.split('\n')[0]}` : unit.text))).toEqual([
      '첫 문단',
      '* * *',
      '> 편지',
      `T:${fromHtml[3].text.split('\n')[0]}`,
      '끝 문단',
    ]);
    expect(fromHtml[3].text.startsWith('[카톡 1:1 대화]')).toBe(true);
    expect(docUnits(editorDoc)).toEqual(fromHtml);
  });

  it('크기만 바꾼 템플릿도 고친 템플릿으로 (원래 크기는 크기 표시 없음, 저장 HTML과 에디터 문서가 같은 결과)', () => {
    const kakao = createTemplate('kakao-dm');
    const editorDoc = (size: number): DocNode => ({ type: 'doc', content: [{ type: 'storyBlock', attrs: { kind: kakao.kind, data: kakao.data, size } }] });
    const before = docUnits(htmlToDoc(serializeStoryBlock(kakao)));
    const after = docUnits(editorDoc(80));
    expect(before).toEqual(docUnits(editorDoc(100)));
    expect(after).toEqual(docUnits(htmlToDoc(serializeStoryBlock(kakao, 80))));
    expect(after[0].text.endsWith('\n(크기 80%)')).toBe(true);
    expect(summarizeChanges(diffUnits(before, after)).flatMap((group) => group.changes.map((change) => change.kind))).toEqual(['changed']);
  });
});

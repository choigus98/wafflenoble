import { describe, expect, it } from 'vitest';
import { chapterFileName, chapterToText, storyBlockToText, type DocNode } from '@/lib/chapter-text';
import { createTemplate } from '@/lib/story-blocks';

const p = (...parts: Array<string | DocNode>): DocNode => ({
  type: 'paragraph',
  content: parts.map((part) => (typeof part === 'string' ? { type: 'text', text: part } : part)),
});
const bold = (text: string): DocNode => ({ type: 'text', text, attrs: {}, content: undefined });
const br: DocNode = { type: 'hardBreak' };

describe('회차 텍스트로 내보내기', () => {
  it('문단은 한 줄씩, 빈 문단은 빈 줄, 줄바꿈·장면 전환·인용, 글자 모양은 글자만', () => {
    const doc: DocNode = {
      type: 'doc',
      content: [
        p('"어디 가?" 그녀가 ', bold('물었다'), '.'),
        { type: 'paragraph' },
        p('첫 줄', br, '둘째 줄'),
        { type: 'horizontalRule' },
        { type: 'blockquote', content: [p('편지 첫 줄', br, '편지 둘째 줄')] },
        p('끝.'),
      ],
    };
    expect(chapterToText({ novelTitle: '달빛 와플 가게의 비밀', position: 3, title: '템플릿 예시', doc, authorNote: '' })).toBe(
      ['『달빛 와플 가게의 비밀』 3화 템플릿 예시', '', '"어디 가?" 그녀가 물었다.', '', '첫 줄', '둘째 줄', '* * *', '> 편지 첫 줄', '> 편지 둘째 줄', '끝.', ''].join('\n'),
    );
  });

  it('템플릿은 머리를 달고 앞뒤 한 줄씩 띄우며, 작가의 말은 맨 끝에', () => {
    const kakao = createTemplate('kakao-dm');
    const doc: DocNode = {
      type: 'doc',
      content: [p('수진이 휴대폰을 확인했다.'), { type: 'storyBlock', attrs: { kind: kakao.kind, data: kakao.data } }, p('단톡방도 조용할 틈이 없었다.')],
    };
    const text = chapterToText({ novelTitle: '작품', position: 1, title: '', doc, authorNote: '  다음 화도 기대해 주세요  ' });
    const [heading, , first, gap, label] = text.split('\n');
    expect(heading).toBe('『작품』 1화');
    expect(first).toBe('수진이 휴대폰을 확인했다.');
    expect(gap).toBe('');
    expect(label).toBe('[카톡 1:1 대화]');
    expect(text).toContain('\n\n단톡방도 조용할 틈이 없었다.\n\n[작가의 말]\n다음 화도 기대해 주세요\n');
  });

  it('템플릿 앞뒤는 정확히 한 줄: 템플릿끼리 붙어 있거나 작가가 빈 문단을 넣어 둬도 늘어나지 않게', () => {
    const location = createTemplate('location');
    const alarm = createTemplate('alarm');
    const block = (b: ReturnType<typeof createTemplate>): DocNode => ({ type: 'storyBlock', attrs: { kind: b.kind, data: b.data } });
    const doc: DocNode = { type: 'doc', content: [p('앞'), block(location), block(alarm), { type: 'paragraph' }, p('뒤'), { type: 'paragraph' }, { type: 'paragraph' }, p('끝')] };
    const body = chapterToText({ novelTitle: '작품', position: 1, title: '', doc, authorNote: '' }).split('\n').slice(2);
    const at = (label: string) => body.indexOf(label);
    expect(body[at('[위치 공유]') - 1]).toBe('');
    expect(body[at('[위치 공유]') - 2]).toBe('앞');
    // 두 템플릿 사이 빈 줄 하나
    expect(body[at('[알람]') - 1]).toBe('');
    expect(body[at('[알람]') - 2]).not.toBe('');
    // 알람 뒤 작가의 빈 문단이 그 한 줄을 대신함 → '뒤' 바로 앞은 빈 줄 하나
    expect(body[at('뒤') - 1]).toBe('');
    expect(body[at('뒤') - 2]).not.toBe('');
    // 작가가 일부러 띄운 빈 문단 두 개는 그대로
    expect(body.slice(at('뒤') + 1, at('끝'))).toEqual(['', '']);
  });

  it('읽을 수 없는 템플릿은 빼고, 빈 문서는 제목만', () => {
    const doc: DocNode = { type: 'doc', content: [{ type: 'storyBlock', attrs: { kind: 'nope', data: {} } }] };
    expect(chapterToText({ novelTitle: '작품', position: 2, title: '빈 회차', doc, authorNote: '' })).toBe('『작품』 2화 빈 회차\n');
  });

  it('카드형 템플릿은 보이는 순서대로, 빈 칸은 빼고', () => {
    const transfer = createTemplate('transfer');
    if (transfer.kind !== 'transfer') throw new Error('송금 완료 템플릿이 아니에요');
    expect(storyBlockToText({ ...transfer, data: { ...transfer.data, memo: '', date: '2026.11.13 00:36' } })).toBe(
      ['[송금 완료]', '와플뱅크', '송금 완료 50,000원', '받는 분: 김수진', '보낸 계좌: 와플뱅크 1002-***-123456', '일시: 2026.11.13 00:36'].join('\n'),
    );
    const alarm = createTemplate('alarm');
    if (alarm.kind !== 'alarm') throw new Error('알람 템플릿이 아니에요');
    expect(storyBlockToText({ ...alarm, data: { ...alarm.data, date: '' } })).toBe(['[알람]', '오전 6:30', '일어나! 와플 가게 문 여는 날', '반복: 월 화 수 목 금'].join('\n'));
  });

  it('투표·영수증은 자동으로 낸 값(참여 인원·합계)도', () => {
    const poll = createTemplate('poll');
    expect(storyBlockToText(poll).split('\n').at(-1)).toBe('22명 참여');
    const receipt = createTemplate('receipt');
    expect(storyBlockToText(receipt)).toContain('합계: 10,500원');
  });

  it('모든 템플릿이 머리 한 줄 + 글로 풀린다 (빈 줄 없이)', () => {
    const keys = ['kakao-dm', 'kakao-group', 'live', 'chat', 'donation', 'post', 'system-quest', 'system-status', 'news', 'call-incoming', 'call-active', 'note', 'sns', 'mail', 'search', 'push', 'sms', 'receipt', 'location', 'poll', 'transfer', 'alarm', 'event'] as const;
    for (const key of keys) {
      const text = storyBlockToText(createTemplate(key));
      const [head, ...rest] = text.split('\n');
      expect(head, key).toMatch(/^\[.+\]$/);
      expect(rest.length, key).toBeGreaterThan(0);
      expect(text, key).not.toMatch(/\n\n\n/);
    }
  });

  it('파일 이름: 못 쓰는 글자는 빼고 80자까지', () => {
    expect(chapterFileName('달빛 와플 가게의 비밀', 3, '템플릿 예시')).toBe('달빛 와플 가게의 비밀 3화 템플릿 예시.txt');
    expect(chapterFileName('작품: "부제"', 1, 'a/b\\c?')).toBe('작품 부제 1화 abc.txt');
    expect(chapterFileName('', 1, '')).toBe('1화.txt');
    expect([...chapterFileName('가'.repeat(100), 1, '')].length).toBe(84);
  });
});

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
    const music = createTemplate('music');
    if (music.kind !== 'music') throw new Error('음악 재생 템플릿이 아니에요');
    expect(storyBlockToText({ ...music, data: { ...music.data, lyric: '첫 줄\n\n 둘째 줄 ' } })).toBe(
      ['[음악 재생]', '지금 재생 중', '골목 끝의 단맛', '시럽 밴드', '1:24 / 3:45', '♪ 첫 줄', '♪ 둘째 줄'].join('\n'),
    );
    expect(storyBlockToText({ ...music, data: { ...music.data, app: '', elapsed: '', duration: '', lyric: '' } })).toBe(['[음악 재생]', '골목 끝의 단맛', '시럽 밴드'].join('\n'));
    expect(storyBlockToText(createTemplate('rank'))).toBe(
      [
        '[실시간 순위]',
        '실시간 후원 랭킹',
        'LIVE',
        '1. 밥알: 1,250,000원 ▲2',
        '2. 감자도리: 980,000원 ▼1',
        '3. 초코우유: 750,000원 NEW',
        '4. 시럽왕: 410,000원 -',
        '⋯',
        '* 15. 와플집 딸: 120,000원 ▲5',
      ].join('\n'),
    );
    const namecard = createTemplate('namecard');
    if (namecard.kind !== 'namecard') throw new Error('명함 템플릿이 아니에요');
    expect(storyBlockToText({ ...namecard, data: { ...namecard.data, address: '', role: '' } })).toBe(
      ['[명함]', '주식회사 와플랩', '한도윤', '전화 010-2024-1113', '메일 doyun.han@waffle.example', '메모: 오늘 밤 9시, 골목 끝 와플 가게'].join('\n'),
    );
    expect(storyBlockToText(createTemplate('weather'))).toBe(
      ['[날씨]', '와플시 반죽구', '12° 구름 조금', '최고 15° · 최저 6°', '저녁부터 비 소식이 있어요', '지금: 구름 조금 12°', '오후 4시: 흐림 11°', '오후 5시: 흐림 10°', '오후 6시: 비 9°', '오후 7시: 비 8°', '오후 8시: 밤 맑음 7°'].join('\n'),
    );
    expect(storyBlockToText(createTemplate('subway'))).toBe(
      ['[지하철 안내]', '2호선 · 시럽 방면', '이번 역: 반죽', '이전 역: 버터 · 다음 역: 시럽', '이번 역은 반죽, 반죽역입니다. 내리실 문은 오른쪽입니다.'].join('\n'),
    );
    expect(storyBlockToText(createTemplate('parcel'))).toBe(
      [
        '[택배 배송 조회]',
        '와플택배 · 운송장 6012-3456-7890',
        '수제 시럽 세트 외 1건',
        '지금 상태: 배송 중',
        '오늘 18~20시 도착 예정',
        '11.13 14:05 반죽 대리점: 배송 출발',
        '11.13 09:12 반죽 터미널: 간선 하차',
        '11.12 22:40 시럽 허브: 간선 상차',
        '11.12 18:03 시럽 집하점: 집하',
        '11.12 15:31 와플상점: 접수',
      ].join('\n'),
    );
    expect(storyBlockToText(createTemplate('match'))).toBe(
      ['[게임 결과]', '승리 · 랭크 게임 · 5대5', '32 : 28 · 28:41', 'MVP: 하연화', '— 우리 팀 —', '* 하연화: 12 / 3 / 7', '밥알: 8 / 5 / 10', '감자도리: 4 / 6 / 15', '— 상대 팀 —', '초코우유: 9 / 7 / 4', '버터칼: 6 / 9 / 8'].join('\n'),
    );
    expect(storyBlockToText(createTemplate('profile'))).toBe(
      ['[메신저 프로필]', '프로필을 바꿨어요 · 방금', '한지은', '상태 메시지: 오늘도 와플 굽는 중', '♪ 골목 끝의 단맛 - 시럽밴드'].join('\n'),
    );
    const plane = createTemplate('ticket-plane');
    if (plane.kind !== 'ticket') throw new Error('탑승권 템플릿이 아니에요');
    expect(storyBlockToText({ ...plane, data: { ...plane.data, date: '11월 13일 (금)' } })).toBe(
      ['[탑승권]', '와플항공 WF801', 'ICN 인천 14:05 → CJU 제주 15:10', '11월 13일 (금)', '승객: 한도윤', '탑승구: 12 · 좌석: 23A · 탑승: 13:35'].join('\n'),
    );
    const train = createTemplate('ticket-train');
    if (train.kind !== 'ticket') throw new Error('승차권 템플릿이 아니에요');
    expect(storyBlockToText({ ...train, data: { ...train.data, date: '', passenger: '' } })).toBe(
      ['[승차권]', 'KTX 101', '서울 09:00 → 부산 11:38', '호차: 5 · 좌석: 12A · 타는 곳: 3'].join('\n'),
    );
    const subway = createTemplate('subway');
    if (subway.kind !== 'subway') throw new Error('지하철 안내 템플릿이 아니에요');
    expect(storyBlockToText({ ...subway, data: { ...subway.data, direction: '', next: '', message: '' } })).toBe(['[지하철 안내]', '2호선', '이번 역: 반죽', '이전 역: 버터'].join('\n'));
    const todo = createTemplate('todo');
    if (todo.kind !== 'todo') throw new Error('할 일 목록 템플릿이 아니에요');
    expect(storyBlockToText({ ...todo, data: { ...todo.data, date: '' } })).toBe(
      ['[할 일 목록]', '가게 문 열기 전에', '[x] 와플 반죽 숙성시키기', '[x] 버터 녹여 두기', '[ ] 시럽 새로 사 오기', '[ ] 간판 불 켜기', '— 문 닫고 —', '[ ] 할머니께 전화하기', '2/5 완료'].join('\n'),
    );
  });

  it('투표·영수증은 자동으로 낸 값(참여 인원·합계)도', () => {
    const poll = createTemplate('poll');
    expect(storyBlockToText(poll).split('\n').at(-1)).toBe('22명 참여');
    const receipt = createTemplate('receipt');
    expect(storyBlockToText(receipt)).toContain('합계: 10,500원');
  });

  it('모든 템플릿이 머리 한 줄 + 글로 풀린다 (빈 줄 없이)', () => {
    const keys = ['kakao-dm', 'kakao-group', 'live', 'chat', 'donation', 'post', 'system-quest', 'system-status', 'news', 'call-incoming', 'call-active', 'note', 'sns', 'mail', 'search', 'push', 'sms', 'receipt', 'location', 'poll', 'transfer', 'alarm', 'event', 'item', 'music', 'rank', 'todo', 'namecard', 'weather', 'subway', 'parcel', 'ticket-plane', 'ticket-train', 'match', 'profile'] as const;
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

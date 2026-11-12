import { describe, expect, it } from 'vitest';
import { sanitizeChapterHtml } from '@/lib/content';
import {
  alarmDays,
  chatColorKey,
  clockSeconds,
  eventDateParts,
  itemGradeKey,
  commentDisplayName,
  commentSpeakers,
  createTemplate,
  isMine,
  isPostAuthor,
  kakaoTitle,
  musicProgress,
  parseRankScript,
  parseTodoScript,
  todoProgress,
  parseComments,
  parsePollScript,
  parsePushScript,
  parseReceiptScript,
  parseScript,
  parseSearchResults,
  parseSystemScript,
  pollPercent,
  pollPercentLabel,
  pollStatus,
  pollTotal,
  postCommentCount,
  receiptTotal,
  renameSpeaker,
  scriptSpeakers,
  smsContact,
  splitMailSender,
  splitStoryContent,
  type KakaoData,
  type PostData,
  type StoryBlock,
  type TemplateKey,
} from '@/lib/story-blocks';

// 브라우저 DOM 직렬화처럼 & 와 " 만 이스케이프 (Tiptap getHTML 결과 흉내)
const browserAttr = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
const asEditorHtml = (kind: string, data: unknown) =>
  `<div data-wn-block="${kind}" data-wn-data="${browserAttr(JSON.stringify(data))}"></div>`;

const TRICKY = '그 사람이 "안녕" 했어 <script>alert(1)</script> & 😀';

function postData(patch: Partial<PostData> = {}): PostData {
  const block = createTemplate('post');
  if (block.kind !== 'post') throw new Error('게시글 템플릿이 아니에요');
  return { ...block.data, ...patch };
}
const KEYS: TemplateKey[] = [
  'kakao-dm',
  'kakao-group',
  'live',
  'chat',
  'donation',
  'post',
  'system-quest',
  'system-status',
  'news',
  'call-incoming',
  'call-active',
  'note',
  'sns',
  'mail',
  'search',
  'push',
  'sms',
  'receipt',
  'location',
  'poll',
  'transfer',
  'alarm',
  'event',
  'item',
  'music',
  'rank',
  'todo',
  'namecard',
];

function withTrickyText(block: StoryBlock): StoryBlock {
  switch (block.kind) {
    case 'kakao':
    case 'chat':
    case 'sms':
      return { ...block, data: { ...block.data, script: `${block.data.script}\n양띵: ${TRICKY}\n둘째 줄` } } as StoryBlock;
    case 'donation':
      return { ...block, data: { ...block.data, message: `감사합니다 ${TRICKY}\n(물론)` } };
    case 'live':
      return { ...block, data: { ...block.data, title: '게임 <img src=x onerror=alert(1)>' } };
    case 'post':
      return {
        ...block,
        data: { ...block.data, body: `${TRICKY}\n\n둘째 문단`, script: `${block.data.script}\nㄴ 양띵: ${TRICKY}` },
      };
    case 'system':
      return { ...block, data: { ...block.data, title: `${TRICKY}`, script: `${block.data.script}\n스킬: ${TRICKY}` } };
    case 'news':
      return { ...block, data: { ...block.data, title: TRICKY, body: `${TRICKY}\n\n둘째 문단 <b>굵게?</b>` } };
    case 'call':
      return { ...block, data: { ...block.data, name: '엄마 <3 & "아빠"' } };
    case 'note':
      return { ...block, data: { ...block.data, body: `${TRICKY}\n둘째 줄` } };
    case 'sns':
      return { ...block, data: { ...block.data, body: TRICKY, script: `${block.data.script}\n양띵: ${TRICKY}` } };
    case 'mail':
      return {
        ...block,
        data: { ...block.data, from: `양띵 <yang@example.com> ${TRICKY}`, body: `${TRICKY}\n\n둘째 문단`, attachment: '보고서 "최종".pdf' },
      };
    case 'search':
      return { ...block, data: { ...block.data, query: TRICKY, script: `${block.data.script}\n\n${TRICKY}\nexample.com/?q="x"&y=<1>` } };
    case 'location':
      return { ...block, data: { ...block.data, place: '와플 <가게> & "1층"', note: TRICKY } };
    case 'poll':
      return { ...block, data: { ...block.data, question: TRICKY, script: `${block.data.script}\n* ${TRICKY}: 1,000표` } };
    case 'transfer':
      return { ...block, data: { ...block.data, to: '김<b>수진</b> & "친구"', memo: '밥값 <script>x</script> & "😀"' } };
    case 'alarm':
      return { ...block, data: { ...block.data, label: '<b>일어나</b> & "지각" 😀', days: '월 <수> & 금' } };
    case 'event':
      return { ...block, data: { ...block.data, title: TRICKY, note: `${TRICKY}\n둘째 줄` } };
    case 'item':
      return { ...block, data: { ...block.data, name: '<b>전설</b>의 "뒤집개" & 😀', script: `${block.data.script}\n${TRICKY}: +1` } };
    case 'music':
      return { ...block, data: { ...block.data, title: '<b>밤</b>의 "와플" & 😀', lyric: `${TRICKY}\n둘째 줄` } };
    case 'rank':
      return { ...block, data: { ...block.data, title: '<b>랭킹</b> & "후원"', script: `${block.data.script}\n${TRICKY}: 1,000원 ▲1` } };
    case 'todo':
      return { ...block, data: { ...block.data, title: '<b>할 일</b> & "목록"', script: `${block.data.script}\n[x] ${TRICKY}` } };
    case 'namecard':
      return { ...block, data: { ...block.data, name: '한<b>도윤</b> & 😀', email: '"doyun" <a@b.example>', memo: '<script>x</script> & "밤 9시"' } };
    case 'receipt':
      return { ...block, data: { ...block.data, store: '가게 <b>&</b> "따옴표"', script: `${block.data.script}\n${TRICKY}: 1,000원` } };
    case 'push':
      // 날짜 칸은 40자까지라 짧은 까다로운 글자로
      return { ...block, data: { ...block.data, date: '11월 <b>12일</b> & "목"', script: `${block.data.script}\n카톡 · 양띵: ${TRICKY} [방금]` } };
  }
}

describe('템플릿 저장 형식', () => {
  it.each(KEYS)('%s: 에디터 HTML → 저장 → 읽기를 거쳐도 데이터가 그대로다', (key) => {
    const block = withTrickyText(createTemplate(key));
    const stored = sanitizeChapterHtml(`<p>앞</p>${asEditorHtml(block.kind, block.data)}<p>뒤 &amp; 끝</p>`);
    const segments = splitStoryContent(stored);

    expect(segments).toHaveLength(3);
    expect(segments[1]).toEqual({ type: 'block', block });
    // 위험한 태그는 블록 데이터(속성) 안에서 글자로만 남는다
    expect(stored.replace(/data-wn-data="[^"]*"/g, '')).not.toMatch(/<script|<img|onerror/i);
    // 다시 정제해도 바뀌지 않는다
    expect(sanitizeChapterHtml(stored)).toBe(stored);
  });

  it('형식이 깨진 블록은 지운다', () => {
    const broken = [
      '<div data-wn-block="kakao" data-wn-data="{not json"></div>',
      '<div data-wn-block="unknown" data-wn-data="{}"></div>',
      asEditorHtml('chat', { title: 'x', badge: '', script: 'a: b', colors: { a: 'red; background:url(x)' } }),
      asEditorHtml('kakao', { mode: 'dm', title: 'x'.repeat(41), memberCount: '', me: '나', script: '' }),
      // 게시글 본문 길이 제한(5,000자)을 넘김
      asEditorHtml('post', postData({ body: 'x'.repeat(5001) })),
    ];
    for (const html of broken) expect(sanitizeChapterHtml(`<p>a</p>${html}`)).toBe('<p>a</p>');
  });

  it('모르는 필드는 버린다', () => {
    const live = createTemplate('live');
    const stored = sanitizeChapterHtml(asEditorHtml('live', { ...live.data, onclick: 'alert(1)' }));
    expect(stored).not.toContain('onclick');
    expect(splitStoryContent(stored)[0]).toEqual({ type: 'block', block: live });
  });
});

describe('대본 읽기', () => {
  const script = [
    '--- 2026년 10월 5일 ---',
    '양띵: 수진아 뭐 해? [오후 8:14]',
    '나: 방송 준비하고 있어요!',
    '네 ㅎㅎ 조금만 하려고요',
    '8:30에 보자',
    '근데 진짜 궁금한 게 있는데요: 이건 뭐예요',
    '',
    '양띵 : 끝나면 연락해~ (8:16)',
  ].join('\n');

  it('이름·시간·날짜·이어 말하기 규칙대로 나눈다', () => {
    expect(parseScript(script)).toEqual([
      { type: 'notice', text: '2026년 10월 5일' },
      { type: 'message', name: '양띵', text: '수진아 뭐 해?', time: '오후 8:14' },
      { type: 'message', name: '나', text: '방송 준비하고 있어요!', time: '' },
      // 이름 없이 쓴 줄은 앞사람이 이어서
      { type: 'message', name: '나', text: '네 ㅎㅎ 조금만 하려고요', time: '' },
      // 숫자로 시작하는 '8:30'은 이름이 아니다
      { type: 'message', name: '나', text: '8:30에 보자', time: '' },
      // 15자를 넘는 콜론 앞부분은 이름이 아니다
      { type: 'message', name: '나', text: '근데 진짜 궁금한 게 있는데요: 이건 뭐예요', time: '' },
      { type: 'message', name: '양띵', text: '끝나면 연락해~', time: '8:16' },
    ]);
  });

  it('첫 줄부터 이름이 없으면 건너뛴다', () => {
    expect(parseScript('누가 말했는지 모름\n양띵: 안녕')).toEqual([
      { type: 'message', name: '양띵', text: '안녕', time: '' },
    ]);
  });

  it('등장인물은 처음 나온 순서대로', () => {
    expect(scriptSpeakers(parseScript(script))).toEqual(['양띵', '나']);
  });

  it('이름 바꾸기는 줄 앞의 이름만 바꾼다', () => {
    expect(renameSpeaker('양띵: 양띵이 왔다\n나: 응\n  양띵 : 또 왔다', '양띵', '양띵언니')).toBe(
      '양띵언니: 양띵이 왔다\n나: 응\n  양띵언니 : 또 왔다',
    );
  });

  it('카톡·채팅 대본에서는 ㄴ도 이름의 일부다 (답글 규칙은 댓글 대본에만)', () => {
    expect(renameSpeaker('ㄴ 양띵: 안녕', '양띵', '수진')).toBe('ㄴ 양띵: 안녕');
  });
});

describe('커뮤니티 댓글 대본', () => {
  const script = [
    '익명1: 와 이거 진짜임? [20:31]',
    'ㄴ 글쓴이: ㅇㅇ 방금 봄 [11.12 20:32]',
    '└감자도리: 레전드 ㅋㅋ [3분 전]',
    '밥알: 둘째 줄까지 있는 댓글',
    'ㄴㄴ 아님 이건 이어지는 줄 [방금]',
    '자료 첨부함 [펌]',
    '평점: 이번 화는 (4.5)',
    '--- 삭제된 댓글입니다 ---',
    'ㄴ --- 삭제된 답글입니다 ---',
    'ㄴㅇㄱ: 닉네임이 ㄴ으로 시작',
  ].join('\n');

  it('답글·시간·이어 쓰기·회색 줄 규칙대로 나눈다', () => {
    expect(parseComments(script)).toEqual([
      { type: 'comment', name: '익명1', text: '와 이거 진짜임?', time: '20:31', reply: false },
      { type: 'comment', name: '글쓴이', text: 'ㅇㅇ 방금 봄', time: '11.12 20:32', reply: true },
      { type: 'comment', name: '감자도리', text: '레전드 ㅋㅋ', time: '3분 전', reply: true },
      // 이름 없는 줄은 앞 댓글에 줄을 바꿔 붙고, 그 줄 끝 시간은 댓글 시간이 된다. 'ㄴㄴ'은 답글 표시가 아니다
      {
        type: 'comment',
        name: '밥알',
        text: '둘째 줄까지 있는 댓글\nㄴㄴ 아님 이건 이어지는 줄\n자료 첨부함 [펌]',
        time: '방금',
        reply: false,
      },
      // 시간은 대괄호만: 괄호로 끝나는 댓글은 그대로
      { type: 'comment', name: '평점', text: '이번 화는 (4.5)', time: '', reply: false },
      { type: 'notice', text: '삭제된 댓글입니다', reply: false },
      { type: 'notice', text: '삭제된 답글입니다', reply: true },
      // 'ㄴ' 뒤에 띄어쓰기가 없으면 닉네임의 일부
      { type: 'comment', name: 'ㄴㅇㄱ', text: '닉네임이 ㄴ으로 시작', time: '', reply: false },
    ]);
  });

  it('첫 줄부터 이름이 없으면 건너뛴다', () => {
    expect(parseComments('누가 쓴 건지 모름\n익명: 안녕')).toEqual([
      { type: 'comment', name: '익명', text: '안녕', time: '', reply: false },
    ]);
  });

  it('여러 날짜·시간 표기를 시간으로 읽는다', () => {
    for (const time of ['20:31', '오후 8:31', '2026.11.12 20:31', '11/12', '12-25 09:00', '방금 전', '1시간 전', '어제 23:10']) {
      expect(parseComments(`익명: 댓글 [${time}]`)[0]).toMatchObject({ text: '댓글', time });
    }
    expect(parseComments('익명: 이번 화 [32]')[0]).toMatchObject({ text: '이번 화 [32]', time: '' });
  });

  it('댓글 쓴 사람·글쓴이 표시·댓글 수', () => {
    const data = postData({ author: 'ㅇㅇ', commentCount: '', script });
    const lines = parseComments(script);
    expect(commentSpeakers(lines)).toEqual(['익명1', '글쓴이', '감자도리', '밥알', '평점', 'ㄴㅇㄱ']);
    expect(isPostAuthor('글쓴이', '')).toBe(true);
    expect(isPostAuthor('ㅇㅇ', 'ㅇㅇ')).toBe(true);
    expect(isPostAuthor('익명1', 'ㅇㅇ')).toBe(false);
    expect(commentDisplayName('글쓴이', 'ㅇㅇ')).toBe('ㅇㅇ');
    expect(commentDisplayName('글쓴이', '')).toBe('글쓴이');
    // 회색 줄은 세지 않는다. 직접 적은 댓글 수가 먼저
    expect(postCommentCount(data, lines)).toBe('6');
    expect(postCommentCount({ ...data, commentCount: '1,024' }, lines)).toBe('1,024');
  });

  it('이름 바꾸기는 답글 줄의 이름도 바꾼다', () => {
    expect(renameSpeaker('익명1: 안녕\nㄴ 익명1: 또\n└ 익명1 : 또또\n익명2: 익명1 왔네', '익명1', '감자', { replies: true })).toBe(
      '감자: 안녕\nㄴ 감자: 또\n└ 감자 : 또또\n익명2: 익명1 왔네',
    );
  });
});

describe('카톡·채팅창 표시 규칙', () => {
  const dm = (patch: Partial<KakaoData>): KakaoData => ({
    mode: 'dm',
    title: '',
    memberCount: '',
    me: '나',
    script: '양띵: 뭐 해?\n나: 방송 준비',
    ...patch,
  });

  it("'나'는 항상 오른쪽, 지정한 이름도 오른쪽", () => {
    expect(isMine('나', '')).toBe(true);
    expect(isMine('수진', '수진')).toBe(true);
    expect(isMine('양띵', '수진')).toBe(false);
  });

  it('1:1 방 제목은 비우면 상대 이름', () => {
    const data = dm({});
    expect(kakaoTitle(data, parseScript(data.script))).toBe('양띵');
    expect(kakaoTitle(dm({ title: '언니' }), [])).toBe('언니');
  });

  it('닉네임 색은 직접 고른 색이 먼저, 없으면 등장 순서대로', () => {
    expect(chatColorKey('b', ['a', 'b'], {})).toBe('purple');
    expect(chatColorKey('b', ['a', 'b'], { b: 'teal' })).toBe('teal');
  });
});

describe('시스템 창 대본', () => {
  it('능력치·강조·구분선·안내 문장으로 나눈다', () => {
    const script = [
      '「잃어버린 기억을 찾아라」',
      '[스킬 \'화염구\'를 얻었습니다]',
      '제한 시간: 23:59:59',
      '힘 : 15',
      '--- 보상 ---',
      '---',
      '12:30에 문이 닫힙니다.',
      '기억이 하나 사라집니다.',
      '이름만:',
    ].join('\n');
    expect(parseSystemScript(script)).toEqual([
      { type: 'emphasis', text: '「잃어버린 기억을 찾아라」' },
      { type: 'emphasis', text: "[스킬 '화염구'를 얻었습니다]" },
      // 값 안의 콜론은 그대로
      { type: 'stat', label: '제한 시간', value: '23:59:59' },
      { type: 'stat', label: '힘', value: '15' },
      { type: 'divider', text: '보상' },
      { type: 'divider', text: '' },
      // 숫자로 시작하는 줄은 능력치가 아니라 문장
      { type: 'text', text: '12:30에 문이 닫힙니다.' },
      { type: 'text', text: '기억이 하나 사라집니다.' },
      // 값이 없는 '이름:'은 문장으로
      { type: 'text', text: '이름만:' },
    ]);
  });

  it('메뉴의 두 가지 시스템 창은 같은 종류이고 이름은 시스템 창', () => {
    const quest = createTemplate('system-quest');
    const status = createTemplate('system-status');
    expect(quest.kind).toBe('system');
    expect(status.kind).toBe('system');
  });
});

describe('이메일 보낸 사람', () => {
  it('이름 <주소>는 이름과 주소로 나눈다', () => {
    expect(splitMailSender('김지은 <jieun@example.com>')).toEqual({ name: '김지은', address: 'jieun@example.com' });
    expect(splitMailSender('  와플 가게   <owner@example.com>  ')).toEqual({ name: '와플 가게', address: 'owner@example.com' });
  });

  it('꺾쇠가 없으면 적은 그대로 이름으로', () => {
    expect(splitMailSender('jieun@example.com')).toEqual({ name: 'jieun@example.com', address: '' });
    expect(splitMailSender('와플 가게')).toEqual({ name: '와플 가게', address: '' });
    expect(splitMailSender('')).toEqual({ name: '', address: '' });
  });

  it('주소만 꺾쇠에 있으면 주소를 이름 자리에', () => {
    expect(splitMailSender('<jieun@example.com>')).toEqual({ name: 'jieun@example.com', address: '' });
    expect(splitMailSender('김지은 <>')).toEqual({ name: '김지은', address: '' });
  });

  it('새 이메일 템플릿은 예시 주소를 이름·주소로 보여 준다', () => {
    const block = createTemplate('mail');
    if (block.kind !== 'mail') throw new Error('이메일 템플릿이 아니에요');
    expect(splitMailSender(block.data.from)).toEqual({ name: '보낸 사람', address: 'sender@example.com' });
    expect(block.data.attachment).toBe('');
  });
});

describe('검색 결과 대본', () => {
  it('빈 줄로 결과를 나누고 첫 줄 제목 · 둘째 줄 주소 · 나머지 요약', () => {
    const script = ['와플 가게 후기', 'waffle.example.com/review', '골목 끝 그 가게,', '가 보신 분?', '', '', '자정 영업 안내', 'https://example.com/hours?day=fri', '금요일만 엽니다'].join('\n');
    expect(parseSearchResults(script)).toEqual([
      { title: '와플 가게 후기', url: 'waffle.example.com/review', snippet: '골목 끝 그 가게,\n가 보신 분?', ad: false },
      { title: '자정 영업 안내', url: 'https://example.com/hours?day=fri', snippet: '금요일만 엽니다', ad: false },
    ]);
  });

  it("둘째 줄이 주소처럼 안 보이면 요약으로, '주소 › 경로'도 주소로 읽는다", () => {
    expect(parseSearchResults('제목만 있는 결과\n이건 주소가 아니라 요약이에요')).toEqual([
      { title: '제목만 있는 결과', url: '', snippet: '이건 주소가 아니라 요약이에요', ad: false },
    ]);
    expect(parseSearchResults('맛집 지도\nwww.example.co.kr › 맛집 › 골목\n요약')[0].url).toBe('www.example.co.kr › 맛집 › 골목');
    expect(parseSearchResults('제목\nv1.2 버전 안내')[0]).toEqual({ title: '제목', url: '', snippet: 'v1.2 버전 안내', ad: false });
    expect(parseSearchResults('평점\n4.5')[0]).toEqual({ title: '평점', url: '', snippet: '4.5', ad: false });
    expect(parseSearchResults('정부 안내\nwww.example.go.kr')[0].url).toBe('www.example.go.kr');
  });

  it('[광고]로 시작하면 광고 표시하고 제목에서는 뺀다', () => {
    expect(parseSearchResults('[광고] 와플 반죽 할인\nshop.example.com')).toEqual([
      { title: '와플 반죽 할인', url: 'shop.example.com', snippet: '', ad: true },
    ]);
  });

  it('공백뿐인 줄도 결과를 나누고, 빈 대본은 결과 없음', () => {
    expect(parseSearchResults('첫째\n   \n둘째').map((result) => result.title)).toEqual(['첫째', '둘째']);
    expect(parseSearchResults('  \n\n ')).toEqual([]);
  });

  it('새 검색 결과 템플릿의 예시 대본은 결과 2개 (둘째는 광고)', () => {
    const block = createTemplate('search');
    if (block.kind !== 'search') throw new Error('검색 결과 템플릿이 아니에요');
    const results = parseSearchResults(block.data.script);
    expect(results).toHaveLength(2);
    expect(results.map((result) => [result.url, result.ad])).toEqual([
      ['example.com/first', false],
      ['ad.example.com', true],
    ]);
  });
});

describe('휴대폰 알림 대본', () => {
  it("'앱 · 보낸 사람: 내용 [시각]', 보낸 사람 없이 '앱: 내용'", () => {
    expect(parsePushScript('카톡 · 엄마: 어디야? [방금]\n은행: 입금 10,000원 [3분 전]')).toEqual([
      { type: 'push', app: '카톡', title: '엄마', body: '어디야?', time: '방금' },
      { type: 'push', app: '은행', title: '', body: '입금 10,000원', time: '3분 전' },
    ]);
  });

  it('이름 없이 쓰면 앞 알림 내용에 줄바꿈, 숫자로 시작하는 줄은 이름이 아님', () => {
    expect(parsePushScript('카톡 · 엄마: 어디야?\n8:30에 와\n조심히 [방금]')).toEqual([
      { type: 'push', app: '카톡', title: '엄마', body: '어디야?\n8:30에 와\n조심히', time: '방금' },
    ]);
  });

  it('--- 안내 ---는 가운데 글, 첫 줄부터 이름이 없으면 앱 이름 없는 알림', () => {
    expect(parsePushScript('그냥 알림이에요\n--- 알림 2개 더 ---\n---')).toEqual([
      { type: 'push', app: '', title: '', body: '그냥 알림이에요', time: '' },
      { type: 'notice', text: '알림 2개 더' },
    ]);
  });

  it("'와플 가게 · 주인 할머니 · 단골방'처럼 가운뎃점이 여럿이면 첫 조각이 앱", () => {
    expect(parsePushScript('와플 가게 · 주인 할머니 · 단골방: 오늘도 열어요')[0]).toEqual({
      type: 'push',
      app: '와플 가게',
      title: '주인 할머니 · 단골방',
      body: '오늘도 열어요',
      time: '',
    });
  });

  it('새 휴대폰 알림 템플릿의 예시는 알림 3개 (첫 알림은 두 줄)', () => {
    const block = createTemplate('push');
    if (block.kind !== 'push') throw new Error('휴대폰 알림 템플릿이 아니에요');
    const lines = parsePushScript(block.data.script);
    expect(lines).toHaveLength(3);
    expect(lines[0]).toMatchObject({ app: '카톡', title: '엄마', body: '어디야? 늦었는데\n조심히 와', time: '방금' });
    expect(block.data.date).toMatch(/^\d{1,2}월 \d{1,2}일 [월화수목금토일]요일$/);
  });
});

describe('문자 메시지', () => {
  it('위쪽 이름: 적은 값이 먼저, 없으면 대본에서 내가 아닌 첫 사람', () => {
    const lines = parseScript('나: 어디야?\n엄마: 집이지\n아빠: 나도');
    expect(smsContact({ contact: '', me: '나', script: '' }, lines)).toBe('엄마');
    expect(smsContact({ contact: ' 010-1234-5678 ', me: '나', script: '' }, lines)).toBe('010-1234-5678');
    expect(smsContact({ contact: '', me: '엄마', script: '' }, lines)).toBe('아빠');
    expect(smsContact({ contact: '', me: '나', script: '' }, parseScript('나: 혼잣말'))).toBe('문자');
  });

  it('새 문자 메시지 템플릿 예시: 날짜 줄 1개 + 문자 4개, 상대는 엄마', () => {
    const block = createTemplate('sms');
    if (block.kind !== 'sms') throw new Error('문자 메시지 템플릿이 아니에요');
    const lines = parseScript(block.data.script);
    expect(lines.filter((line) => line.type === 'notice')).toHaveLength(1);
    expect(lines.filter((line) => line.type === 'message')).toHaveLength(4);
    expect(smsContact(block.data, lines)).toBe('엄마');
  });
});

describe('영수증 대본', () => {
  const data = { store: '와플 가게', info: '', date: '', total: '', footer: '', script: '' };

  it("'이름: 금액', 이름 끝 ×2는 수량, 마지막 쌍점에서 나눔", () => {
    expect(parseReceiptScript('버터 와플 ×2: 7,000원\n세트: 커피+와플: 9,000원')).toEqual([
      { type: 'item', name: '버터 와플', qty: '2', price: '7,000원', amount: 7000, unit: '원' },
      { type: 'item', name: '세트: 커피+와플', qty: '', price: '9,000원', amount: 9000, unit: '원' },
    ]);
  });

  it('빼는 금액, 구분선, 쌍점 없는 안내 글, 금액을 못 읽는 품목', () => {
    expect(parseReceiptScript('쿠폰 할인: -1,000원\n---\n포장 주문\n서비스 쿠키: 서비스')).toEqual([
      { type: 'item', name: '쿠폰 할인', qty: '', price: '-1,000원', amount: -1000, unit: '원' },
      { type: 'divider' },
      { type: 'note', text: '포장 주문' },
      { type: 'item', name: '서비스 쿠키', qty: '', price: '서비스', amount: null, unit: '' },
    ]);
  });

  it('합계: 직접 적은 값이 먼저, 없으면 더해서 (단위는 품목을 따라감)', () => {
    const lines = parseReceiptScript('와플 ×2: 7,000원\n커피: 4,500원\n할인: -1,000원');
    expect(receiptTotal(data, lines)).toBe('10,500원');
    expect(receiptTotal({ ...data, total: '만 원' }, lines)).toBe('만 원');
    expect(receiptTotal(data, parseReceiptScript('물약: 3골드\n빵: 2골드'))).toBe('5골드');
  });

  it('금액을 못 읽는 품목이 있거나 단위가 섞이면 자동 합계 없음', () => {
    expect(receiptTotal(data, parseReceiptScript('쿠키: 서비스\n커피: 4,500원'))).toBe('');
    expect(receiptTotal(data, parseReceiptScript('물약: 3골드\n커피: 4,500원'))).toBe('');
    expect(receiptTotal(data, parseReceiptScript('그냥 안내만'))).toBe('');
  });

  it('새 영수증 템플릿 예시의 합계는 10,500원', () => {
    const block = createTemplate('receipt');
    if (block.kind !== 'receipt') throw new Error('영수증 템플릿이 아니에요');
    expect(receiptTotal(block.data, parseReceiptScript(block.data.script))).toBe('10,500원');
  });
});

describe('투표 대본', () => {
  const data = { badge: '', question: '야식?', script: '', status: '' };

  it("'선택지: 표 수', 숫자만 쓰면 '표', 단위는 그대로, 마지막 쌍점에서 나눔", () => {
    expect(parsePollScript('떡볶이: 12\n치킨: 1,234명\nA안: 떡볶이: 3 표')).toEqual([
      { text: '떡볶이', votes: 12, label: '12표', mine: false },
      { text: '치킨', votes: 1234, label: '1,234명', mine: false },
      { text: 'A안: 떡볶이', votes: 3, label: '3표', mine: false },
    ]);
  });

  it('*는 내 선택, 표 수 없는 줄은 같은 단위로 0, 쌍점 뒤가 숫자가 아니면 줄 전체가 이름', () => {
    expect(parsePollScript('* 떡볶이: 12명\n\n＊치킨\n시간: 맵게')).toEqual([
      { text: '떡볶이', votes: 12, label: '12명', mine: true },
      { text: '치킨', votes: 0, label: '0명', mine: true },
      { text: '시간: 맵게', votes: 0, label: '0명', mine: false },
    ]);
  });

  it('모든 줄에 표 수가 없으면 투표 전: 표 수·비율·맨 아래 한 줄 없음', () => {
    const options = parsePollScript('떡볶이\n치킨\n*');
    expect(options).toEqual([
      { text: '떡볶이', votes: null, label: '', mine: false },
      { text: '치킨', votes: null, label: '', mine: false },
    ]);
    expect(pollTotal(options)).toBe(0);
    expect(pollPercent(options[0], 0)).toBe(0);
    expect(pollStatus(data, options)).toBe('');
    expect(pollStatus({ ...data, status: '오늘 자정 마감' }, options)).toBe('오늘 자정 마감');
  });

  it("맨 아래 한 줄: 직접 적은 값이 먼저, 없으면 표 수를 더해서 'N명 참여'", () => {
    const options = parsePollScript('가: 1,200\n나: 300');
    expect(pollTotal(options)).toBe(1500);
    expect(options.map((option) => pollPercent(option, 1500))).toEqual([80, 20]);
    expect(pollStatus(data, options)).toBe('1,500명 참여');
    expect(pollStatus({ ...data, status: '  투표 마감  ' }, options)).toBe('투표 마감');
  });

  it("표가 있는데 반올림하면 0%인 선택지는 '<1%', 표가 없으면 0%", () => {
    const options = parsePollScript('가: 1,204\n나: 87\n다: 3\n라: 0');
    const total = pollTotal(options);
    expect(options.map((option) => pollPercentLabel(option, total))).toEqual(['93%', '7%', '<1%', '0%']);
  });

  it('새 투표 템플릿 예시: 22명 참여, 내 선택은 떡볶이(55%)', () => {
    const block = createTemplate('poll');
    if (block.kind !== 'poll') throw new Error('투표 템플릿이 아니에요');
    const options = parsePollScript(block.data.script);
    expect(pollStatus(block.data, options)).toBe('22명 참여');
    expect(options.filter((option) => option.mine).map((option) => option.text)).toEqual(['떡볶이']);
    expect(options.map((option) => pollPercent(option, pollTotal(options)))).toEqual([55, 32, 14, 0]);
  });
});

describe('알람 반복 요일', () => {
  const on = (text: string) => {
    const result = alarmDays(text);
    return result ? ['일', '월', '화', '수', '목', '금', '토'].filter((_, day) => result.days[day]).join('') : null;
  };

  it('요일을 띄어 쓰거나 쉼표·가운뎃점으로, \'월요일\'도 됨', () => {
    expect(on('월 화 수 목 금')).toBe('월화수목금');
    expect(on('월, 수, 금')).toBe('월수금');
    expect(on('토·일')).toBe('일토');
    expect(on('월요일 금요일')).toBe('월금');
  });

  it("'매일'·'평일'·'주말', 낭독기용 글", () => {
    expect(on('매일')).toBe('일월화수목금토');
    expect(alarmDays('매일')?.spoken).toBe('매일');
    expect(on('평일')).toBe('월화수목금');
    expect(on('주말')).toBe('일토');
    expect(alarmDays('월 수 금')?.spoken).toBe('월, 수, 금');
  });

  it('요일이 아닌 말이 섞이거나 비어 있으면 null (적은 그대로 글로)', () => {
    expect(alarmDays('격주 월요일')).toBeNull();
    expect(alarmDays('')).toBeNull();
    expect(alarmDays('   ')).toBeNull();
  });
});

describe('일정 날짜 타일', () => {
  it("'11월 14일 토요일'·'2026년 11월 14일 (토)'는 달 · 날 · 요일로", () => {
    expect(eventDateParts('11월 14일 토요일')).toEqual({ month: '11', day: '14', weekday: '토' });
    expect(eventDateParts('2026년 11월 14일 (토)')).toEqual({ month: '11', day: '14', weekday: '토' });
    expect(eventDateParts('3월 1일')).toEqual({ month: '3', day: '1', weekday: '' });
    expect(eventDateParts('03월 09일 (월)')).toEqual({ month: '3', day: '9', weekday: '월' });
  });

  it('날짜로 못 읽으면 null (글 그대로)', () => {
    expect(eventDateParts('내일')).toBeNull();
    expect(eventDateParts('13월 40일')).toBeNull();
    expect(eventDateParts('')).toBeNull();
  });
});

describe('아이템 등급 색', () => {
  it('등급 이름에 든 말로 고른다 (영문·다른 이름도)', () => {
    expect(itemGradeKey('전설')).toBe('legendary');
    expect(itemGradeKey('SSS급 전설')).toBe('legendary');
    expect(itemGradeKey('Legendary')).toBe('legendary');
    expect(itemGradeKey('유니크')).toBe('epic');
    expect(itemGradeKey('레어')).toBe('rare');
    expect(itemGradeKey('매직')).toBe('uncommon');
    expect(itemGradeKey('신화')).toBe('mythic');
  });

  it('모르는 이름이거나 비면 일반 색', () => {
    expect(itemGradeKey('')).toBe('common');
    expect(itemGradeKey('S+')).toBe('common');
  });
});

describe('음악 재생 막대', () => {
  it('시각 글자를 초로: 분:초 · 시:분:초 · 전각 쌍점, 못 읽으면 null', () => {
    expect(clockSeconds('3:45')).toBe(225);
    expect(clockSeconds(' 01:24 ')).toBe(84);
    expect(clockSeconds('1:02:03')).toBe(3723);
    expect(clockSeconds('3：45')).toBe(225);
    expect(clockSeconds('125:00')).toBe(7500);
    expect(clockSeconds('3:75')).toBeNull();
    expect(clockSeconds('1:75:00')).toBeNull();
    expect(clockSeconds('3분 45초')).toBeNull();
    expect(clockSeconds('')).toBeNull();
  });

  it('비율: 재생 위치 / 전체 길이, 비어 있으면 0, 넘치면 1, 전체 길이를 못 읽으면 null', () => {
    expect(musicProgress('1:30', '3:00')).toBe(0.5);
    expect(musicProgress('', '3:00')).toBe(0);
    expect(musicProgress('5:00', '3:00')).toBe(1);
    expect(musicProgress('1:30', 'LIVE')).toBeNull();
    expect(musicProgress('1:30', '0:00')).toBeNull();
    expect(musicProgress('곧', '3:00')).toBeNull();
  });
});

describe('실시간 순위 대본', () => {
  it('이름: 점수 · 오르내림 · 강조 · 순위 직접 · 중간 생략', () => {
    expect(parseRankScript(['밥알: 1,250,000원 ▲2', '감자도리: 980,000원 ▼1', '초코우유 NEW', '시럽왕: 41 -', '---', '* 15. 와플집 딸: 120,000원 ↑5', '16위 마지막'].join('\n'))).toEqual([
      { type: 'row', rank: 1, name: '밥알', score: '1,250,000원', change: { dir: 'up', amount: 2 }, mine: false },
      { type: 'row', rank: 2, name: '감자도리', score: '980,000원', change: { dir: 'down', amount: 1 }, mine: false },
      { type: 'row', rank: 3, name: '초코우유', score: '', change: { dir: 'new' }, mine: false },
      { type: 'row', rank: 4, name: '시럽왕', score: '41', change: { dir: 'same' }, mine: false },
      { type: 'gap' },
      { type: 'row', rank: 15, name: '와플집 딸', score: '120,000원', change: { dir: 'up', amount: 5 }, mine: true },
      { type: 'row', rank: 16, name: '마지막', score: '', change: null, mine: false },
    ]);
  });

  it('같은 순위, 쌍점이 든 이름, 오르내림처럼 보여도 이름인 것', () => {
    const rows = parseRankScript(['1. 가', '1. 나', '3. 팀: 알파: 300점', '-30도', '이름: -30', '2024', '▲3'].join('\n'));
    expect(rows.map((row) => (row.type === 'row' ? `${row.rank}|${row.name}|${row.score}|${row.change?.dir ?? ''}` : 'gap'))).toEqual([
      '1|가||',
      '1|나||',
      '3|팀: 알파|300점|',
      '4|-30도||',
      '5|이름|-30|',
      '6|2024||',
      '7|▲3||',
    ]);
  });
});

describe('할 일 목록 대본', () => {
  it('끝낸 일 · 아직 · 묶음 제목 · 구분선, 여러 표기', () => {
    const lines = parseTodoScript(['[x] 반죽', '[ ] 시럽', '그냥 쓴 일', '--- 저녁 ---', '[v] 설거지', '✓ 정리', '☐ 전화', '- 산책', '---', '[x]', '[X] 끝'].join('\n'));
    expect(lines).toEqual([
      { type: 'item', text: '반죽', done: true },
      { type: 'item', text: '시럽', done: false },
      { type: 'item', text: '그냥 쓴 일', done: false },
      { type: 'section', text: '저녁' },
      { type: 'item', text: '설거지', done: true },
      { type: 'item', text: '정리', done: true },
      { type: 'item', text: '전화', done: false },
      { type: 'item', text: '산책', done: false },
      { type: 'section', text: '' },
      { type: 'item', text: '끝', done: true },
    ]);
    expect(todoProgress(lines)).toEqual({ done: 4, total: 8 });
    expect(todoProgress([])).toEqual({ done: 0, total: 0 });
  });
});

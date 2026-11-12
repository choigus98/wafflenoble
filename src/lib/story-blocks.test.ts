import { describe, expect, it } from 'vitest';
import { sanitizeChapterHtml } from '@/lib/content';
import {
  chatColorKey,
  commentDisplayName,
  commentSpeakers,
  createTemplate,
  isMine,
  isPostAuthor,
  kakaoTitle,
  parseComments,
  parseScript,
  parseSystemScript,
  postCommentCount,
  renameSpeaker,
  scriptSpeakers,
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
];

function withTrickyText(block: StoryBlock): StoryBlock {
  switch (block.kind) {
    case 'kakao':
    case 'chat':
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

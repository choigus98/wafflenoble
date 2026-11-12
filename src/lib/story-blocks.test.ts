import { describe, expect, it } from 'vitest';
import { sanitizeChapterHtml } from '@/lib/content';
import {
  chatColorKey,
  createTemplate,
  isMine,
  kakaoTitle,
  parseScript,
  renameSpeaker,
  scriptSpeakers,
  splitStoryContent,
  type KakaoData,
  type StoryBlock,
  type TemplateKey,
} from '@/lib/story-blocks';

// 브라우저 DOM 직렬화처럼 & 와 " 만 이스케이프 (Tiptap getHTML 결과 흉내)
const browserAttr = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
const asEditorHtml = (kind: string, data: unknown) =>
  `<div data-wn-block="${kind}" data-wn-data="${browserAttr(JSON.stringify(data))}"></div>`;

const TRICKY = '그 사람이 "안녕" 했어 <script>alert(1)</script> & 😀';
const KEYS: TemplateKey[] = ['kakao-dm', 'kakao-group', 'live', 'chat', 'donation'];

function withTrickyText(block: StoryBlock): StoryBlock {
  switch (block.kind) {
    case 'kakao':
    case 'chat':
      return { ...block, data: { ...block.data, script: `${block.data.script}\n양띵: ${TRICKY}\n둘째 줄` } } as StoryBlock;
    case 'donation':
      return { ...block, data: { ...block.data, message: `감사합니다 ${TRICKY}\n(물론)` } };
    case 'live':
      return { ...block, data: { ...block.data, title: '게임 <img src=x onerror=alert(1)>' } };
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

import { z } from 'zod';

// 본문 중간에 넣는 '이야기 속 화면' 템플릿 (라이브 방송창, 실시간 채팅창, 후원 알림, 카톡 1:1·단체방).
// 저장 형식: <div data-wn-block="종류" data-wn-data="JSON"></div>
// 에디터(Tiptap 노드), 서버(저장할 때 검증), 열람 화면(렌더링)이 모두 이 파일을 같이 쓴다.

export const CHAT_COLOR_KEYS = ['blue', 'purple', 'green', 'yellow', 'pink', 'teal', 'orange'] as const;
export type ChatColor = (typeof CHAT_COLOR_KEYS)[number];

// 닉네임 색은 이 목록 안에서만 고른다 (임의의 CSS 값이 저장되지 않게)
export const CHAT_COLORS: Record<ChatColor, string> = {
  blue: '#8fb8ff',
  purple: '#d7a9ff',
  green: '#a3e5a6',
  yellow: '#ffd77e',
  pink: '#ffa3c4',
  teal: '#86e1dc',
  orange: '#ffb486',
};

export const LIMITS = { people: 30, messages: 500, name: 30, message: 2000 } as const;

const text = (max: number) => z.string().max(max);
const idSchema = z.string().regex(/^[a-z0-9]{1,16}$/);

const personSchema = z.object({ id: idSchema, name: text(LIMITS.name), color: z.enum(CHAT_COLOR_KEYS) });
const messageSchema = z.object({ id: idSchema, from: idSchema, text: text(LIMITS.message), time: text(20) });

const liveSchema = z.object({
  streamer: text(40),
  badge: text(20),
  title: text(120),
  viewers: text(20),
  category: text(40),
});

const donationSchema = z.object({
  platform: text(40),
  badge: text(20),
  donor: text(40),
  amount: text(40),
  message: text(LIMITS.message),
  footer: text(120), // 비우면 '○○ 님이 치즈 후원을 보냈습니다.'
});

const chatSchema = z.object({
  title: text(60),
  badge: text(20),
  people: z.array(personSchema).max(LIMITS.people),
  messages: z.array(messageSchema).max(LIMITS.messages),
});

const kakaoSchema = z.object({
  mode: z.enum(['dm', 'group']),
  room: text(40), // 단체방 이름 (1:1은 상대 이름이 제목)
  memberCount: text(10),
  date: text(40),
  meId: idSchema, // 오른쪽(분홍) 말풍선
  people: z.array(personSchema).min(1).max(LIMITS.people),
  messages: z.array(messageSchema).max(LIMITS.messages),
});

export const storyBlockSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('live'), data: liveSchema }),
  z.object({ kind: z.literal('chat'), data: chatSchema }),
  z.object({ kind: z.literal('donation'), data: donationSchema }),
  z.object({ kind: z.literal('kakao'), data: kakaoSchema }),
]);

export type StoryBlock = z.infer<typeof storyBlockSchema>;
export type LiveData = z.infer<typeof liveSchema>;
export type DonationData = z.infer<typeof donationSchema>;
export type ChatData = z.infer<typeof chatSchema>;
export type KakaoData = z.infer<typeof kakaoSchema>;
export type ChatPerson = z.infer<typeof personSchema>;
export type ChatMessage = z.infer<typeof messageSchema>;

// ─── 템플릿 ────────────────────────────────────────────

export type TemplateKey = 'kakao-dm' | 'kakao-group' | 'live' | 'chat' | 'donation';

export const TEMPLATES: Array<{ key: TemplateKey; label: string; hint: string }> = [
  { key: 'kakao-dm', label: '카톡 1:1 대화', hint: '두 사람의 메신저 대화' },
  { key: 'kakao-group', label: '카톡 단체방', hint: '여러 사람이 있는 단톡방' },
  { key: 'live', label: '라이브 방송창', hint: '방송인 · 제목 · 시청자 수' },
  { key: 'chat', label: '실시간 채팅창', hint: '시청자 닉네임과 채팅' },
  { key: 'donation', label: '후원 알림', hint: '후원자 · 금액 · 메시지' },
];

export function templateLabel(block: StoryBlock): string {
  const key: TemplateKey = block.kind === 'kakao' ? (block.data.mode === 'dm' ? 'kakao-dm' : 'kakao-group') : block.kind;
  return TEMPLATES.find((template) => template.key === key)?.label ?? '템플릿';
}

export function newId(): string {
  return Math.random().toString(36).slice(2, 10) || 'id';
}

function todayLabel(): string {
  return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'full', timeZone: 'Asia/Seoul' }).format(new Date());
}

/** 새로 넣을 템플릿. 구조가 바로 보이도록 예시 내용을 채워 둔다 */
export function createTemplate(key: TemplateKey): StoryBlock {
  switch (key) {
    case 'live':
      return {
        kind: 'live',
        data: { streamer: '방송인', badge: 'LIVE', title: '방송 제목', viewers: '1,024', category: '종합 게임' },
      };
    case 'chat': {
      const [a, b] = [newId(), newId()];
      return {
        kind: 'chat',
        data: {
          title: '방송인 채팅',
          badge: 'LIVE',
          people: [
            { id: a, name: '시청자1', color: 'blue' },
            { id: b, name: '시청자2', color: 'purple' },
          ],
          messages: [
            { id: newId(), from: a, text: '방송 켰다!', time: '' },
            { id: newId(), from: b, text: '오늘 뭐 함?', time: '' },
          ],
        },
      };
    }
    case 'donation':
      return {
        kind: 'donation',
        data: {
          platform: '치지직 후원',
          badge: '새 후원',
          donor: '후원자',
          amount: '10,000원',
          message: '후원 메시지를 적어 주세요',
          footer: '',
        },
      };
    case 'kakao-dm': {
      const [me, other] = [newId(), newId()];
      return {
        kind: 'kakao',
        data: {
          mode: 'dm',
          room: '',
          memberCount: '',
          date: todayLabel(),
          meId: me,
          people: [
            { id: me, name: '나', color: 'pink' },
            { id: other, name: '상대', color: 'blue' },
          ],
          messages: [
            { id: newId(), from: other, text: '뭐 해?', time: '오후 8:14' },
            { id: newId(), from: me, text: '방송 준비하고 있어요!', time: '오후 8:15' },
          ],
        },
      };
    }
    case 'kakao-group': {
      const [me, a, b] = [newId(), newId(), newId()];
      return {
        kind: 'kakao',
        data: {
          mode: 'group',
          room: '단체방',
          memberCount: '3',
          date: todayLabel(),
          meId: me,
          people: [
            { id: me, name: '나', color: 'pink' },
            { id: a, name: '친구1', color: 'blue' },
            { id: b, name: '친구2', color: 'green' },
          ],
          messages: [
            { id: newId(), from: a, text: '얘들아 내일 뭐 할까?', time: '' },
            { id: newId(), from: b, text: '게임 하자!', time: '' },
            { id: newId(), from: me, text: '저도 좋아요', time: '오후 7:21' },
          ],
        },
      };
    }
  }
}

// ─── 여러 줄 한 번에 넣기 ──────────────────────────────

/**
 * "이름: 대사" 형식의 여러 줄을 메시지 목록으로 바꾼다.
 * - 콜론이 없는 줄은 바로 앞 대사에 줄바꿈으로 이어 붙인다
 * - 줄 끝의 [오후 8:14] 또는 (8:14)는 시간으로 뺀다
 */
export function parseChatLines(input: string): Array<{ name: string; text: string; time: string }> {
  const result: Array<{ name: string; text: string; time: string }> = [];
  for (const raw of input.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const match = line.match(/^([^:：]{1,30}?)\s*[:：]\s*(.*)$/);
    // '8:30에 보자'처럼 숫자로 시작하는 줄은 이름이 아니라 이어지는 대사로 본다
    if (match && !/^\d+$/.test(match[1].trim())) {
      let body = match[2];
      let time = '';
      const timeMatch = body.match(/\s*[[(]((?:오전|오후)\s*\d{1,2}:\d{2}|\d{1,2}:\d{2})[\])]\s*$/);
      if (timeMatch && timeMatch.index !== undefined) {
        time = timeMatch[1];
        body = body.slice(0, timeMatch.index).trimEnd();
      }
      result.push({ name: match[1].trim(), text: body, time });
    } else if (result.length > 0) {
      result[result.length - 1].text += `\n${line}`;
    }
  }
  return result;
}

// ─── HTML 저장·읽기 ────────────────────────────────────

const ATTR_ESCAPES: Record<string, string> = { '&': '&amp;', '"': '&quot;', '<': '&lt;', '>': '&gt;' };
const ATTR_UNESCAPES: Record<string, string> = {
  quot: '"',
  '#34': '"',
  '#x22': '"',
  lt: '<',
  gt: '>',
  '#39': "'",
  apos: "'",
  amp: '&',
};

function escapeAttr(value: string): string {
  return value.replace(/[&"<>]/g, (char) => ATTR_ESCAPES[char]);
}

function unescapeAttr(value: string): string {
  return value.replace(/&(quot|#34|#x22|lt|gt|#39|apos|amp);/g, (_, entity: string) => ATTR_UNESCAPES[entity]);
}

export function parseStoryBlock(kind: unknown, data: unknown): StoryBlock | null {
  const result = storyBlockSchema.safeParse({ kind, data });
  return result.success ? result.data : null;
}

function parseEncodedBlock(kind: string, encoded: string): StoryBlock | null {
  try {
    return parseStoryBlock(kind, JSON.parse(unescapeAttr(encoded)));
  } catch {
    return null;
  }
}

export function serializeStoryBlock(block: StoryBlock): string {
  return `<div data-wn-block="${block.kind}" data-wn-data="${escapeAttr(JSON.stringify(block.data))}"></div>`;
}

const BLOCK_PATTERN = /<div data-wn-block="([a-z]+)" data-wn-data="([^"]*)"\s*><\/div>/g;

/** 저장 직전: 블록 데이터를 검증해 같은 형식으로 다시 쓰고, 형식이 틀린 블록은 지운다 */
export function normalizeStoryBlocks(html: string): string {
  return html.replace(BLOCK_PATTERN, (_match, kind: string, encoded: string) => {
    const block = parseEncodedBlock(kind, encoded);
    return block ? serializeStoryBlock(block) : '';
  });
}

export function hasStoryBlocks(html: string): boolean {
  return html.includes('data-wn-block=');
}

export type ContentSegment = { type: 'html'; html: string } | { type: 'block'; block: StoryBlock };

/** 열람 화면용: 본문 HTML을 일반 HTML 조각과 템플릿 블록으로 나눈다 */
export function splitStoryContent(html: string): ContentSegment[] {
  const segments: ContentSegment[] = [];
  let cursor = 0;
  for (const match of html.matchAll(BLOCK_PATTERN)) {
    const start = match.index ?? 0;
    if (start > cursor) segments.push({ type: 'html', html: html.slice(cursor, start) });
    const block = parseEncodedBlock(match[1], match[2]);
    if (block) segments.push({ type: 'block', block });
    cursor = start + match[0].length;
  }
  if (cursor < html.length) segments.push({ type: 'html', html: html.slice(cursor) });
  return segments;
}

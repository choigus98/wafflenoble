import { z } from 'zod';

// 본문 중간에 넣는 '이야기 속 화면' 템플릿 (카톡 1:1·단체방, 실시간 채팅창, 라이브 방송창, 후원 알림).
// 저장 형식: <div data-wn-block="종류" data-wn-data="JSON"></div>
// 에디터(Tiptap 노드), 서버(저장할 때 검증), 열람 화면(렌더링)이 모두 이 파일을 같이 쓴다.
//
// 대화형 템플릿은 '대본' 텍스트를 그대로 저장한다. 쓰는 사람은 평소 대사 쓰듯 적기만 하면 된다.
//   양띵: 수진아 뭐 해? [오후 8:14]   ← 이름: 대사, 줄 끝 [시간]
//   나: 방송 준비하고 있어요!          ← '나:'는 오른쪽 말풍선
//   네 ㅎㅎ 조금만 하려고요            ← 이름 없이 쓰면 앞사람의 다음 말풍선
//   --- 2026년 10월 5일 ---          ← 가운데 날짜·안내 표시

export const CHAT_COLOR_KEYS = ['blue', 'purple', 'green', 'yellow', 'pink', 'teal', 'orange'] as const;
export type ChatColor = (typeof CHAT_COLOR_KEYS)[number];

// 닉네임 색은 이 목록 안에서만 고른다 (임의의 CSS 값이 저장되지 않게).
// 실제 색은 globals.css의 --wn-nick-* 토큰이라 밝은/어두운 화면에서 각각 잘 보이는 색으로 바뀐다
export const CHAT_COLORS: Record<ChatColor, string> = {
  blue: 'var(--wn-nick-blue)',
  purple: 'var(--wn-nick-purple)',
  green: 'var(--wn-nick-green)',
  yellow: 'var(--wn-nick-yellow)',
  pink: 'var(--wn-nick-pink)',
  teal: 'var(--wn-nick-teal)',
  orange: 'var(--wn-nick-orange)',
};

export const LIMITS = { name: 15, script: 20000, lines: 500, colors: 50, message: 2000 } as const;

const text = (max: number) => z.string().max(max);

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

const kakaoSchema = z.object({
  mode: z.enum(['dm', 'group']),
  title: text(40), // 방 제목. 1:1은 비우면 상대 이름
  memberCount: text(10), // 단체방 '○명 참여 중'
  me: text(LIMITS.name), // 이 이름의 대사도 오른쪽 말풍선 ('나:'는 항상 오른쪽)
  script: text(LIMITS.script),
});

const chatSchema = z.object({
  title: text(60),
  badge: text(20),
  script: text(LIMITS.script),
  // 닉네임별로 직접 고른 색. 없으면 등장 순서대로 자동
  colors: z
    .record(text(LIMITS.name), z.enum(CHAT_COLOR_KEYS))
    .refine((value) => Object.keys(value).length <= LIMITS.colors),
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

// ─── 대본 읽기 ─────────────────────────────────────────

export type ScriptLine =
  | { type: 'notice'; text: string }
  | { type: 'message'; name: string; text: string; time: string };

// 15자 이내의 '이름:'만 이름으로 본다 (긴 문장 속 콜론은 대사로 취급)
const NAME_PREFIX = /^([^:：]{1,15}?)\s*[:：]\s*/;
const TIME_SUFFIX = /\s*[[(]((?:오전|오후)\s*\d{1,2}:\d{2}|\d{1,2}:\d{2})[\])]\s*$/;

export function parseScript(script: string): ScriptLine[] {
  const lines: ScriptLine[] = [];
  let speaker = '';
  for (const raw of script.split(/\r?\n/)) {
    if (lines.length >= LIMITS.lines) break;
    const line = raw.trim();
    if (!line) continue;

    if (/^-{2,}/.test(line)) {
      const notice = line.replace(/^-+\s*/, '').replace(/\s*-+$/, '');
      if (notice) lines.push({ type: 'notice', text: notice });
      continue;
    }

    let name = speaker;
    let body = line;
    const match = line.match(NAME_PREFIX);
    // '8:30에 보자'처럼 숫자로 시작하는 줄은 이름이 아니라 대사로 본다
    if (match && !/^\d+$/.test(match[1].trim())) {
      name = match[1].trim();
      body = line.slice(match[0].length);
    }
    if (!name) continue; // 첫 줄부터 이름이 없으면 누가 말하는지 알 수 없어서 건너뛴다
    speaker = name;

    let time = '';
    const timeMatch = body.match(TIME_SUFFIX);
    if (timeMatch && timeMatch.index !== undefined) {
      time = timeMatch[1];
      body = body.slice(0, timeMatch.index).trimEnd();
    }
    if (body) lines.push({ type: 'message', name, text: body, time });
  }
  return lines;
}

/** 대본에 나오는 이름 (처음 나온 순서) */
export function scriptSpeakers(lines: ScriptLine[]): string[] {
  const names: string[] = [];
  for (const line of lines) {
    if (line.type === 'message' && !names.includes(line.name)) names.push(line.name);
  }
  return names;
}

/** 대본에서 줄 앞의 '이름:'만 골라 바꾼다 (대사 안의 같은 글자는 그대로) */
export function renameSpeaker(script: string, from: string, to: string): string {
  if (!from || !to || from === to) return script;
  return script
    .split('\n')
    .map((line) => {
      const match = line.match(/^(\s*)([^:：]{1,15}?)(\s*[:：])/);
      return match && match[2].trim() === from ? `${match[1]}${to}${match[3]}${line.slice(match[0].length)}` : line;
    })
    .join('\n');
}

export function isMine(name: string, me: string): boolean {
  return name === '나' || (me.trim() !== '' && name === me.trim());
}

export function kakaoTitle(data: KakaoData, lines: ScriptLine[]): string {
  if (data.title.trim()) return data.title;
  if (data.mode === 'dm') return scriptSpeakers(lines).find((name) => !isMine(name, data.me)) ?? '대화';
  return '단체방';
}

export function chatColorKey(name: string, speakers: string[], colors: Record<string, ChatColor>): ChatColor {
  return colors[name] ?? CHAT_COLOR_KEYS[Math.max(0, speakers.indexOf(name)) % CHAT_COLOR_KEYS.length];
}

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

/** 새로 넣을 템플릿. 쓰는 법이 바로 보이도록 예시 대본을 채워 둔다 */
export function createTemplate(key: TemplateKey): StoryBlock {
  switch (key) {
    case 'kakao-dm':
      return {
        kind: 'kakao',
        data: {
          mode: 'dm',
          title: '',
          memberCount: '',
          me: '나',
          script: [`--- ${todayLabel()} ---`, '상대: 뭐 해? [오후 8:14]', '나: 방송 준비하고 있어요! [오후 8:15]'].join('\n'),
        },
      };
    case 'kakao-group':
      return {
        kind: 'kakao',
        data: {
          mode: 'group',
          title: '단체방',
          memberCount: '3',
          me: '나',
          script: [`--- ${todayLabel()} ---`, '친구1: 얘들아 내일 뭐 할까?', '친구2: 게임 하자!', '나: 저도 좋아요 [오후 7:21]'].join(
            '\n',
          ),
        },
      };
    case 'chat':
      return {
        kind: 'chat',
        data: { title: '방송인 채팅', badge: 'LIVE', colors: {}, script: ['시청자1: 방송 켰다!', '시청자2: 오늘 뭐 함?'].join('\n') },
      };
    case 'live':
      return {
        kind: 'live',
        data: { streamer: '방송인', badge: 'LIVE', title: '방송 제목', viewers: '1,024', category: '종합 게임' },
      };
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
  }
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

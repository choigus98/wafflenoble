import { z } from 'zod';

// 본문 중간에 넣는 '이야기 속 화면' 템플릿 (카톡 1:1·단체방, 실시간 채팅창, 라이브 방송창, 후원 알림, 커뮤니티 게시글, 시스템 창, 뉴스 기사, 전화 화면, 쪽지, SNS 게시물, 이메일, 검색 결과, 휴대폰 알림, 문자 메시지, 영수증, 위치 공유, 투표, 송금 완료, 알람, 일정, 아이템 획득, 음악 재생, 실시간 순위).
// 저장 형식: <div data-wn-block="종류" data-wn-data="JSON"></div>
// 에디터(Tiptap 노드), 서버(저장할 때 검증), 열람 화면(렌더링)이 모두 이 파일을 같이 쓴다.
//
// 대화형 템플릿은 '대본' 텍스트를 그대로 저장한다. 쓰는 사람은 평소 대사 쓰듯 적기만 하면 된다.
//   양띵: 수진아 뭐 해? [오후 8:14]   ← 이름: 대사, 줄 끝 [시간]
//   나: 방송 준비하고 있어요!          ← '나:'는 오른쪽 말풍선
//   네 ㅎㅎ 조금만 하려고요            ← 이름 없이 쓰면 앞사람의 다음 말풍선
//   --- 2026년 10월 5일 ---          ← 가운데 날짜·안내 표시
//
// 커뮤니티 게시글의 댓글도 대본으로 쓴다 (규칙은 parseComments 위 설명)

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

export const LIMITS = { name: 15, script: 20000, lines: 500, colors: 50, message: 2000, body: 5000 } as const;

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

const postSchema = z.object({
  board: text(40), // 게시판 이름. 비우면 안 보임
  title: text(120),
  author: text(LIMITS.name), // 글쓴이. 댓글에 같은 이름(또는 '글쓴이:')이 나오면 '글쓴이' 표시
  date: text(40), // 쓴 시각. 적은 그대로 보여 줌
  views: text(20), // 조회 수. 비우면 안 보임
  likes: text(20), // 추천 수. 비우면 안 보임
  commentCount: text(10), // 댓글 수. 비우면 아래 댓글 개수
  body: text(LIMITS.body),
  script: text(LIMITS.script), // 댓글 대본
});

const systemSchema = z.object({
  title: text(60), // [퀘스트 발생!]처럼 대괄호 안에 보임. 비우면 제목 줄 없음
  script: text(LIMITS.script), // 능력치·안내 대본 (규칙은 parseSystemScript 위 설명)
});

const newsSchema = z.object({
  press: text(40), // 언론사
  title: text(120),
  subtitle: text(160), // 부제. 비우면 안 보임
  reporter: text(40), // '○○○ 기자'처럼 적은 그대로
  date: text(40),
  body: text(LIMITS.body), // 빈 줄로 문단을 나눈다
});

const callSchema = z.object({
  mode: z.enum(['incoming', 'active']), // 걸려 오는 전화 / 통화 중
  name: text(40),
  detail: text(40), // 걸려 오는 전화: '휴대전화' 같은 번호 종류, 통화 중: '03:12' 같은 통화 시간
});

const noteSchema = z.object({
  to: text(40), // 받는 사람. 비우면 안 보임
  body: text(LIMITS.message), // 줄바꿈 그대로
  from: text(40), // 보낸 사람. 비우면 안 보임
});

const snsSchema = z.object({
  name: text(40), // 표시 이름
  handle: text(40), // 아이디. '@'는 없어도 붙여서 보여 줌
  body: text(LIMITS.message),
  date: text(40), // 적은 그대로
  replies: text(20), // 답글 수. 비우면 아래 답글 개수
  reposts: text(20), // 비우면 안 보임
  likes: text(20), // 비우면 안 보임
  script: text(LIMITS.script), // 답글 대본 (커뮤니티 댓글과 같은 규칙)
});

const mailSchema = z.object({
  subject: text(120), // 메일 제목
  from: text(80), // 보낸 사람. '이름 <주소>'로 적으면 이름과 주소를 나눠 보여 줌
  to: text(80), // 받는 사람. 비우면 안 보임
  date: text(40), // 적은 그대로
  body: text(LIMITS.body), // 빈 줄로 문단을 나눈다
  attachment: text(80), // 첨부 파일 이름. 비우면 안 보임
});

const searchSchema = z.object({
  engine: text(40), // 검색 사이트 이름. 비우면 안 보임
  query: text(100), // 검색어
  count: text(40), // '검색 결과 약 1,230개'처럼 적은 그대로. 비우면 안 보임
  script: text(LIMITS.script), // 결과 대본 (규칙은 parseSearchResults 위 설명)
});

const pushSchema = z.object({
  time: text(20), // 잠금화면 큰 시계 '23:58'. 비우면 안 보임
  date: text(40), // '11월 12일 목요일'. 비우면 안 보임
  script: text(LIMITS.script), // 알림 대본 (규칙은 parsePushScript 위 설명)
});

const smsSchema = z.object({
  contact: text(40), // 위쪽에 보일 상대 이름이나 번호. 비우면 대본의 첫 상대 이름
  me: text(LIMITS.name), // 이 이름의 말도 오른쪽(파란) 말풍선 ('나:'는 항상 오른쪽)
  script: text(LIMITS.script), // 카톡과 같은 대본 규칙 (parseScript)
});

const receiptSchema = z.object({
  store: text(40), // 가게 이름
  info: text(120), // 가게 정보 (주소·영업시간 등). 비우면 안 보임
  date: text(40), // 적은 그대로
  script: text(LIMITS.script), // 품목 대본 (규칙은 parseReceiptScript 위 설명)
  total: text(40), // 합계. 비우면 품목 금액을 더해서 (단위가 섞이면 안 보임)
  footer: text(120), // 맨 아래 한 줄. 비우면 안 보임
});

const locationSchema = z.object({
  badge: text(40), // 위쪽 작은 표시 ('위치 공유', '실시간 위치 · 15분 남음'). 비우면 안 보임
  place: text(60), // 장소 이름
  address: text(120), // 주소. 비우면 안 보임
  note: text(120), // 한 줄 메모 ('여기서 기다릴게'). 비우면 안 보임
});

const pollSchema = z.object({
  badge: text(40), // 위쪽 작은 표시 ('익명 투표 · 오늘 자정 마감'). 비우면 안 보임
  question: text(120), // 질문
  script: text(LIMITS.script), // 선택지 대본 (규칙은 parsePollScript 위 설명)
  status: text(60), // 맨 아래 한 줄. 비우면 표 수를 더해서 'N명 참여' (표 수가 없으면 안 보임)
});

const transferSchema = z.object({
  bank: text(30), // 위쪽 은행·앱 이름 ('와플뱅크'). 비우면 안 보임
  status: text(30), // 완료 문구 ('송금 완료', '이체 완료')
  amount: text(30), // 금액 (적은 그대로 '50,000원')
  to: text(40), // 받는 분
  from: text(60), // 보낸 계좌. 비우면 안 보임
  memo: text(60), // 메모. 비우면 안 보임
  date: text(40), // 일시. 비우면 안 보임
});

const alarmSchema = z.object({
  date: text(40), // 위쪽 날짜 ('11월 13일 목요일'). 비우면 안 보임
  period: text(10), // '오전'·'오후'. 비우면 안 보임 (24시간제로 '06:30'처럼 쓸 때)
  time: text(10), // 큰 시각 ('6:30')
  label: text(40), // 알람 이름. 비우면 안 보임
  days: text(40), // 반복 요일 ('월 화 수 목 금', '매일', '평일', '주말'). 비우면 안 보임 (규칙은 alarmDays 위 설명)
});

const eventSchema = z.object({
  calendar: text(30), // 위쪽 캘린더 이름 ('가게 일정'). 비우면 안 보임
  date: text(40), // '11월 14일 토요일'. 날짜로 읽히면 왼쪽 날짜 타일로 (eventDateParts)
  time: text(40), // '오후 2:00 – 4:00', '하루 종일'. 비우면 안 보임
  title: text(80), // 일정 제목
  place: text(80), // 장소. 비우면 안 보임
  alert: text(40), // 알림 ('30분 전'). 비우면 안 보임
  note: text(200), // 메모. 비우면 안 보임
});

const musicSchema = z.object({
  app: text(30), // 위쪽 작은 문구 ('지금 재생 중', 앱 이름). 비우면 안 보임
  title: text(80), // 곡 제목
  artist: text(60), // 가수 (앨범까지 '시럽 밴드 · 첫 앨범'처럼 적어도 됨)
  elapsed: text(10), // 재생 위치 ('1:24'). 비우면 0:00
  duration: text(10), // 전체 길이 ('3:45'). 시각으로 읽히면 재생 막대를 그 비율만큼 (musicProgress). 둘 다 비우면 막대·시간 없음
  lyric: text(200), // 가사 (여러 줄 가능). 비우면 안 보임
});

const rankSchema = z.object({
  title: text(60), // 순위표 제목 ('실시간 후원 랭킹', '이번 주 음원 차트')
  badge: text(40), // 제목 옆 작은 표시 ('LIVE', '11월 13일 02:00 기준'). 비우면 안 보임
  script: text(LIMITS.script), // 순위 대본 (규칙은 parseRankScript 위 설명)
});

const itemSchema = z.object({
  title: text(40), // 위쪽 알림 문구 ('아이템을 획득했습니다!'). 비우면 안 보임
  name: text(60), // 아이템 이름
  grade: text(20), // 등급 ('전설'). 이름으로 색을 고른다 (itemGradeKey). 비우면 안 보임
  category: text(40), // 분류 ('무기 · 한손검'). 비우면 안 보임
  script: text(LIMITS.script), // 능력치·설명 대본 (시스템 창과 같은 규칙, parseSystemScript)
});

/** 전화 화면 모드를 바꿀 때, 아직 고치지 않은 기본 문구는 새 모드에 맞게 바꿔 준다 */
export const CALL_DETAIL_DEFAULT = { incoming: '휴대전화', active: '00:12' } as const;

// 새 종류는 끝에 덧붙이기만 한다 (이미 저장된 블록은 그대로 읽혀야 하므로 기존 종류·필드는 바꾸지 않는다)
export const storyBlockSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('live'), data: liveSchema }),
  z.object({ kind: z.literal('chat'), data: chatSchema }),
  z.object({ kind: z.literal('donation'), data: donationSchema }),
  z.object({ kind: z.literal('kakao'), data: kakaoSchema }),
  z.object({ kind: z.literal('post'), data: postSchema }),
  z.object({ kind: z.literal('system'), data: systemSchema }),
  z.object({ kind: z.literal('news'), data: newsSchema }),
  z.object({ kind: z.literal('call'), data: callSchema }),
  z.object({ kind: z.literal('note'), data: noteSchema }),
  z.object({ kind: z.literal('sns'), data: snsSchema }),
  z.object({ kind: z.literal('mail'), data: mailSchema }),
  z.object({ kind: z.literal('search'), data: searchSchema }),
  z.object({ kind: z.literal('push'), data: pushSchema }),
  z.object({ kind: z.literal('sms'), data: smsSchema }),
  z.object({ kind: z.literal('receipt'), data: receiptSchema }),
  z.object({ kind: z.literal('location'), data: locationSchema }),
  z.object({ kind: z.literal('poll'), data: pollSchema }),
  z.object({ kind: z.literal('transfer'), data: transferSchema }),
  z.object({ kind: z.literal('alarm'), data: alarmSchema }),
  z.object({ kind: z.literal('event'), data: eventSchema }),
  z.object({ kind: z.literal('item'), data: itemSchema }),
  z.object({ kind: z.literal('music'), data: musicSchema }),
  z.object({ kind: z.literal('rank'), data: rankSchema }),
]);

export type StoryBlock = z.infer<typeof storyBlockSchema>;
export type LiveData = z.infer<typeof liveSchema>;
export type DonationData = z.infer<typeof donationSchema>;
export type ChatData = z.infer<typeof chatSchema>;
export type KakaoData = z.infer<typeof kakaoSchema>;
export type PostData = z.infer<typeof postSchema>;
export type SystemData = z.infer<typeof systemSchema>;
export type NewsData = z.infer<typeof newsSchema>;
export type CallData = z.infer<typeof callSchema>;
export type NoteData = z.infer<typeof noteSchema>;
export type SnsData = z.infer<typeof snsSchema>;
export type MailData = z.infer<typeof mailSchema>;
export type SearchData = z.infer<typeof searchSchema>;
export type PushData = z.infer<typeof pushSchema>;
export type SmsData = z.infer<typeof smsSchema>;
export type ReceiptData = z.infer<typeof receiptSchema>;
export type LocationData = z.infer<typeof locationSchema>;
export type PollData = z.infer<typeof pollSchema>;
export type TransferData = z.infer<typeof transferSchema>;
export type AlarmData = z.infer<typeof alarmSchema>;
export type EventData = z.infer<typeof eventSchema>;
export type ItemData = z.infer<typeof itemSchema>;
export type MusicData = z.infer<typeof musicSchema>;
export type RankData = z.infer<typeof rankSchema>;

/** 메일 보낸 사람 '김지은 <jieun@example.com>' → 이름과 주소. 꺾쇠가 없으면 적은 그대로 이름으로 */
export function splitMailSender(from: string): { name: string; address: string } {
  const value = from.trim();
  const match = value.match(/^(.*?)\s*<([^<>]*)>$/);
  if (!match) return { name: value, address: '' };
  const name = match[1].trim();
  const address = match[2].trim();
  return name ? { name, address } : { name: address, address: '' };
}

// ─── 대본 읽기 ─────────────────────────────────────────

export type ScriptLine =
  | { type: 'notice'; text: string }
  | { type: 'message'; name: string; text: string; time: string };

// 15자 이내의 '이름:'만 이름으로 본다 (긴 문장 속 콜론은 대사로 취급)
const NAME_PREFIX = /^([^:：]{1,15}?)\s*[:：]\s*/;
const TIME_SUFFIX = /\s*[[(]((?:오전|오후)\s*\d{1,2}:\d{2}|\d{1,2}:\d{2})[\])]\s*$/;

/** 줄 앞의 '이름:'을 떼어 낸다. '8:30에 보자'처럼 숫자로 시작하는 줄은 이름이 아니라 대사로 본다 */
function splitName(line: string): { name: string; body: string } | null {
  const match = line.match(NAME_PREFIX);
  if (!match || /^\d+$/.test(match[1].trim())) return null;
  return { name: match[1].trim(), body: line.slice(match[0].length) };
}

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

    const named = splitName(line);
    const name = named?.name ?? speaker;
    let body = named?.body ?? line;
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

/**
 * 대본에서 줄 앞의 '이름:'만 골라 바꾼다 (대사 안의 같은 글자는 그대로).
 * replies: 댓글 대본처럼 'ㄴ 이름:' 답글 줄의 이름도 바꾼다
 */
export function renameSpeaker(script: string, from: string, to: string, options: { replies?: boolean } = {}): string {
  if (!from || !to || from === to) return script;
  const pattern = options.replies ? /^(\s*(?:ㄴ\s+|[└↳]\s*)?)([^:：]{1,15}?)(\s*[:：])/ : /^(\s*)([^:：]{1,15}?)(\s*[:：])/;
  return script
    .split('\n')
    .map((line) => {
      const match = line.match(pattern);
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

/** 문자 메시지 위쪽 이름: 직접 적은 값, 없으면 대본에서 내가 아닌 첫 사람 */
export function smsContact(data: SmsData, lines: ScriptLine[]): string {
  if (data.contact.trim()) return data.contact.trim();
  return scriptSpeakers(lines).find((name) => !isMine(name, data.me)) ?? '문자';
}

export function chatColorKey(name: string, speakers: string[], colors: Record<string, ChatColor>): ChatColor {
  return colors[name] ?? CHAT_COLOR_KEYS[Math.max(0, speakers.indexOf(name)) % CHAT_COLOR_KEYS.length];
}

// ─── 커뮤니티 댓글 대본 ────────────────────────────────
//   익명1: 와 이거 진짜임? [20:31]     ← 닉네임: 댓글, 줄 끝 [시간] (20:31 · 11.12 20:31 · 3분 전 · 방금)
//   ㄴ 글쓴이: ㅇㅇ 방금 봄            ← 앞에 'ㄴ '을 붙이면 답글. '글쓴이:'는 글쓴이 닉네임으로 보인다
//   둘째 줄                           ← 이름 없이 쓰면 앞 댓글에 줄을 바꿔 이어서
//   --- 삭제된 댓글입니다 ---          ← 이름 없는 회색 줄

export type CommentLine =
  | { type: 'notice'; text: string; reply: boolean }
  | { type: 'comment'; name: string; text: string; time: string; reply: boolean };

// 'ㄴ'은 뒤에 띄어쓰기가 있을 때만 답글 표시로 본다 ('ㄴㅇㄱ' 같은 닉네임이나 'ㄴㄴ 아님' 같은 말과 헷갈리지 않게)
const REPLY_PREFIX = /^(?:ㄴ\s+|[└↳]\s*)/;
// 댓글 시간은 대괄호만 쓴다 ('평점 (4.5)'처럼 괄호로 끝나는 댓글이 시간으로 바뀌지 않게)
const COMMENT_TIME_SUFFIX = /\s*\[([^[\]]{1,24})\]\s*$/;
const COMMENT_TIME =
  /^(?:(?:\d{2,4}[./-])?\d{1,2}[./-]\d{1,2}\.?(?:\s+(?:(?:오전|오후)\s*)?\d{1,2}:\d{2})?|(?:(?:오전|오후)\s*)?\d{1,2}:\d{2}(?::\d{2})?|\d+\s*(?:초|분|시간|일|주|달|개월|년)\s*전|방금(?:\s*전)?|어제(?:\s+\d{1,2}:\d{2})?)$/;

function splitCommentTime(body: string): { text: string; time: string } {
  const match = body.match(COMMENT_TIME_SUFFIX);
  if (!match || match.index === undefined || !COMMENT_TIME.test(match[1].trim())) return { text: body, time: '' };
  return { text: body.slice(0, match.index).trimEnd(), time: match[1].trim() };
}

export function parseComments(script: string): CommentLine[] {
  const lines: CommentLine[] = [];
  for (const raw of script.split(/\r?\n/)) {
    if (lines.length >= LIMITS.lines) break;
    let line = raw.trim();
    if (!line) continue;

    // 답글 표시는 뒤에 '이름:'이나 '---'가 올 때만 답글로 본다
    let reply = false;
    const replyMatch = line.match(REPLY_PREFIX);
    if (replyMatch) {
      const rest = line.slice(replyMatch[0].length);
      if (/^-{2,}/.test(rest) || splitName(rest)) {
        reply = true;
        line = rest;
      }
    }

    if (/^-{2,}/.test(line)) {
      const notice = line.replace(/^-+\s*/, '').replace(/\s*-+$/, '');
      if (notice) lines.push({ type: 'notice', text: notice, reply });
      continue;
    }

    const named = splitName(line);
    if (!named) {
      // 이름 없는 줄은 앞 댓글에 줄을 바꿔 잇는다 (첫 줄부터 이름이 없으면 누가 쓴 건지 몰라서 건너뛴다)
      const previous = lines.at(-1);
      if (previous?.type !== 'comment') continue;
      const { text, time } = splitCommentTime(line);
      if (text) previous.text = previous.text ? `${previous.text}\n${text}` : text;
      if (time && !previous.time) previous.time = time;
      continue;
    }

    const { text, time } = splitCommentTime(named.body);
    if (text || time) lines.push({ type: 'comment', name: named.name, text, time, reply });
  }
  return lines;
}

/** 댓글을 쓴 사람 (처음 나온 순서) */
export function commentSpeakers(lines: CommentLine[]): string[] {
  const names: string[] = [];
  for (const line of lines) {
    if (line.type === 'comment' && !names.includes(line.name)) names.push(line.name);
  }
  return names;
}

export function isPostAuthor(name: string, author: string): boolean {
  return name === '글쓴이' || (author.trim() !== '' && name === author.trim());
}

/** '글쓴이:'로 쓴 댓글은 글쓴이 닉네임으로 보여 준다 */
export function commentDisplayName(name: string, author: string): string {
  return name === '글쓴이' && author.trim() ? author.trim() : name;
}

// ─── 시스템 창 대본 ────────────────────────────────────
//   힘: 15                       ← 이름: 값 → 능력치 줄 (이름 왼쪽, 값 오른쪽)
//   「잃어버린 기억을 찾아라」       ← 「」『』[]로 감싼 줄 → 가운데 굵게
//   --- 보상 ---                 ← 구분선 (가운데 글자는 없어도 됨)
//   기억이 하나 사라집니다.          ← 나머지 → 안내 문장

export type SystemLine =
  | { type: 'stat'; label: string; value: string }
  | { type: 'emphasis'; text: string }
  | { type: 'divider'; text: string }
  | { type: 'text'; text: string };

const EMPHASIS_LINE = /^(?:「[^」]*」|『[^』]*』|\[[^\]]*\])$/;

export function parseSystemScript(script: string): SystemLine[] {
  const lines: SystemLine[] = [];
  for (const raw of script.split(/\r?\n/)) {
    if (lines.length >= LIMITS.lines) break;
    const line = raw.trim();
    if (!line) continue;
    if (/^-{2,}/.test(line)) {
      lines.push({ type: 'divider', text: line.replace(/^-+\s*/, '').replace(/\s*-+$/, '') });
      continue;
    }
    if (EMPHASIS_LINE.test(line)) {
      lines.push({ type: 'emphasis', text: line });
      continue;
    }
    const named = splitName(line);
    if (named && named.body.trim()) {
      lines.push({ type: 'stat', label: named.name, value: named.body.trim() });
      continue;
    }
    lines.push({ type: 'text', text: line });
  }
  return lines;
}

// ─── 검색 결과 대본 ───────────────────────────────────
// 빈 줄로 결과를 나눈다. 결과마다
//   자정에만 여는 와플 가게 후기        ← 첫 줄: 제목 ([광고]로 시작하면 광고 표시)
//   waffle.example.com/review         ← 둘째 줄이 주소처럼 보이면 주소 ('example.com › 후기'도 됨)
//   골목 끝 그 가게, 가 보신 분?        ← 나머지 줄: 요약 (줄바꿈 그대로)

export type SearchResult = { title: string; url: string; snippet: string; ad: boolean };

const AD_PREFIX = /^\[광고\]\s*/;
// 마지막 조각(.com, .kr …)은 글자로 시작해야 주소로 본다 ('1.5', 'v1.2' 같은 숫자 줄은 요약)
const URL_LINE = /^(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z][a-z0-9-]*(?:[/:?#]\S*)?(?:\s+›.*)?$/i;

export function parseSearchResults(script: string): SearchResult[] {
  const results: SearchResult[] = [];
  for (const chunk of script.split(/\r?\n\s*\r?\n/)) {
    if (results.length >= LIMITS.lines) break;
    const lines = chunk.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (lines.length === 0) continue;
    const [first, ...rest] = lines;
    const ad = AD_PREFIX.test(first);
    const title = first.replace(AD_PREFIX, '');
    const hasUrl = rest.length > 0 && URL_LINE.test(rest[0]);
    results.push({ title, url: hasUrl ? rest[0] : '', snippet: (hasUrl ? rest.slice(1) : rest).join('\n'), ad });
  }
  return results;
}

// ─── 휴대폰 알림 대본 ──────────────────────────────────
// 알림 하나에 한 줄
//   카톡 · 엄마: 어디야? 늦었는데 [방금]    ← '앱 · 보낸 사람: 내용', 줄 끝 [시각]
//   은행: 입금 10,000원 [3분 전]           ← 보낸 사람 없이 '앱: 내용'
//   조심히 와                             ← 이름 없이 쓰면 앞 알림 내용에 줄바꿈
//   --- 알림 2개 더 ---                    ← 가운데 작은 글

export type PushLine = { type: 'push'; app: string; title: string; body: string; time: string } | { type: 'notice'; text: string };

// '앱 · 보낸 사람'은 30자까지. '8:30에 보자'처럼 숫자로 시작하는 줄은 이름이 아니라 내용
const PUSH_HEAD = /^([^:：]{1,30}?)\s*[:：]\s*/;

export function parsePushScript(script: string): PushLine[] {
  const lines: PushLine[] = [];
  for (const raw of script.split(/\r?\n/)) {
    if (lines.length >= LIMITS.lines) break;
    const line = raw.trim();
    if (!line) continue;
    if (/^-{2,}/.test(line)) {
      const text = line.replace(/^-+\s*/, '').replace(/\s*-+$/, '');
      if (text) lines.push({ type: 'notice', text });
      continue;
    }
    const head = line.match(PUSH_HEAD);
    if (head && !/^[\d\s]+$/.test(head[1])) {
      const [app, ...rest] = head[1].split(/\s*·\s*/);
      const { text, time } = splitCommentTime(line.slice(head[0].length));
      lines.push({ type: 'push', app: app.trim(), title: rest.join(' · ').trim(), body: text, time });
      continue;
    }
    const { text, time } = splitCommentTime(line);
    const last = lines.at(-1);
    if (last?.type === 'push') {
      last.body = last.body ? `${last.body}\n${text}` : text;
      if (!last.time) last.time = time;
    } else {
      lines.push({ type: 'push', app: '', title: '', body: text, time });
    }
  }
  return lines;
}

// ─── 영수증 대본 ──────────────────────────────────────
// 품목 하나에 한 줄
//   버터 와플 ×2: 7,000원     ← '이름: 금액', 이름 끝의 ×2·x2는 수량 (금액은 그 줄의 합)
//   쿠폰 할인: -1,000원       ← 빼는 금액도 됨
//   ---                      ← 구분선
//   포장 주문                 ← 쌍점 없이 쓰면 작은 안내 글
// 이름에 쌍점이 있어도 되게 마지막 쌍점에서 나눈다

export type ReceiptLine =
  | { type: 'item'; name: string; qty: string; price: string; amount: number | null; unit: string }
  | { type: 'note'; text: string }
  | { type: 'divider' };

const RECEIPT_QTY = /\s*[×xX]\s*(\d{1,4})$/;
const RECEIPT_PRICE = /^([-−]?)\s*(\d[\d,]*(?:\.\d+)?)\s*(.*)$/;

export function parseReceiptScript(script: string): ReceiptLine[] {
  const lines: ReceiptLine[] = [];
  for (const raw of script.split(/\r?\n/)) {
    if (lines.length >= LIMITS.lines) break;
    const line = raw.trim();
    if (!line) continue;
    if (/^-{2,}$/.test(line)) {
      lines.push({ type: 'divider' });
      continue;
    }
    const colon = Math.max(line.lastIndexOf(':'), line.lastIndexOf('：'));
    if (colon <= 0) {
      lines.push({ type: 'note', text: line });
      continue;
    }
    let name = line.slice(0, colon).trim();
    const price = line.slice(colon + 1).trim();
    const qtyMatch = name.match(RECEIPT_QTY);
    const qty = qtyMatch ? qtyMatch[1] : '';
    if (qtyMatch) name = name.slice(0, qtyMatch.index).trim();
    const priceMatch = price.match(RECEIPT_PRICE);
    const amount = priceMatch ? (priceMatch[1] ? -1 : 1) * Number(priceMatch[2].replace(/,/g, '')) : null;
    lines.push({ type: 'item', name, qty, price, amount: Number.isFinite(amount) ? amount : null, unit: priceMatch?.[3].trim() ?? '' });
  }
  return lines;
}

/** 합계: 직접 적은 값이 먼저, 없으면 품목 금액을 더해서 (금액을 못 읽은 품목이 있거나 단위가 섞이면 빈 값) */
export function receiptTotal(data: ReceiptData, lines: ReceiptLine[]): string {
  if (data.total.trim()) return data.total.trim();
  const items = lines.filter((line): line is Extract<ReceiptLine, { type: 'item' }> => line.type === 'item');
  if (items.length === 0 || items.some((item) => item.amount === null)) return '';
  const units = [...new Set(items.map((item) => item.unit).filter(Boolean))];
  if (units.length > 1) return '';
  const sum = items.reduce((total, item) => total + (item.amount ?? 0), 0);
  return `${sum.toLocaleString('ko-KR', { maximumFractionDigits: 2 })}${units[0] ?? ''}`;
}

// ─── 투표 대본 ──────────────────────────────────────
// 선택지 하나에 한 줄
//   떡볶이: 12            ← '선택지: 표 수'. 숫자만 쓰면 '12표', 단위를 붙이면 그대로 ('12명')
//   * 치킨: 7             ← 앞에 *를 붙이면 내가 고른 선택지 (체크 표시)
//   라면                  ← 표 수 없이 쓰면 0표. 모든 줄을 이렇게 쓰면 '투표 전' 모양 (막대·표 수 없이)
// 선택지 이름에 쌍점이 있어도 되게 마지막 쌍점에서 나누고, 쌍점 뒤가 숫자가 아니면 줄 전체가 이름

export type PollOption = { text: string; votes: number | null; label: string; mine: boolean };

const POLL_MINE = /^[*＊]\s*/;
const POLL_VOTES = /^(\d[\d,]*)\s*([^\d\s,][^\d]{0,5})?$/;

export function parsePollScript(script: string): PollOption[] {
  const options: PollOption[] = [];
  for (const raw of script.split(/\r?\n/)) {
    if (options.length >= LIMITS.lines) break;
    let line = raw.trim();
    if (!line) continue;
    const mine = POLL_MINE.test(line);
    if (mine) line = line.replace(POLL_MINE, '').trim();
    if (!line) continue;
    const colon = Math.max(line.lastIndexOf(':'), line.lastIndexOf('：'));
    const match = colon > 0 ? line.slice(colon + 1).trim().match(POLL_VOTES) : null;
    if (!match) {
      options.push({ text: line, votes: null, label: '', mine });
      continue;
    }
    const votes = Number(match[1].replace(/,/g, ''));
    options.push({
      text: line.slice(0, colon).trim(),
      votes: Number.isFinite(votes) ? votes : null,
      label: `${match[1]}${match[2]?.trim() || '표'}`,
      mine,
    });
  }
  // 표 수를 안 쓴 선택지는 0표로 (다른 선택지와 같은 단위)
  const unit = options.find((option) => option.votes !== null)?.label.replace(/^[\d,]+/, '');
  if (unit !== undefined) {
    for (const option of options) {
      if (option.votes === null) Object.assign(option, { votes: 0, label: `0${unit}` });
    }
  }
  return options;
}

/** 표 수 합 (투표 전이면 0) */
export function pollTotal(options: PollOption[]): number {
  return options.reduce((sum, option) => sum + (option.votes ?? 0), 0);
}

/** 선택지 하나의 비율(%), 반올림 */
export function pollPercent(option: PollOption, total: number): number {
  return total > 0 && option.votes !== null ? Math.round((option.votes / total) * 100) : 0;
}

/** 보이는 비율 글자. 표가 있는데 반올림하면 0%인 선택지는 '<1%' (아무도 안 고른 것처럼 보이지 않게) */
export function pollPercentLabel(option: PollOption, total: number): string {
  const percent = pollPercent(option, total);
  return percent === 0 && (option.votes ?? 0) > 0 ? '<1%' : `${percent}%`;
}

/** 맨 아래 한 줄: 직접 적은 값이 먼저, 없으면 표 수를 더해서 'N명 참여' (투표 전이면 빈 값) */
export function pollStatus(data: PollData, options: PollOption[]): string {
  if (data.status.trim()) return data.status.trim();
  if (!options.some((option) => option.votes !== null)) return '';
  return `${pollTotal(options).toLocaleString('ko-KR')}명 참여`;
}

// ─── 알람 반복 요일 ──────────────────────────────────────
// '월 화 수 목 금'·'월, 수, 금'·'월요일 금요일'처럼 요일을 띄어 쓰면 일~토 일곱 글자 줄에서 그 요일을 칠한다.
// '매일'·'평일'·'주말'도 됨. 요일이 아닌 말이 섞이면('격주 월요일') 적은 그대로 글로 보여 준다

export const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;

/** 칠할 요일(일~토 7칸)과 화면 낭독기용 글. 요일로 못 읽으면 null */
export function alarmDays(text: string): { days: boolean[]; spoken: string } | null {
  const tokens = text.split(/[\s,·、/]+/).filter(Boolean);
  if (tokens.length === 0) return null;
  const days = WEEKDAYS.map(() => false);
  for (const token of tokens) {
    if (token === '매일') days.fill(true);
    else if (token === '평일') for (let day = 1; day <= 5; day += 1) days[day] = true;
    else if (token === '주말') days[0] = days[6] = true;
    else {
      const name = token.endsWith('요일') ? token.slice(0, -2) : token;
      const index = WEEKDAYS.indexOf(name as (typeof WEEKDAYS)[number]);
      if (index === -1) return null;
      days[index] = true;
    }
  }
  const spoken = days.every(Boolean) ? '매일' : WEEKDAYS.filter((_, day) => days[day]).join(', ');
  return { days, spoken };
}

// ─── 일정 날짜 타일 ──────────────────────────────────────
// '11월 14일 토요일'·'2026년 11월 14일 (토)'처럼 적으면 왼쪽에 달 · 큰 날 · 요일 타일. 날짜로 못 읽으면('내일') 글 그대로
const EVENT_DATE = /(\d{1,2})\s*월\s*(\d{1,2})\s*일(?:\s*\(?\s*([일월화수목금토])(?:요일)?\s*\)?)?/;

export function eventDateParts(text: string): { month: string; day: string; weekday: string } | null {
  const match = text.match(EVENT_DATE);
  if (!match) return null;
  const month = Number(match[1]);
  const day = Number(match[2]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { month: String(month), day: String(day), weekday: match[3] ?? '' };
}

// ─── 아이템 등급 색 ──────────────────────────────────────
// 등급 이름에 아래 말이 들어 있으면 그 색 ('SSS급 전설' → 전설). 모르는 이름이면 일반 색, 글자는 적은 그대로 보인다

export type ItemGrade = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';

const ITEM_GRADE_WORDS: Array<[ItemGrade, string[]]> = [
  ['mythic', ['신화', '태초', '초월', 'mythic']],
  ['legendary', ['전설', '레전드', 'legend']],
  ['epic', ['영웅', '에픽', '유니크', 'epic', 'unique']],
  ['rare', ['희귀', '레어', 'rare']],
  ['uncommon', ['고급', '언커먼', '매직', 'uncommon', 'magic']],
  ['common', ['일반', '노멀', '커먼', 'common', 'normal']],
];

export function itemGradeKey(grade: string): ItemGrade {
  const text = grade.toLowerCase();
  return ITEM_GRADE_WORDS.find(([, words]) => words.some((word) => text.includes(word)))?.[0] ?? 'common';
}

// ─── 실시간 순위 대본 ──────────────────────────────────────
// 한 줄에 한 자리. 순위는 위에서부터 1, 2, 3 … (앞에 '15.'·'15위'처럼 쓰면 그 순위부터 이어서, 같은 순위도 됨)
//   밥알: 1,250,000원 ▲2     ← '이름: 점수', 줄 끝에 오르내림 (▲2 · ▼1 · NEW · -)
//   * 15. 와플집 딸: 1,024   ← 앞에 *를 붙이면 강조 (주인공 자리)
//   ---                       ← 중간 생략 (⋯)
//   감자도리                   ← 점수 없이 이름만
// 이름에 쌍점이 있어도 되게 마지막 쌍점에서 나눈다

export type RankChange = { dir: 'up' | 'down'; amount: number } | { dir: 'new' } | { dir: 'same' } | null;
export type RankLine = { type: 'row'; rank: number; name: string; score: string; change: RankChange; mine: boolean } | { type: 'gap' };

const RANK_MINE = /^[*＊]\s*/;
const RANK_NUMBER = /^(\d{1,4})\s*(?:[.)]|위)\s*/;
const RANK_CHANGE = /(?:\s*(?:(▲|↑)\s*(\d+)|(▼|↓)\s*(\d+))|\s+(NEW|New|new|신규)|\s+(-|–|—))$/;
const RANK_GAP = /^(?:-{3,}|\.{3,}|…+|⋯+)$/;

export function parseRankScript(script: string): RankLine[] {
  const lines: RankLine[] = [];
  let next = 1;
  for (const raw of script.split(/\r?\n/)) {
    if (lines.length >= LIMITS.lines) break;
    let line = raw.trim();
    if (!line) continue;
    if (RANK_GAP.test(line)) {
      lines.push({ type: 'gap' });
      continue;
    }
    const mine = RANK_MINE.test(line);
    if (mine) line = line.replace(RANK_MINE, '').trim();
    const numbered = line.match(RANK_NUMBER);
    if (numbered && numbered[0].length < line.length) {
      next = Number(numbered[1]);
      line = line.slice(numbered[0].length).trim();
    }
    let change: RankChange = null;
    const moved = line.match(RANK_CHANGE);
    if (moved && moved.index !== undefined && moved.index > 0) {
      change = moved[2] ? { dir: 'up', amount: Number(moved[2]) } : moved[4] ? { dir: 'down', amount: Number(moved[4]) } : moved[5] ? { dir: 'new' } : { dir: 'same' };
      line = line.slice(0, moved.index).trim();
    }
    const colon = Math.max(line.lastIndexOf(':'), line.lastIndexOf('：'));
    const name = (colon > 0 ? line.slice(0, colon) : line).trim();
    if (!name) continue;
    lines.push({ type: 'row', rank: next, name, score: colon > 0 ? line.slice(colon + 1).trim() : '', change, mine });
    next += 1;
  }
  return lines;
}

/** 오르내림 글자 ('▲2', '▼1', 'NEW', '-'). 없으면 빈 글 */
export function rankChangeText(change: RankChange): string {
  if (!change) return '';
  return change.dir === 'up' ? `▲${change.amount}` : change.dir === 'down' ? `▼${change.amount}` : change.dir === 'new' ? 'NEW' : '-';
}

/** 낭독기용 오르내림 ('2계단 오름', '새로 들어옴') */
export function rankChangeSpoken(change: RankChange): string {
  if (!change) return '';
  return change.dir === 'up' ? `${change.amount}계단 오름` : change.dir === 'down' ? `${change.amount}계단 내림` : change.dir === 'new' ? '새로 들어옴' : '그대로';
}

// ─── 음악 재생 막대 ──────────────────────────────────────
// '1:24'·'01:24'·'1:02:03'처럼 적은 재생 위치와 전체 길이로 막대 길이를 정한다. 시각으로 못 읽으면 막대 없이 적은 글자만
const CLOCK = /^(?:(\d{1,2})[:：])?(\d{1,3})[:：](\d{2})$/;

/** '3:45' → 225(초). 못 읽으면 null */
export function clockSeconds(text: string): number | null {
  const match = text.trim().match(CLOCK);
  if (!match) return null;
  const [, hours, minutes, seconds] = match;
  if (Number(seconds) > 59 || (hours !== undefined && Number(minutes) > 59)) return null;
  return Number(hours ?? 0) * 3600 + Number(minutes) * 60 + Number(seconds);
}

/** 재생 막대 비율(0~1). 전체 길이를 못 읽거나 0이면 null, 재생 위치가 비어 있으면 0, 전체보다 길면 1 */
export function musicProgress(elapsed: string, duration: string): number | null {
  const total = clockSeconds(duration);
  if (!total) return null;
  if (!elapsed.trim()) return 0;
  const now = clockSeconds(elapsed);
  return now === null ? null : Math.min(now / total, 1);
}

/** 제목 옆·댓글 머리에 보일 댓글 수. 직접 적은 값이 먼저, 없으면 실제 댓글 개수 */
export function postCommentCount(data: PostData, lines: CommentLine[]): string {
  return data.commentCount.trim() || String(lines.filter((line) => line.type === 'comment').length);
}

// ─── 템플릿 ────────────────────────────────────────────

export type TemplateKey =
  | 'kakao-dm'
  | 'kakao-group'
  | 'live'
  | 'chat'
  | 'donation'
  | 'post'
  | 'system-quest'
  | 'system-status'
  | 'news'
  | 'call-incoming'
  | 'call-active'
  | 'note'
  | 'sns'
  | 'mail'
  | 'search'
  | 'push'
  | 'sms'
  | 'receipt'
  | 'location'
  | 'poll'
  | 'transfer'
  | 'alarm'
  | 'event'
  | 'item'
  | 'music'
  | 'rank';

export const TEMPLATES: Array<{ key: TemplateKey; label: string; hint: string }> = [
  { key: 'kakao-dm', label: '카톡 1:1 대화', hint: '두 사람의 메신저 대화' },
  { key: 'kakao-group', label: '카톡 단체방', hint: '여러 사람이 있는 단톡방' },
  { key: 'live', label: '라이브 방송창', hint: '방송인 · 제목 · 시청자 수' },
  { key: 'chat', label: '실시간 채팅창', hint: '시청자 닉네임과 채팅' },
  { key: 'donation', label: '후원 알림', hint: '후원자 · 금액 · 메시지' },
  { key: 'post', label: '커뮤니티 게시글', hint: '게시판 글과 댓글' },
  { key: 'system-quest', label: '시스템 창 · 퀘스트', hint: '[퀘스트 발생!] 같은 알림' },
  { key: 'system-status', label: '시스템 창 · 상태창', hint: '이름·레벨·능력치' },
  { key: 'news', label: '뉴스 기사', hint: '언론사 · 제목 · 기자 · 본문' },
  { key: 'call-incoming', label: '전화 · 걸려 오는 전화', hint: '이름 · 거절/응답' },
  { key: 'call-active', label: '전화 · 통화 중', hint: '이름 · 통화 시간' },
  { key: 'note', label: '쪽지 · 메모', hint: '손글씨 느낌 종이 쪽지' },
  { key: 'sns', label: 'SNS 게시물', hint: '프로필 · 글 · 답글' },
  { key: 'mail', label: '이메일', hint: '보낸 사람 · 제목 · 본문 · 첨부' },
  { key: 'search', label: '검색 결과', hint: '검색어 · 결과 목록' },
  { key: 'push', label: '휴대폰 알림', hint: '잠금화면에 쌓인 알림' },
  { key: 'sms', label: '문자 메시지', hint: '회색·파란 말풍선 문자' },
  { key: 'receipt', label: '영수증', hint: '가게 · 품목 · 합계' },
  { key: 'location', label: '위치 공유', hint: '장소 · 주소 · 지도 그림' },
  { key: 'poll', label: '투표', hint: '질문 · 선택지 · 표 수 막대' },
  { key: 'transfer', label: '송금 완료', hint: '은행 앱 송금 결과 · 금액 · 받는 분' },
  { key: 'alarm', label: '알람', hint: '큰 시각 · 알람 이름 · 반복 요일' },
  { key: 'event', label: '일정', hint: '캘린더 일정 · 날짜 · 시간 · 장소' },
  { key: 'item', label: '아이템 획득', hint: '이름 · 등급 색 · 능력치' },
  { key: 'music', label: '음악 재생', hint: '노래 제목 · 가수 · 재생 막대 · 가사' },
  { key: 'rank', label: '실시간 순위', hint: '방송 · 게임 · 음원 차트 랭킹, 오르내림' },
];

export function templateLabel(block: StoryBlock): string {
  if (block.kind === 'system') return '시스템 창';
  if (block.kind === 'call') return '전화 화면';
  const key: TemplateKey = block.kind === 'kakao' ? (block.data.mode === 'dm' ? 'kakao-dm' : 'kakao-group') : block.kind;
  return TEMPLATES.find((template) => template.key === key)?.label ?? '템플릿';
}

export function newId(): string {
  return Math.random().toString(36).slice(2, 10) || 'id';
}

function todayLabel(): string {
  return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'full', timeZone: 'Asia/Seoul' }).format(new Date());
}

/** 잠금화면 날짜 '11월 12일 목요일' */
function lockScreenDate(): string {
  return new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'long', timeZone: 'Asia/Seoul' }).format(new Date());
}

/** 게시글 시각 '2026.11.12 20:14' (글자는 직접 조립: 브라우저마다 날짜 표기가 달라서) */
function postStamp(date = new Date()): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}.${parts.month}.${parts.day} ${parts.hour}:${parts.minute}`;
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
    case 'post':
      return {
        kind: 'post',
        data: {
          board: '자유게시판',
          title: '글 제목',
          author: 'ㅇㅇ',
          date: postStamp(),
          views: '128',
          likes: '12',
          commentCount: '',
          body: '본문을 적어 주세요.\n줄을 바꾸면 그대로 보여요.',
          script: ['익명1: 첫 댓글 [3분 전]', 'ㄴ 글쓴이: 답글은 앞에 ㄴ을 붙여요 [1분 전]', '--- 삭제된 댓글입니다 ---'].join('\n'),
        },
      };
    case 'system-quest':
      return {
        kind: 'system',
        data: {
          title: '퀘스트 발생!',
          script: ['「잃어버린 기억을 찾아라」', '제한 시간: 24시간', '보상: ???', '--- 실패 시 ---', '기억이 하나 사라집니다.'].join('\n'),
        },
      };
    case 'sns':
      return {
        kind: 'sns',
        data: {
          name: '아무개',
          handle: 'someone',
          body: '여기에 게시물 내용을 적어 주세요.',
          date: postStamp(),
          replies: '',
          reposts: '12',
          likes: '128',
          script: ['익명1: 답글은 이렇게 써요 [3분 전]', '익명2: 한 줄에 하나씩 [1분 전]'].join('\n'),
        },
      };
    case 'location':
      return {
        kind: 'location',
        data: { badge: '위치 공유', place: '골목 끝 와플 가게', address: '와플시 반죽구 시럽로 12, 1층', note: '여기서 기다릴게' },
      };
    case 'rank':
      return {
        kind: 'rank',
        data: {
          title: '실시간 후원 랭킹',
          badge: 'LIVE',
          script: ['밥알: 1,250,000원 ▲2', '감자도리: 980,000원 ▼1', '초코우유: 750,000원 NEW', '시럽왕: 410,000원 -', '---', '* 15. 와플집 딸: 120,000원 ▲5'].join('\n'),
        },
      };
    case 'music':
      return {
        kind: 'music',
        data: { app: '지금 재생 중', title: '골목 끝의 단맛', artist: '시럽 밴드', elapsed: '1:24', duration: '3:45', lyric: '오늘 밤도 이 골목 끝에서 널 기다릴게' },
      };
    case 'item':
      return {
        kind: 'item',
        data: {
          title: '아이템을 획득했습니다!',
          name: '전설의 와플 뒤집개',
          grade: '전설',
          category: '무기 · 주방 도구',
          script: ['공격력: +12', '버터 친화력: +30%', '「굽는 와플마다 행운 +1」', '---', '오래된 와플 가게에서 대대로 내려온 뒤집개.', '손잡이에 누군가의 이름이 새겨져 있다.'].join('\n'),
        },
      };
    case 'event':
      return {
        kind: 'event',
        data: { calendar: '가게 일정', date: lockScreenDate(), time: '오후 2:00 – 4:00', title: '와플 가게 재오픈 준비', place: '골목 끝 와플 가게', alert: '30분 전', note: '' },
      };
    case 'alarm':
      return {
        kind: 'alarm',
        data: { date: lockScreenDate(), period: '오전', time: '6:30', label: '일어나! 와플 가게 문 여는 날', days: '월 화 수 목 금' },
      };
    case 'transfer':
      return {
        kind: 'transfer',
        data: {
          bank: '와플뱅크',
          status: '송금 완료',
          amount: '50,000원',
          to: '김수진',
          from: '와플뱅크 1002-***-123456',
          memo: '어제 와플값',
          date: postStamp(),
        },
      };
    case 'poll':
      return {
        kind: 'poll',
        data: {
          badge: '익명 투표 · 오늘 자정 마감',
          question: '오늘 야식 뭐 먹을까?',
          script: ['* 떡볶이: 12', '치킨: 7', '와플: 3', '라면: 0'].join('\n'),
          status: '',
        },
      };
    case 'receipt':
      return {
        kind: 'receipt',
        data: {
          store: '와플 가게',
          info: '골목 끝 1층 · 영업 00:00~03:00',
          date: postStamp(),
          script: ['버터 와플 ×2: 7,000원', '아메리카노: 4,500원', '쿠폰 할인: -1,000원', '---', '포장 주문'].join('\n'),
          total: '',
          footer: '감사합니다. 또 오세요!',
        },
      };
    case 'sms':
      return {
        kind: 'sms',
        data: {
          contact: '',
          me: '나',
          script: ['--- 오늘 오후 11:52 ---', '엄마: 어디야?', '엄마: 늦었는데 연락도 없고', '나: 가게 앞이에요 금방 가요 [오후 11:53]', '엄마: 조심히 와 [오후 11:54]'].join('\n'),
        },
      };
    case 'push':
      return {
        kind: 'push',
        data: {
          time: '23:58',
          date: lockScreenDate(),
          script: ['카톡 · 엄마: 어디야? 늦었는데 [방금]', '조심히 와', '은행: 입금 10,000원 [3분 전]', '와플 가게 · 주인 할머니: 오늘도 문 열어요 [5분 전]'].join('\n'),
        },
      };
    case 'search':
      return {
        kind: 'search',
        data: {
          engine: '와플 검색',
          query: '검색어',
          count: '검색 결과 약 1,230개',
          script: [
            '첫 번째 결과 제목',
            'example.com/first',
            '둘째 줄에 주소, 그다음 줄부터 요약을 적어요.',
            '',
            '[광고] 광고 결과는 제목 앞에 [광고]',
            'ad.example.com',
            '빈 줄로 결과를 나눠요.',
          ].join('\n'),
        },
      };
    case 'mail':
      return {
        kind: 'mail',
        data: {
          subject: '메일 제목',
          from: '보낸 사람 <sender@example.com>',
          to: '나',
          date: postStamp(),
          body: '본문을 적어 주세요.\n\n빈 줄을 넣으면 문단이 나뉘어요.',
          attachment: '',
        },
      };
    case 'note':
      return {
        kind: 'note',
        data: { to: '○○에게', body: '여기에 쪽지 내용을 적어 주세요.\n줄을 바꾸면 그대로 보여요.', from: '○○가' },
      };
    case 'call-incoming':
      return { kind: 'call', data: { mode: 'incoming', name: '상대', detail: CALL_DETAIL_DEFAULT.incoming } };
    case 'call-active':
      return { kind: 'call', data: { mode: 'active', name: '상대', detail: CALL_DETAIL_DEFAULT.active } };
    case 'news':
      return {
        kind: 'news',
        data: {
          press: '와플일보',
          title: '기사 제목',
          subtitle: '',
          reporter: '○○○ 기자',
          date: postStamp(),
          body: '본문을 적어 주세요.\n\n빈 줄을 넣으면 문단이 나뉘어요.',
        },
      };
    case 'system-status':
      return {
        kind: 'system',
        data: {
          title: '상태창',
          script: ['이름: 주인공', '레벨: 12', '직업: 견습 마법사', '--- 능력치 ---', '힘: 8', '민첩: 14', '지능: 31', '행운: ???', '--- 칭호 ---', '「가게의 단골」'].join(
            '\n',
          ),
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

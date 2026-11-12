import { z } from 'zod';

// 본문 중간에 넣는 '이야기 속 화면' 템플릿 (카톡 1:1·단체방, 실시간 채팅창, 라이브 방송창, 후원 알림, 커뮤니티 게시글, 시스템 창, 뉴스 기사, 전화 화면, 쪽지, SNS 게시물, 이메일, 검색 결과, 휴대폰 알림, 문자 메시지, 영수증, 위치 공유, 투표, 송금 완료, 알람, 일정, 아이템 획득, 음악 재생, 실시간 순위, 할 일 목록, 명함, 날씨, 지하철 안내, 택배 배송 조회, 탑승권·승차권, 게임 결과, 메신저 프로필).
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

const subwaySchema = z.object({
  line: text(20), // 노선 이름 ('2호선', '와플선'). 이름의 숫자(없으면 이름)로 노선 색을 고른다 (subwayLineKey)
  direction: text(30), // 방면 ('시럽 방면'). 비우면 안 보임
  station: text(30), // 이번 역
  prev: text(30), // 이전 역. 비우면 안 보임
  next: text(30), // 다음 역. 비우면 안 보임
  message: text(120), // 안내 한 줄 ('이번 역은 반죽역입니다. 내리실 문은 오른쪽입니다.'). 비우면 안 보임
});

const parcelSchema = z.object({
  carrier: text(20), // 택배사 ('와플택배'). 동그라미에는 첫 글자
  tracking: text(30), // 운송장 번호. 비우면 안 보임
  item: text(60), // 상품 ('수제 시럽 세트 외 1건'). 비우면 안 보임
  status: text(30), // 지금 상태 ('배송 중'). 말로 단계를 고른다 (parcelStep)
  eta: text(40), // 도착 예정 ('오늘 18~20시 도착 예정'). 비우면 안 보임
  script: text(LIMITS.script), // 배송 기록 대본 (규칙은 parseParcelScript 위 설명)
});

const ticketSchema = z.object({
  mode: z.enum(['plane', 'train']), // 비행기 탑승권 / 기차 승차권 (메뉴에서 따로 고른다)
  carrier: text(30), // 항공편·열차 ('와플항공 WF801', 'KTX 101')
  from: text(12), // 출발 (공항 코드나 역 이름, 크게)
  fromName: text(20), // 출발 도시 (작게). 비우면 안 보임
  to: text(12), // 도착
  toName: text(20), // 도착 도시. 비우면 안 보임
  date: text(30), // 날짜 ('11월 13일 (금)'). 비우면 안 보임
  departs: text(10), // 출발 시각
  arrives: text(10), // 도착 시각. 비우면 안 보임
  passenger: text(30), // 승객. 비우면 안 보임
  script: text(300), // 표 정보 대본: '탑승구: 12'처럼 한 줄에 한 칸 (parseTicketDetails)
});

const matchSchema = z.object({
  result: text(20), // 결과 ('승리' · '패배' · '무승부'). 말로 띠 색을 고른다 (matchOutcome)
  game: text(40), // 게임·모드 ('랭크 게임 · 5대5'). 비우면 안 보임
  score: text(20), // 점수 ('32 : 28'). 비우면 안 보임
  time: text(20), // 경기 시간 ('28:41'). 비우면 안 보임
  mvp: text(30), // MVP. 비우면 안 보임
  script: text(LIMITS.script), // 기록 대본 (규칙은 parseMatchScript 위 설명)
});

const profileSchema = z.object({
  name: text(30), // 이름 (사진 자리에는 첫 글자)
  status: text(60), // 상태 메시지. 비우면 안 보임
  note: text(40), // 맨 위 작은 표시 ('프로필을 바꿨어요 · 방금'). 비우면 안 보임
  bg: text(20), // 배경 말 ('노을' · '바다' · '밤' · '벚꽃' · '숲'). 말로 배경 색을 고른다 (profileTone)
  music: text(40), // 프로필 음악 ('골목 끝의 단맛 - 시럽밴드'). 비우면 안 보임
});

const stockSchema = z.object({
  name: text(30), // 종목 이름 ('와플전자')
  code: text(30), // 시장·종목 코드 ('와플거래소 · WFL'). 비우면 안 보임
  price: text(20), // 현재가 ('72,400원')
  change: text(30), // 등락 ('+1,200 (+1.68%)'). 앞 기호(+ · − · ▲ · ▼)로 오름·내림을 고른다 (stockDirection). 비우면 흐름의 처음·끝으로
  volume: text(30), // 거래량 ('1,234만 주'). 비우면 안 보임
  note: text(40), // 맨 아래 한 줄 ('장 마감 · 15:30'). 비우면 안 보임
  points: text(600), // 흐름 그래프 숫자 ('70,100 70,800 …' 띄어 써서). 두 개 이상이면 그래프
});

const bankSchema = z.object({
  bank: text(20), // 은행 이름 ('와플은행'). 동그라미에는 첫 글자. 비우면 안 보임
  account: text(40), // 통장 이름·계좌 번호 ('입출금 통장 · 110-123-456789'). 비우면 안 보임
  balance: text(30), // 잔액 ('1,234,500원'). 비우면 안 보임
  script: text(LIMITS.script), // 거래 대본 (규칙은 parseBankScript 위 설명)
});

const translateSchema = z.object({
  from: text(20), // 원문 언어 ('한국어'). 비우면 안 보임
  to: text(20), // 번역 언어 ('일본어'). 비우면 안 보임
  source: text(300), // 원문. 비우면 안 보임
  result: text(300), // 번역문. 비우면 안 보임
  pronounce: text(120), // 번역문 읽는 법 한 줄 ('왓후루 오 히토츠 쿠다사이'). 비우면 안 보임
});

const taxiSchema = z.object({
  status: text(20), // 노란 띠 글 ('배차 완료'). 비우면 띠에 그림만
  eta: text(30), // 크게 쓰는 도착 안내 ('3분 후 도착')
  note: text(60), // 한 줄 ('기사님이 출발지로 오고 있어요'). 비우면 안 보임
  plate: text(20), // 차량 번호 ('서울 32사 1234'). 비우면 안 보임
  car: text(30), // 차종·색 ('흰색 쏘나타'). 비우면 안 보임
  driver: text(30), // 기사 ('김민수 기사님'). 비우면 안 보임
  from: text(40), // 출발 ('달빛 와플 가게'). 비우면 안 보임
  to: text(40), // 도착 ('연남동 골목 입구'). 비우면 안 보임
});

const weatherSchema = z.object({
  place: text(40), // 장소 ('와플시 반죽구')
  temp: text(10), // 지금 기온 ('12°')
  condition: text(30), // 지금 날씨 ('구름 조금'). 말로 그림·바탕색을 고른다 (weatherKind)
  range: text(30), // 최고·최저 ('최고 15° · 최저 6°'). 비우면 안 보임
  note: text(80), // 한 줄 ('저녁부터 비 소식이 있어요'). 비우면 안 보임
  script: text(LIMITS.script), // 시간별 대본 (규칙은 parseWeatherScript 위 설명)
});

const namecardSchema = z.object({
  company: text(40), // 회사·소속 ('주식회사 와플랩'). 비우면 안 보임 (로고 자리에는 첫 글자)
  name: text(30), // 이름
  role: text(40), // 직함 ('브랜드기획팀 팀장'). 비우면 안 보임
  phone: text(30), // 전화. 비우면 안 보임
  email: text(60), // 이메일. 비우면 안 보임
  address: text(80), // 주소. 비우면 안 보임
  memo: text(60), // 손글씨 메모 ('오늘 밤 9시, 와플 가게'). 비우면 안 보임
});

const todoSchema = z.object({
  title: text(60), // 목록 제목 ('가게 문 열기 전에')
  date: text(40), // 제목 위 작은 글 ('11월 13일 목요일'). 비우면 안 보임
  script: text(LIMITS.script), // 항목 대본 (규칙은 parseTodoScript 위 설명)
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
  z.object({ kind: z.literal('todo'), data: todoSchema }),
  z.object({ kind: z.literal('namecard'), data: namecardSchema }),
  z.object({ kind: z.literal('weather'), data: weatherSchema }),
  z.object({ kind: z.literal('subway'), data: subwaySchema }),
  z.object({ kind: z.literal('parcel'), data: parcelSchema }),
  z.object({ kind: z.literal('ticket'), data: ticketSchema }),
  z.object({ kind: z.literal('match'), data: matchSchema }),
  z.object({ kind: z.literal('profile'), data: profileSchema }),
  z.object({ kind: z.literal('taxi'), data: taxiSchema }),
  z.object({ kind: z.literal('translate'), data: translateSchema }),
  z.object({ kind: z.literal('stock'), data: stockSchema }),
  z.object({ kind: z.literal('bank'), data: bankSchema }),
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
export type TodoData = z.infer<typeof todoSchema>;
export type NamecardData = z.infer<typeof namecardSchema>;
export type WeatherData = z.infer<typeof weatherSchema>;
export type SubwayData = z.infer<typeof subwaySchema>;
export type ParcelData = z.infer<typeof parcelSchema>;
export type TicketData = z.infer<typeof ticketSchema>;
export type MatchData = z.infer<typeof matchSchema>;
export type ProfileData = z.infer<typeof profileSchema>;
export type TaxiData = z.infer<typeof taxiSchema>;
export type TranslateData = z.infer<typeof translateSchema>;
export type StockData = z.infer<typeof stockSchema>;
export type BankData = z.infer<typeof bankSchema>;

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

// ─── 지하철 노선 색 ──────────────────────────────────────
// 노선 이름에 숫자가 있으면 그 숫자로('2호선' → 2번 색), 없으면 이름 글자로 아홉 색 중 하나를 고른다 (같은 이름은 늘 같은 색).
// 색은 globals.css의 --wn-subway-1~9 (흰 글씨가 대비 4.5:1 이상인 진한 색들)

export const SUBWAY_COLORS = 9;

export function subwayLineKey(line: string): number {
  const digits = line.match(/\d+/)?.[0];
  if (digits) return ((Number(digits) - 1) % SUBWAY_COLORS + SUBWAY_COLORS) % SUBWAY_COLORS + 1;
  let sum = 0;
  for (const char of line.trim()) sum += char.codePointAt(0) ?? 0;
  return (sum % SUBWAY_COLORS) + 1;
}

// ─── 택배 배송 조회 ──────────────────────────────────────
// '지금 상태' 말로 네 단계(접수 · 집하 · 배송 중 · 배송 완료) 중 어디인지 고른다. 모르는 말이면 단계 표시 없음.
//   배송 완료 · 배달 완료 · 수령 → 배송 완료 / '준비'가 들어가면 접수 / 배송 · 배달 · 출발 · 이동 · 터미널 · 허브 · 도착 · 지연 → 배송 중
//   집하 · 인수 · 출고 → 집하 / 접수 · 주문 · 결제 → 접수 ('집하 완료'는 집하, '접수 완료'는 접수)
// 배송 기록 대본은 한 줄에 하나 (위가 최근, 택배 앱처럼)
//   11.13 14:05 반죽 대리점: 배송 출발   ← 날짜·시각 + 장소: 내용 (날짜는 생략해도 됨)
//   [어제 밤] 시럽 허브: 간선 상차        ← 시각을 [ ]로 자유롭게
//   14:05 배송 출발                      ← 장소 없이 (시각의 쌍점은 나누지 않는다)

export const PARCEL_STEPS = ['접수', '집하', '배송 중', '배송 완료'] as const;

export function parcelStep(status: string): number | null {
  const value = status.replace(/\s+/g, '');
  if (/(배송|배달|전달|도착)완료|수령|배송끝|배달끝/.test(value)) return 3;
  if (/준비/.test(value)) return 0;
  if (/배송|배달|출발|이동|간선|터미널|허브|도착|지연|상차|하차/.test(value)) return 2;
  if (/집하|인수|픽업|출고/.test(value)) return 1;
  if (/접수|주문|결제|등록|예약/.test(value)) return 0;
  return null;
}

export type ParcelRecord = { time: string; place: string; detail: string };

const PARCEL_TIME = /^(?:\[([^\]]{1,30})\]|((?:\d{1,4}[./-]\d{1,2}(?:[./-]\d{1,2})?\.?(?:\s*\([^)]{1,3}\))?\s+)?(?:오전|오후)?\s*\d{1,2}:\d{2}(?::\d{2})?))\s*/;

export function parseParcelScript(script: string): ParcelRecord[] {
  const records: ParcelRecord[] = [];
  for (const raw of script.split(/\r?\n/)) {
    if (records.length >= LIMITS.lines) break;
    const line = raw.trim();
    if (!line) continue;
    const match = line.match(PARCEL_TIME);
    const time = match ? (match[1] ?? match[2] ?? '').trim() : '';
    const rest = match ? line.slice(match[0].length) : line;
    // 장소와 내용은 첫 쌍점 중 바로 뒤가 숫자가 아닌 것에서 나눈다
    const split = [...rest.matchAll(/[:：]/g)].find((found) => !/\d/.test(rest[found.index + 1] ?? ''));
    const place = split ? rest.slice(0, split.index).trim() : '';
    const detail = (split ? rest.slice(split.index + 1) : rest).trim();
    if (!time && !place && !detail) continue;
    records.push({ time, place, detail });
  }
  return records;
}

// ─── 주식 시세 ──────────────────────────────────────
// 흐름 그래프 숫자: 띄어쓰기·줄바꿈으로 나누고 천 단위 쉼표는 떼어 읽는다 ('70,100 70,800'), 숫자가 아닌 것은 건너뜀, 60개까지
// 방향: 등락 글의 앞 기호로 (+ ▲ ↑ → 오름, - − ▼ ↓ → 내림), 기호가 없거나 비었으면 흐름의 처음·끝을 견줌, 같으면 보합

export type StockDirection = 'up' | 'down' | 'flat';

export function parseStockPoints(text: string): number[] {
  return text
    .split(/\s+/)
    // 천 단위 쉼표를 지운 뒤 빈 칸이 된 것(띄어 쓴 쉼표 '70,100 , 70,800')은 0이 아니라 건너뛰고, 빼기 기호 −(U+2212)는 -로
    .map((token) => token.replace(/,/g, '').replace(/^−/, '-'))
    .filter(Boolean)
    .map(Number)
    .filter((value) => Number.isFinite(value))
    .slice(0, 60);
}

export function stockDirection(change: string, points: number[]): StockDirection {
  const sign = change.trim()[0];
  if (sign && '+▲↑'.includes(sign)) return 'up';
  if (sign && '-−▼↓'.includes(sign)) return 'down';
  if (points.length >= 2 && points.at(-1) !== points[0]) return (points.at(-1) as number) > points[0] ? 'up' : 'down';
  return 'flat';
}

// ─── 통장 거래 내역 ──────────────────────────────────────
// 거래 대본: 한 줄에 거래 하나 (위가 최근).
// - '14:05 와플 가게: -4,500원 잔액 1,234,500원' → 때(앞의 날짜·시각, '[어제]'처럼 대괄호도) · 내용(쌍점 앞) · 금액(쌍점 뒤)
//   쌍점은 시각(14:05)의 것이 아닌 마지막 것. 쌍점이 없어도 '와플 가게 -4,500원'처럼 +·- 붙은 금액이 있으면 거기서 나눈다
// - 금액 앞이 + 또는 '입금'이면 입금, - · − 또는 '출금'이면 출금, 기호가 없으면 적은 그대로(색 없이)
// - 금액 뒤 나머지('잔액 1,234,500원')는 작은 글씨로, 금액으로 못 읽으면 쌍점 뒤 글을 그대로
// - 금액이 없는 줄('11.13 (금)')은 날짜 묶음 제목

export type BankFlow = 'in' | 'out' | 'none';
export type BankLine =
  | { type: 'entry'; when: string; detail: string; flow: BankFlow; amount: string; rest: string }
  | { type: 'heading'; text: string };

const BANK_WHEN =
  /^(?:\[([^\]]{1,30})\]|(\d{1,4}[./-]\d{1,2}(?:[./-]\d{1,2})?\.?(?:\s*\([^)]{1,3}\))?(?:\s+(?:오전|오후)?\s*\d{1,2}:\d{2}(?::\d{2})?)?|(?:오전|오후)?\s*\d{1,2}:\d{2}(?::\d{2})?))\s+/;
const BANK_MONEY = /^(입금|출금|[+\-−])?\s*([₩$€¥£]?\d[\d,]*(?:\.\d+)?\S*)\s*(.*)$/;

/** 내용과 금액을 나누는 쌍점: 시각(14:05)처럼 숫자 사이에 낀 것은 빼고 마지막 것 */
function bankColon(text: string): number {
  for (let index = text.length - 1; index > 0; index -= 1) {
    if (text[index] !== ':' && text[index] !== '：') continue;
    if (/\d/.test(text[index - 1]) && /\d/.test(text[index + 1] ?? '')) continue;
    return index;
  }
  return -1;
}

export function parseBankScript(script: string): BankLine[] {
  const lines: BankLine[] = [];
  for (const raw of script.split(/\r?\n/)) {
    if (lines.length >= LIMITS.lines) break;
    const line = raw.trim();
    if (!line) continue;
    const whenMatch = line.match(BANK_WHEN);
    const when = whenMatch ? (whenMatch[1] ?? whenMatch[2] ?? '').trim() : '';
    const body = whenMatch ? line.slice(whenMatch[0].length) : line;
    const colon = bankColon(body);
    const signed = colon > 0 ? -1 : body.search(/\s(?:입금|출금|[+\-−])\s?\d/);
    if (colon <= 0 && signed < 0) {
      lines.push({ type: 'heading', text: line });
      continue;
    }
    const detail = (colon > 0 ? body.slice(0, colon) : body.slice(0, signed)).trim();
    const money = (colon > 0 ? body.slice(colon + 1) : body.slice(signed)).trim();
    const found = money.match(BANK_MONEY);
    if (!found) {
      lines.push({ type: 'entry', when, detail, flow: 'none', amount: '', rest: money });
      continue;
    }
    const sign = found[1] ?? '';
    const flow: BankFlow = sign === '+' || sign === '입금' ? 'in' : sign ? 'out' : 'none';
    lines.push({ type: 'entry', when, detail, flow, amount: found[2], rest: found[3].trim() });
  }
  return lines;
}

// ─── 메신저 프로필 배경 ──────────────────────────────────────
// 배경 말로 그라데이션을 고른다: 노을·저녁·석양·주황 → 노을, 밤·별·달빛·새벽 → 밤(밤하늘도), 바다·하늘·파도·파랑 → 바다,
// 벚꽃·봄·분홍·꽃 → 벚꽃, 숲·나무·초록·풀 → 숲, 그 밖은 기본(회색). 모두 흰 글씨가 대비 4.5:1 이상인 진한 색

export type ProfileTone = 'sunset' | 'sea' | 'night' | 'blossom' | 'forest' | 'plain';

export function profileTone(bg: string): ProfileTone {
  const value = bg.replace(/\s+/g, '');
  if (/노을|저녁|석양|주황|오렌지/.test(value)) return 'sunset';
  // 밤이 하늘보다 먼저 ('밤하늘'은 밤), '달콤'의 달은 빼고 달빛·보름달처럼만
  if (/밤|별|새벽|우주|달빛|보름달|초승달|^달$/.test(value)) return 'night';
  if (/바다|하늘|파도|파랑|푸른|여름/.test(value)) return 'sea';
  if (/벚꽃|봄|분홍|핑크|꽃/.test(value)) return 'blossom';
  if (/숲|나무|초록|풀|산/.test(value)) return 'forest';
  return 'plain';
}

// ─── 게임 결과 ──────────────────────────────────────
// '결과' 말로 띠 색: 승리·이김·WIN·VICTORY·우승·클리어 → 승리(파랑), 패배·짐·LOSE·DEFEAT·실패 → 패배(빨강), 무승부·비김·DRAW → 무승부(회색), 그 밖은 회색
// 기록 대본은 한 줄에 한 사람
//   밥알: 12 / 3 / 7      ← 이름: 기록 (기록 안의 시각 '12:30'은 나누지 않는다)
//   * 하연화: 12 / 3 / 7   ← 강조 (주인공 자리)
//   --- 우리 팀 ---        ← 묶음 제목 ('---'만 쓰면 구분선)
//   그냥 쓰기              ← 이름만 (기록 없이)

export type MatchOutcome = 'win' | 'lose' | 'draw';

export function matchOutcome(result: string): MatchOutcome {
  const value = result.replace(/\s+/g, '').toLowerCase();
  if (/무승부|비김|비겼|draw|tie/.test(value)) return 'draw';
  if (/패배|졌|lose|lost|defeat|실패|탈락/.test(value)) return 'lose';
  if (/승리|이김|이겼|win|victory|우승|클리어|clear|성공/.test(value)) return 'win';
  return 'draw';
}

export type MatchLine = { kind: 'row'; name: string; record: string; mine: boolean } | { kind: 'divider'; label: string };

export function parseMatchScript(script: string): MatchLine[] {
  const lines: MatchLine[] = [];
  for (const raw of script.split(/\r?\n/)) {
    if (lines.length >= LIMITS.lines) break;
    let line = raw.trim();
    if (!line) continue;
    const divider = line.match(/^-{3,}\s*(.*?)\s*-*$/);
    if (divider) {
      lines.push({ kind: 'divider', label: divider[1] });
      continue;
    }
    const mine = /^[*＊]\s*/.test(line);
    if (mine) line = line.replace(/^[*＊]\s*/, '');
    // 이름과 기록은 첫 쌍점에서 (숫자 사이 쌍점은 시각이라 안 나눔)
    const split = [...line.matchAll(/[:：]/g)].find((found) => !(/\d/.test(line[found.index - 1] ?? '') && /\d/.test(line[found.index + 1] ?? '')));
    const name = (split ? line.slice(0, split.index) : line).trim();
    const record = split ? line.slice(split.index + 1).trim() : '';
    if (!name && !record) continue;
    lines.push({ kind: 'row', name, record, mine });
  }
  return lines;
}

// ─── 탑승권·승차권 표 정보 ──────────────────────────────────────
// 한 줄에 한 칸: '탑승구: 12', '좌석:23A', '탑승: 13:35', 이름 없이 '13:35'만 써도 됨. 여덟 칸까지
// 숫자 사이의 쌍점(13:35 · 오후 2:05)은 시각이라 나누지 않는다

export type TicketDetail = { label: string; value: string };

export function parseTicketDetails(script: string): TicketDetail[] {
  const details: TicketDetail[] = [];
  for (const raw of script.split(/\r?\n/)) {
    if (details.length >= 8) break;
    const line = raw.trim();
    if (!line) continue;
    const split = [...line.matchAll(/[:：]/g)].find((found) => !(/\d/.test(line[found.index - 1] ?? '') && /\d/.test(line[found.index + 1] ?? '')));
    const label = split ? line.slice(0, split.index).trim() : '';
    const value = (split ? line.slice(split.index + 1) : line).trim();
    if (!label && !value) continue;
    details.push({ label, value });
  }
  return details;
}

// ─── 날씨 ──────────────────────────────────────
// 날씨 말로 그림·바탕색을 고른다: 천둥·번개 → 뇌우, 눈(눈부신은 빼고) → 눈, 비·소나기 → 비, 안개·미세먼지·황사 → 안개,
// 흐림·구름 많음 → 흐림, 구름 → 구름 조금, '밤'과 맑음 → 달, 맑음·화창·해·햇살 → 해. 모르는 말이면 구름 조금
// 시간별 대본은 한 줄에 한 칸
//   오후 3시: 맑음 12°   ← '시간: 날씨 기온'. 기온은 줄 끝 숫자(° 있어도 없어도), 날씨 말은 생략해도 됨
//   15:00: 비 9°        ← 시각의 쌍점(숫자 앞)은 나누지 않는다

export type WeatherKind = 'sun' | 'moon' | 'partly' | 'cloud' | 'rain' | 'snow' | 'storm' | 'fog';

export function weatherKind(text: string): WeatherKind {
  const value = text.replace(/\s+/g, ' ');
  if (/천둥|번개|뇌우/.test(value)) return 'storm';
  if (/눈(?!부)/.test(value) || /진눈깨비/.test(value)) return 'snow';
  if (/비|소나기|장마/.test(value)) return 'rain';
  if (/안개|미세먼지|황사|흐릿/.test(value)) return 'fog';
  if (/흐림|흐리|구름\s*많/.test(value)) return 'cloud';
  if (/구름/.test(value)) return 'partly';
  if (/밤/.test(value) && /맑/.test(value)) return 'moon';
  if (/맑|화창|해|햇/.test(value)) return 'sun';
  return 'partly';
}

export type WeatherHour = { time: string; condition: string; temp: string; kind: WeatherKind };

const WEATHER_TEMP = /\s*(-?\d+(?:\.\d+)?\s*°?\s*C?)$/;

export function parseWeatherScript(script: string): WeatherHour[] {
  const hours: WeatherHour[] = [];
  for (const raw of script.split(/\r?\n/)) {
    if (hours.length >= LIMITS.lines) break;
    const line = raw.trim();
    if (!line) continue;
    // 첫 쌍점 중 바로 뒤가 숫자가 아닌 것에서 나눈다 ('15:00: 비'의 15:00은 그대로)
    const split = [...line.matchAll(/[:：]/g)].find((match) => !/\d/.test(line[match.index + 1] ?? ''));
    const time = split ? line.slice(0, split.index).trim() : '';
    const rest = split ? line.slice(split.index + 1).trim() : line;
    const temp = rest.match(WEATHER_TEMP)?.[1].replace(/\s+/g, '') ?? '';
    const condition = (temp ? rest.replace(WEATHER_TEMP, '') : rest).trim();
    if (!time && !condition && !temp) continue;
    hours.push({ time, condition, temp, kind: weatherKind(condition) });
  }
  return hours;
}

// ─── 할 일 목록 대본 ──────────────────────────────────────
// 한 줄에 하나
//   [x] 와플 반죽 숙성시키기   ← 끝낸 일 ([v] · [✓] · ✓ · ☑ 로 시작해도 됨)
//   [ ] 시럽 사 오기           ← 아직 안 한 일 (그냥 써도 되고, ☐ · '- ' 로 시작해도 됨)
//   --- 문 닫고 ---            ← 묶음 제목 (글자 없이 ---만 쓰면 구분선)

export type TodoLine = { type: 'item'; text: string; done: boolean } | { type: 'section'; text: string };

const TODO_DONE = /^(?:\[[xXvV✓✔]\]|[☑✅✔✓])\s*/;
const TODO_OPEN = /^(?:\[\s?\]|☐|[-•·]\s)\s*/;
const TODO_SECTION = /^-{3,}\s*(.*?)\s*-*$/;

export function parseTodoScript(script: string): TodoLine[] {
  const lines: TodoLine[] = [];
  for (const raw of script.split(/\r?\n/)) {
    if (lines.length >= LIMITS.lines) break;
    const line = raw.trim();
    if (!line) continue;
    const section = line.match(TODO_SECTION);
    if (section) {
      lines.push({ type: 'section', text: section[1] });
      continue;
    }
    const done = TODO_DONE.test(line);
    const text = line.replace(done ? TODO_DONE : TODO_OPEN, '').trim();
    if (text) lines.push({ type: 'item', text, done });
  }
  return lines;
}

/** 끝낸 일 수 / 전체 할 일 수 */
export function todoProgress(lines: TodoLine[]): { done: number; total: number } {
  const items = lines.filter((line) => line.type === 'item');
  return { done: items.filter((line) => line.done).length, total: items.length };
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
  | 'rank'
  | 'todo'
  | 'namecard'
  | 'weather'
  | 'subway'
  | 'parcel'
  | 'ticket-plane'
  | 'ticket-train'
  | 'match'
  | 'profile'
  | 'taxi'
  | 'translate'
  | 'stock'
  | 'bank';

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
  { key: 'todo', label: '할 일 목록', hint: '메모 앱 체크리스트 · 투두 · 끝낸 개수' },
  { key: 'namecard', label: '명함', hint: '이름 · 직함 · 회사 · 연락처 · 손글씨 메모' },
  { key: 'weather', label: '날씨', hint: '날씨 앱 · 지금 기온 · 최고/최저 · 시간별' },
  { key: 'subway', label: '지하철 안내', hint: '노선 색 · 이번 역 · 이전/다음 역 · 안내 방송' },
  { key: 'parcel', label: '택배 배송 조회', hint: '택배사 · 운송장 · 배송 단계 · 배송 기록' },
  { key: 'ticket-plane', label: '탑승권 · 비행기', hint: '출발/도착 · 시각 · 좌석 · 탑승구 · 바코드' },
  { key: 'ticket-train', label: '승차권 · 기차', hint: 'KTX · 출발/도착 · 시각 · 호차 · 좌석' },
  { key: 'match', label: '게임 결과', hint: '승리/패배 · 점수 · MVP · 경기 기록' },
  { key: 'profile', label: '메신저 프로필', hint: '프로필 사진 · 이름 · 상태 메시지 · 배경 · 프로필 음악' },
  { key: 'taxi', label: '택시 호출', hint: '배차 완료 · 몇 분 후 도착 · 차량 번호 · 차종 · 기사 · 출발 → 도착' },
  { key: 'translate', label: '번역기', hint: '원문 언어 → 번역 언어 · 원문 · 번역문 · 발음' },
  { key: 'stock', label: '주식 시세', hint: '종목 · 현재가 · 오르면 빨강 내리면 파랑 · 거래량 · 흐름 그래프' },
  { key: 'bank', label: '통장 거래 내역', hint: '은행 · 계좌 · 잔액 · 입금은 파랑 출금은 기본색 · 거래 기록' },
];

export function templateLabel(block: StoryBlock): string {
  if (block.kind === 'system') return '시스템 창';
  if (block.kind === 'call') return '전화 화면';
  if (block.kind === 'ticket') return block.data.mode === 'train' ? '승차권' : '탑승권';
  const key: TemplateKey = block.kind === 'kakao' ? (block.data.mode === 'dm' ? 'kakao-dm' : 'kakao-group') : block.kind;
  return TEMPLATES.find((template) => template.key === key)?.label ?? '템플릿';
}

export function newId(): string {
  return Math.random().toString(36).slice(2, 10) || 'id';
}

/** 표 날짜 '11월 13일 (금)' */
function ticketDate(): string {
  return new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'short', timeZone: 'Asia/Seoul' }).format(new Date());
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
    case 'bank':
      return {
        kind: 'bank',
        data: {
          bank: '와플은행',
          account: '입출금 통장 · 110-123-456789',
          balance: '1,234,500원',
          script: '11.13 (금)\n14:05 와플 가게: -4,500원 잔액 1,234,500원\n09:12 김지은: +50,000원 잔액 1,239,000원\n11.12 (목)\n18:30 시럽 마트: -12,800원 잔액 1,189,000원',
        },
      };
    case 'stock':
      return {
        kind: 'stock',
        data: {
          name: '와플전자',
          code: '와플거래소 · WFL',
          price: '72,400원',
          change: '+1,200 (+1.68%)',
          volume: '1,234만 주',
          note: '장 마감 · 15:30',
          points: '70,100 70,800 71,200 70,900 71,800 72,400',
        },
      };
    case 'translate':
      return {
        kind: 'translate',
        data: { from: '한국어', to: '일본어', source: '와플 하나 주세요.', result: 'ワッフルを一つください。', pronounce: '왓후루 오 히토츠 쿠다사이' },
      };
    case 'taxi':
      return {
        kind: 'taxi',
        data: {
          status: '배차 완료',
          eta: '3분 후 도착',
          note: '기사님이 출발지로 오고 있어요',
          plate: '서울 32사 1234',
          car: '흰색 쏘나타',
          driver: '김민수 기사님',
          from: '달빛 와플 가게',
          to: '연남동 골목 입구',
        },
      };
    case 'profile':
      return {
        kind: 'profile',
        data: { name: '한지은', status: '오늘도 와플 굽는 중', note: '프로필을 바꿨어요 · 방금', bg: '노을', music: '골목 끝의 단맛 - 시럽밴드' },
      };
    case 'match':
      return {
        kind: 'match',
        data: {
          result: '승리',
          game: '랭크 게임 · 5대5',
          score: '32 : 28',
          time: '28:41',
          mvp: '하연화',
          script: ['--- 우리 팀 ---', '* 하연화: 12 / 3 / 7', '밥알: 8 / 5 / 10', '감자도리: 4 / 6 / 15', '--- 상대 팀 ---', '초코우유: 9 / 7 / 4', '버터칼: 6 / 9 / 8'].join('\n'),
        },
      };
    case 'ticket-plane':
      return {
        kind: 'ticket',
        data: {
          mode: 'plane',
          carrier: '와플항공 WF801',
          from: 'ICN',
          fromName: '인천',
          to: 'CJU',
          toName: '제주',
          date: ticketDate(),
          departs: '14:05',
          arrives: '15:10',
          passenger: '한도윤',
          script: ['탑승구: 12', '좌석: 23A', '탑승: 13:35'].join('\n'),
        },
      };
    case 'ticket-train':
      return {
        kind: 'ticket',
        data: {
          mode: 'train',
          carrier: 'KTX 101',
          from: '서울',
          fromName: '',
          to: '부산',
          toName: '',
          date: ticketDate(),
          departs: '09:00',
          arrives: '11:38',
          passenger: '한도윤',
          script: ['호차: 5', '좌석: 12A', '타는 곳: 3'].join('\n'),
        },
      };
    case 'parcel':
      return {
        kind: 'parcel',
        data: {
          carrier: '와플택배',
          tracking: '6012-3456-7890',
          item: '수제 시럽 세트 외 1건',
          status: '배송 중',
          eta: '오늘 18~20시 도착 예정',
          script: ['11.13 14:05 반죽 대리점: 배송 출발', '11.13 09:12 반죽 터미널: 간선 하차', '11.12 22:40 시럽 허브: 간선 상차', '11.12 18:03 시럽 집하점: 집하', '11.12 15:31 와플상점: 접수'].join('\n'),
        },
      };
    case 'subway':
      return {
        kind: 'subway',
        data: {
          line: '2호선',
          direction: '시럽 방면',
          station: '반죽',
          prev: '버터',
          next: '시럽',
          message: '이번 역은 반죽, 반죽역입니다. 내리실 문은 오른쪽입니다.',
        },
      };
    case 'weather':
      return {
        kind: 'weather',
        data: {
          place: '와플시 반죽구',
          temp: '12°',
          condition: '구름 조금',
          range: '최고 15° · 최저 6°',
          note: '저녁부터 비 소식이 있어요',
          script: ['지금: 구름 조금 12°', '오후 4시: 흐림 11°', '오후 5시: 흐림 10°', '오후 6시: 비 9°', '오후 7시: 비 8°', '오후 8시: 밤 맑음 7°'].join('\n'),
        },
      };
    case 'namecard':
      return {
        kind: 'namecard',
        data: {
          company: '주식회사 와플랩',
          name: '한도윤',
          role: '브랜드기획팀 팀장',
          phone: '010-2024-1113',
          email: 'doyun.han@waffle.example',
          address: '와플시 반죽구 시럽로 12, 5층',
          memo: '오늘 밤 9시, 골목 끝 와플 가게',
        },
      };
    case 'todo':
      return {
        kind: 'todo',
        data: {
          title: '가게 문 열기 전에',
          date: lockScreenDate(),
          script: ['[x] 와플 반죽 숙성시키기', '[x] 버터 녹여 두기', '[ ] 시럽 새로 사 오기', '[ ] 간판 불 켜기', '--- 문 닫고 ---', '[ ] 할머니께 전화하기'].join('\n'),
        },
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

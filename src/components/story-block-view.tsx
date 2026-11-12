import type { CSSProperties, ReactNode } from 'react';
import {
  CHAT_COLORS,
  WEEKDAYS,
  alarmDays,
  chatColorKey,
  eventDateParts,
  itemGradeKey,
  musicProgress,
  commentDisplayName,
  isMine,
  isPostAuthor,
  kakaoTitle,
  parseComments,
  parsePollScript,
  parsePushScript,
  parseRankScript,
  parseReceiptScript,
  parseScript,
  parseSearchResults,
  parseSystemScript,
  parseTodoScript,
  pollPercentLabel,
  pollStatus,
  pollTotal,
  rankChangeSpoken,
  rankChangeText,
  postCommentCount,
  receiptTotal,
  scriptSpeakers,
  smsContact,
  splitMailSender,
  todoProgress,
  type AlarmData,
  type CallData,
  type ChatData,
  type DonationData,
  type EventData,
  type ItemData,
  type KakaoData,
  type LiveData,
  type LocationData,
  type MailData,
  type MusicData,
  type NamecardData,
  type NewsData,
  type NoteData,
  type PollData,
  type PostData,
  type PushData,
  type RankChange,
  type RankData,
  type ReceiptData,
  type SearchData,
  type SmsData,
  type SnsData,
  type StoryBlock,
  type SystemData,
  type TodoData,
  type TransferData,
} from '@/lib/story-blocks';
import { cn } from '@/lib/utils';

// 템플릿 카드. 상태가 없어서 열람 화면(서버)과 에디터(브라우저)가 같이 쓴다.
// 색은 globals.css의 --wn-* 토큰이라 사이트 테마(밝게/어둡게)를 따라간다.
// 열람 화면의 .novel-body p 스타일이 끼어들지 않도록 안쪽에는 p 태그를 쓰지 않는다.

const CARD = 'wn-block mx-auto w-full max-w-[460px] rounded-[22px] border border-(--wn-border) text-(--wn-fg) shadow-sm';

/**
 * 에디터에서 카드 위의 글자를 바로 고칠 수 있도록, 글자 자리를 입력칸으로 바꿔 그리는 함수.
 * 열람 화면에서는 넘기지 않으므로 그냥 글자로 그려진다.
 */
export type FieldRenderer = (spec: {
  name: string;
  value: string;
  label: string;
  placeholder: string;
  maxLength: number;
  className: string;
  multiline?: boolean; // 여러 줄 글 (줄바꿈을 그대로 저장)
  wrap?: boolean; // 한 줄 값이지만 칸이 좁으면 화면에서 줄을 바꿔 보여 줌 (Enter·줄바꿈은 막음)
}) => ReactNode;

export function StoryBlockView({ block }: { block: StoryBlock }) {
  switch (block.kind) {
    case 'live':
      return <LiveCard data={block.data} />;
    case 'chat':
      return <ChatCard data={block.data} />;
    case 'donation':
      return <DonationCard data={block.data} />;
    case 'kakao':
      return <KakaoCard data={block.data} />;
    case 'post':
      return <PostCard data={block.data} />;
    case 'system':
      return <SystemCard data={block.data} />;
    case 'news':
      return <NewsCard data={block.data} />;
    case 'call':
      return <CallCard data={block.data} />;
    case 'note':
      return <NoteCard data={block.data} />;
    case 'sns':
      return <SnsCard data={block.data} />;
    case 'mail':
      return <MailCard data={block.data} />;
    case 'search':
      return <SearchCard data={block.data} />;
    case 'push':
      return <PushCard data={block.data} />;
    case 'sms':
      return <SmsCard data={block.data} />;
    case 'receipt':
      return <ReceiptCard data={block.data} />;
    case 'location':
      return <LocationCard data={block.data} />;
    case 'poll':
      return <PollCard data={block.data} />;
    case 'transfer':
      return <TransferCard data={block.data} />;
    case 'alarm':
      return <AlarmCard data={block.data} />;
    case 'event':
      return <EventCard data={block.data} />;
    case 'item':
      return <ItemCard data={block.data} />;
    case 'music':
      return <MusicCard data={block.data} />;
    case 'rank':
      return <RankCard data={block.data} />;
    case 'todo':
      return <TodoCard data={block.data} />;
    case 'namecard':
      return <NamecardCard data={block.data} />;
  }
}

export function LiveCard({ data, field }: { data: LiveData; field?: FieldRenderer }) {
  const editing = Boolean(field);
  const slot = (name: keyof LiveData, label: string, maxLength: number, className: string, multiline = false, wrap = false) =>
    field ? (
      field({ name, value: data[name], label, placeholder: label, maxLength, className, multiline, wrap })
    ) : (
      <span className={className}>{data[name]}</span>
    );

  return (
    <div className={cn(CARD, 'bg-(--wn-live-bg) px-5 py-4')}>
      <div className="flex items-start justify-between gap-3">
        {slot('streamer', '방송인', 40, 'min-w-0 pt-1 text-[17px] font-bold')}
        {editing || data.badge
          ? slot(
              'badge',
              '배지',
              20,
              'shrink-0 rounded-full bg-(--wn-live-badge-bg) px-3 py-1 text-center text-[13px] font-bold tracking-wide text-(--wn-live-badge-fg)',
            )
          : null}
      </div>
      {editing || data.title ? (
        <div className="mt-2">{slot('title', '방송 제목', 120, 'block w-full text-[21px] leading-snug font-bold whitespace-pre-wrap', false, true)}</div>
      ) : null}
      <div className="mt-3 flex items-center justify-between gap-3 text-sm">
        {editing || data.viewers ? (
          <span className="flex items-center gap-1.5 font-medium text-(--wn-live-viewers)">
            <span
              aria-hidden="true"
              className="size-3 shrink-0 rounded-full border-2 border-(--wn-live-dot-ring) bg-(--wn-live-viewers)"
            />
            {/* 글자를 한 덩어리로 묶어야 flex 간격이 '1,024'와 '명' 사이에 끼지 않는다 */}
            <span>
              시청자 {slot('viewers', '시청자 수', 20, '')}명
            </span>
          </span>
        ) : (
          <span />
        )}
        {editing || data.category ? slot('category', '카테고리', 40, 'min-w-0 text-right text-(--wn-muted)') : null}
      </div>
    </div>
  );
}

function SignalIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className={className}>
      <circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none" />
      <path d="M8.6 15.4a4.8 4.8 0 0 1 0-6.8M15.4 8.6a4.8 4.8 0 0 1 0 6.8M5.8 18.2a8.8 8.8 0 0 1 0-12.4M18.2 5.8a8.8 8.8 0 0 1 0 12.4" />
    </svg>
  );
}

export function DonationCard({ data, field }: { data: DonationData; field?: FieldRenderer }) {
  const editing = Boolean(field);
  const autoFooter = `${data.donor} 님이 치즈 후원을 보냈습니다.`;
  const slot = (name: keyof DonationData, label: string, maxLength: number, className: string, multiline = false) =>
    field ? (
      field({ name, value: data[name], label, placeholder: label, maxLength, className, multiline })
    ) : (
      <span className={className}>{data[name]}</span>
    );

  return (
    <div className={cn(CARD, 'bg-(--wn-don-bg) px-5 py-4')}>
      <div className="flex items-center justify-between gap-3 border-b border-(--wn-line) pb-3.5">
        <span className="flex min-w-0 items-center gap-2 text-base font-bold">
          <SignalIcon className="size-5 shrink-0 text-(--wn-don-accent)" />
          {slot('platform', '위쪽 문구', 40, 'min-w-0')}
        </span>
        {editing || data.badge
          ? slot(
              'badge',
              '배지',
              20,
              'shrink-0 rounded-full bg-(--wn-don-badge-bg) px-3 py-1 text-center text-[13px] font-semibold text-(--wn-don-badge-fg)',
            )
          : null}
      </div>
      <div className="flex items-baseline justify-between gap-3 pt-4">
        {slot('donor', '후원자', 40, 'min-w-0 text-[17px] font-bold')}
        {slot(
          'amount',
          '금액',
          40,
          'min-w-0 text-right text-[26px] leading-none font-extrabold tracking-tight text-(--wn-don-accent) tabular-nums',
        )}
      </div>
      {editing || data.message ? (
        <div className="mt-3.5 rounded-2xl bg-(--wn-don-box) px-4 py-3.5 leading-relaxed whitespace-pre-wrap">
          {slot('message', '후원 메시지', 2000, 'block w-full', true)}
        </div>
      ) : null}
      <div className="mt-3 text-right text-xs text-(--wn-muted)">
        {field
          ? field({
              name: 'footer',
              value: data.footer,
              label: '아래쪽 문구',
              placeholder: autoFooter,
              maxLength: 120,
              className: 'block w-full text-right',
            })
          : data.footer.trim() || autoFooter}
      </div>
    </div>
  );
}

function ChatCard({ data }: { data: ChatData }) {
  const lines = parseScript(data.script);
  const speakers = scriptSpeakers(lines);
  return (
    <div className={cn(CARD, 'bg-(--wn-chat-bg) px-5 pt-4 pb-5')}>
      <div className="flex items-center justify-between gap-3 border-b border-(--wn-line) pb-3.5">
        <span className="text-[17px] font-bold">{data.title}</span>
        {data.badge ? <span className="text-[13px] font-semibold tracking-wide text-(--wn-muted)">{data.badge}</span> : null}
      </div>
      <div className="space-y-3 pt-4">
        {lines.map((line, index) =>
          line.type === 'notice' ? (
            <div key={index} className="text-center text-xs text-(--wn-muted)">
              {line.text}
            </div>
          ) : (
            <div key={index}>
              <div className="text-sm font-bold" style={{ color: CHAT_COLORS[chatColorKey(line.name, speakers, data.colors)] }}>
                {line.name}
              </div>
              <div className="mt-0.5 whitespace-pre-wrap">{line.text}</div>
            </div>
          ),
        )}
      </div>
    </div>
  );
}

function KakaoCard({ data }: { data: KakaoData }) {
  const lines = parseScript(data.script);
  return (
    <div className={cn(CARD, 'overflow-hidden bg-(--wn-kakao-bg)')}>
      <div className="bg-(--wn-kakao-head) px-4 py-3 text-center text-(--wn-kakao-head-fg)">
        <div className="text-base font-bold">{kakaoTitle(data, lines)}</div>
        {data.mode === 'group' && data.memberCount ? (
          <div className="mt-0.5 text-xs text-(--wn-kakao-sub)">{data.memberCount}명 참여 중</div>
        ) : null}
      </div>
      <div className="px-4 pt-2 pb-5">
        {lines.map((line, index) => {
          if (line.type === 'notice') {
            return (
              <div key={index} className="flex justify-center pt-4">
                <span className="rounded-full bg-(--wn-kakao-pill-bg) px-3 py-1 text-center text-xs text-(--wn-kakao-pill-fg)">
                  {line.text}
                </span>
              </div>
            );
          }
          const mine = isMine(line.name, data.me);
          const previous = lines[index - 1];
          const startsRun = !previous || previous.type !== 'message' || previous.name !== line.name;
          return (
            <div
              key={index}
              className={cn('flex flex-col', mine ? 'items-end' : 'items-start', startsRun ? 'mt-4' : 'mt-1.5')}
            >
              {!mine && startsRun ? <span className="mb-1 ml-0.5 text-xs text-(--wn-kakao-name)">{line.name}</span> : null}
              <div
                className={cn(
                  'max-w-[80%] rounded-[18px] px-3.5 py-2 leading-snug whitespace-pre-wrap',
                  mine ? 'bg-(--wn-kakao-me-bg) text-(--wn-kakao-me-fg)' : 'bg-(--wn-kakao-other-bg) text-(--wn-kakao-other-fg)',
                )}
              >
                {line.text}
              </div>
              {line.time ? <span className="mt-1 text-[11px] text-(--wn-kakao-time)">{line.time}</span> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ThumbIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M7 10v12" />
      <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
    </svg>
  );
}

function ReplyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M15 10l5 5-5 5" />
      <path d="M4 4v7a4 4 0 0 0 4 4h12" />
    </svg>
  );
}

function PostCard({ data }: { data: PostData }) {
  const comments = parseComments(data.script);
  const count = postCommentCount(data, comments);
  const meta = [data.author.trim(), data.date.trim(), data.views.trim() ? `조회 ${data.views.trim()}` : ''].filter(Boolean);
  const showComments = comments.length > 0 || count !== '0';

  return (
    <div className={cn(CARD, 'overflow-hidden bg-(--wn-post-bg)')}>
      <div className="border-b border-(--wn-line) px-5 pt-4 pb-3.5">
        {data.board ? <div className="text-[13px] font-semibold text-(--wn-post-accent)">{data.board}</div> : null}
        <div className={cn('text-[19px] leading-snug font-bold whitespace-pre-wrap', data.board && 'mt-1')}>
          {data.title}
          {count !== '0' ? (
            <span className="ml-1.5 text-[15px] font-semibold text-(--wn-post-accent)">
              <span aria-hidden="true">[{count}]</span>
              <span className="sr-only">댓글 {count}개</span>
            </span>
          ) : null}
        </div>
        {meta.length > 0 ? (
          <div className="mt-2 flex flex-wrap items-center gap-x-1.5 text-xs text-(--wn-muted)">
            {meta.map((item, index) => (
              <span key={index} className="flex items-center gap-x-1.5">
                {index > 0 ? <span aria-hidden="true">·</span> : null}
                <span className={cn(index === 0 && data.author.trim() && 'font-semibold text-(--wn-fg)')}>{item}</span>
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {data.body ? <div className="px-5 pt-4 pb-5 leading-relaxed whitespace-pre-wrap">{data.body}</div> : null}

      {data.likes.trim() ? (
        <div className={cn('flex justify-center pb-5', !data.body && 'pt-5')}>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-(--wn-border) px-4 py-1.5 text-sm font-semibold text-(--wn-post-accent)">
            <ThumbIcon className="size-4" />
            <span>
              <span className="sr-only">추천 </span>
              {data.likes.trim()}
            </span>
          </span>
        </div>
      ) : null}

      {showComments ? (
        <div className="border-t border-(--wn-line) bg-(--wn-post-comments) px-5 pt-3.5 pb-2">
          <div className="text-sm font-bold">
            댓글 <span className="text-(--wn-post-accent)">{count}</span>
          </div>
          {comments.length > 0 ? (
            <div className="mt-1 divide-y divide-(--wn-line)">
              {comments.map((comment, index) => (
                <div key={index} className={cn('flex gap-1.5 py-3', comment.reply && 'pl-1')}>
                  {comment.reply ? (
                    <>
                      <ReplyIcon className="mt-0.5 size-4 shrink-0 text-(--wn-muted)" />
                      <span className="sr-only">답글:</span>
                    </>
                  ) : null}
                  {comment.type === 'notice' ? (
                    <div className="min-w-0 text-sm text-(--wn-muted)">{comment.text}</div>
                  ) : (
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-1.5">
                        <span className="min-w-0 text-sm font-bold">{commentDisplayName(comment.name, data.author)}</span>
                        {isPostAuthor(comment.name, data.author) ? (
                          <span className="shrink-0 rounded-md bg-(--wn-post-badge-bg) px-1.5 py-px text-[11px] font-semibold text-(--wn-post-badge-fg)">
                            글쓴이
                          </span>
                        ) : null}
                        {comment.time ? <span className="ml-auto shrink-0 pl-2 text-xs text-(--wn-muted)">{comment.time}</span> : null}
                      </div>
                      {comment.text ? <div className="mt-0.5 leading-snug whitespace-pre-wrap">{comment.text}</div> : null}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="pt-1 pb-2" />
          )}
        </div>
      ) : null}
    </div>
  );
}

/** 게임 판타지의 '시스템 창'. 사이트 테마를 따라 밝게(하늘색 창)·어둡게(남색 홀로그램 창) */
function SystemCard({ data }: { data: SystemData }) {
  const lines = parseSystemScript(data.script);
  return (
    <div className="wn-block mx-auto w-full max-w-[460px] rounded-xl border-[1.5px] border-(--wn-sys-border) bg-(--wn-sys-bg) px-5 py-4 text-(--wn-sys-fg) shadow-[0_0_24px_var(--wn-sys-glow)]">
      {data.title.trim() ? (
        <div className="border-b border-(--wn-sys-line) pb-3 text-center text-[16px] font-bold tracking-[0.06em] text-(--wn-sys-title)">
          [ {data.title.trim()} ]
        </div>
      ) : null}
      <div className={cn('space-y-1.5', data.title.trim() && 'pt-3')}>
        {lines.map((line, index) => {
          switch (line.type) {
            case 'stat':
              return (
                <div key={index} className="flex items-baseline justify-between gap-4">
                  <span className="min-w-0 text-[14px] text-(--wn-sys-muted)">{line.label}</span>
                  <span className="min-w-0 text-right font-semibold tabular-nums">{line.value}</span>
                </div>
              );
            case 'emphasis':
              return (
                <div key={index} className="py-1 text-center font-bold text-(--wn-sys-title)">
                  {line.text}
                </div>
              );
            case 'divider':
              return (
                <div key={index} role="separator" className="flex items-center gap-3 pt-2 pb-1 text-xs font-semibold tracking-wide text-(--wn-sys-muted)">
                  {/* 가운데 글자가 없으면 끊기지 않은 한 줄로 */}
                  <span aria-hidden="true" className="h-px flex-1 bg-(--wn-sys-line)" />
                  {line.text ? (
                    <>
                      <span>{line.text}</span>
                      <span aria-hidden="true" className="h-px flex-1 bg-(--wn-sys-line)" />
                    </>
                  ) : null}
                </div>
              );
            case 'text':
              return (
                <div key={index} className="text-center leading-relaxed">
                  {line.text}
                </div>
              );
          }
        })}
      </div>
    </div>
  );
}

/** 뉴스 기사. 에디터에서는 field로 글자 자리를 입력칸으로 바꿔 카드 위에서 바로 고친다 */
export function NewsCard({ data, field }: { data: NewsData; field?: FieldRenderer }) {
  const editing = Boolean(field);
  const slot = (name: keyof NewsData, label: string, maxLength: number, className: string, multiline = false) =>
    field ? (
      field({ name, value: data[name], label, placeholder: label, maxLength, className, multiline })
    ) : (
      <span className={className}>{data[name]}</span>
    );
  // 읽는 화면: 빈 줄로 문단을 나눈다
  const paragraphs = data.body.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean);
  const meta = [data.reporter.trim(), data.date.trim()].filter(Boolean);

  return (
    <div className={cn(CARD, 'bg-(--wn-news-bg) px-5 pt-4 pb-5')}>
      <div className="border-b-2 border-(--wn-fg) pb-2">{slot('press', '언론사', 40, 'text-[14px] font-extrabold tracking-wide text-(--wn-news-press)')}</div>
      <div className="mt-3">{slot('title', '기사 제목', 120, 'block w-full font-serif text-[21px] leading-snug font-bold whitespace-pre-wrap', true)}</div>
      {editing || data.subtitle ? (
        <div className="mt-2">{slot('subtitle', '부제 (비우면 안 보여요)', 160, 'block w-full text-[15px] leading-snug text-(--wn-muted) whitespace-pre-wrap', true)}</div>
      ) : null}
      {editing ? (
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-(--wn-muted)">
          {slot('reporter', '기자', 40, '')}
          <span aria-hidden="true">·</span>
          {slot('date', '시각', 40, 'tabular-nums')}
        </div>
      ) : meta.length > 0 ? (
        <div className="mt-3 text-xs text-(--wn-muted) tabular-nums">{meta.join(' · ')}</div>
      ) : null}
      <div className="mt-3 border-t border-(--wn-line) pt-4 leading-relaxed">
        {editing ? (
          // 회차 본문 편집기('본문')와 이름이 겹치지 않게
          slot('body', '기사 본문', 5000, 'block w-full whitespace-pre-wrap', true)
        ) : (
          <div className="space-y-3">
            {paragraphs.map((paragraph, index) => (
              <div key={index} className="whitespace-pre-wrap">
                {paragraph}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.6a1 1 0 0 1-.25 1L6.6 10.8Z" />
    </svg>
  );
}

/** 전화 화면 아래 동그란 단추 모양 (실제로 누르는 단추가 아니라 그림) */
function CallKey({ tone, label, children }: { tone: 'red' | 'green' | 'plain'; label: string; children: ReactNode }) {
  return (
    <span className="flex flex-col items-center gap-1.5">
      <span
        aria-hidden="true"
        className={cn(
          'grid size-14 place-items-center rounded-full',
          tone === 'red' && 'bg-[#dc2626] text-white',
          tone === 'green' && 'bg-[#16a34a] text-white',
          tone === 'plain' && 'bg-(--wn-call-key-bg) text-(--wn-call-fg)',
        )}
      >
        {children}
      </span>
      <span className="text-xs text-(--wn-call-muted)">{label}</span>
    </span>
  );
}

/** 전화 화면: 걸려 오는 전화 / 통화 중. 에디터에서는 field로 이름·문구를 카드 위에서 고친다 */
export function CallCard({ data, field }: { data: CallData; field?: FieldRenderer }) {
  const incoming = data.mode === 'incoming';
  const name = data.name.trim();
  const slot = (key: 'name' | 'detail', label: string, className: string) =>
    field ? (
      field({ name: key, value: data[key], label, placeholder: label, maxLength: 40, className })
    ) : (
      <span className={className}>{data[key]}</span>
    );

  return (
    <div className="wn-block mx-auto flex w-full max-w-[340px] flex-col items-center rounded-[28px] border border-(--wn-border) bg-linear-to-b from-(--wn-call-bg-from) to-(--wn-call-bg-to) px-6 pt-9 pb-7 text-center text-(--wn-call-fg) shadow-sm">
      <span className="sr-only">{incoming ? '걸려 오는 전화' : '통화 중'}</span>
      <span
        aria-hidden="true"
        className="grid size-20 place-items-center rounded-full bg-(--wn-call-avatar-bg) text-[30px] font-semibold text-(--wn-call-avatar-fg)"
      >
        {name ? [...name][0] : '?'}
      </span>
      <div className="mt-4 w-full">{slot('name', '이름', 'block w-full text-center text-[26px] leading-tight font-semibold')}</div>
      <div className="mt-1.5 w-full">
        {slot('detail', incoming ? '번호 종류 (예: 휴대전화)' : '통화 시간 (예: 03:12)', 'block w-full text-center text-[15px] text-(--wn-call-muted) tabular-nums')}
      </div>
      {incoming ? (
        <div className="mt-12 flex w-full justify-between px-2">
          <CallKey tone="red" label="거절">
            <PhoneIcon className="size-6 rotate-[135deg]" />
          </CallKey>
          <CallKey tone="green" label="응답">
            <PhoneIcon className="size-6" />
          </CallKey>
        </div>
      ) : (
        <>
          <div className="mt-10 grid w-full grid-cols-3 gap-y-5">
            <CallKey tone="plain" label="소리 끔">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-6">
                <path d="M9 9v3a3 3 0 0 0 5.1 2.1M15 9.3V5a3 3 0 0 0-5.9-.7M19 10v2a7 7 0 0 1-.8 3.2M5 10v2a7 7 0 0 0 11.1 5.7M12 19v3M3 3l18 18" />
              </svg>
            </CallKey>
            <CallKey tone="plain" label="키패드">
              <svg viewBox="0 0 24 24" fill="currentColor" className="size-6">
                {[5, 12, 19].flatMap((y) => [5, 12, 19].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.8" />))}
              </svg>
            </CallKey>
            <CallKey tone="plain" label="스피커">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-6">
                <path d="M11 5 6 9H3v6h3l5 4V5ZM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
              </svg>
            </CallKey>
          </div>
          <div className="mt-7">
            <CallKey tone="red" label="종료">
              <PhoneIcon className="size-6 rotate-[135deg]" />
            </CallKey>
          </div>
        </>
      )}
    </div>
  );
}

/** 쪽지·메모: 손글씨 글꼴, 줄 쳐진 종이에 테이프. 고칠 때는 기울이지 않는다 (입력하기 편하게) */
export function NoteCard({ data, field }: { data: NoteData; field?: FieldRenderer }) {
  const editing = Boolean(field);
  const slot = (name: keyof NoteData, label: string, maxLength: number, className: string, multiline = false) =>
    field ? (
      field({ name, value: data[name], label, placeholder: label, maxLength, className, multiline })
    ) : (
      <span className={className}>{data[name]}</span>
    );

  return (
    <div className="wn-block mx-auto w-full max-w-[400px] px-3 py-4">
      <div
        className={cn(
          'relative rounded-sm bg-(--wn-note-paper) px-7 pt-9 pb-6 font-pen text-[25px] leading-8 text-(--wn-note-ink) shadow-md',
          !editing && '-rotate-1',
        )}
        // 줄 쳐진 종이 (글자 줄 높이 32px에 맞춤)
        style={{
          backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0, transparent 31px, var(--wn-note-line) 31px, var(--wn-note-line) 32px)',
          backgroundPosition: '0 4px',
        }}
      >
        <span aria-hidden="true" className="absolute -top-3 left-1/2 h-6 w-24 -translate-x-1/2 rotate-2 bg-(--wn-note-tape)" />
        {editing || data.to ? <div>{slot('to', '받는 사람 (비우면 안 보여요)', 40, 'block w-full')}</div> : null}
        <div className="whitespace-pre-wrap">{slot('body', '쪽지 내용', 2000, 'block w-full whitespace-pre-wrap', true)}</div>
        {editing || data.from ? (
          <div className="text-right">{slot('from', '보낸 사람 (비우면 안 보여요)', 40, 'block w-full text-right')}</div>
        ) : null}
      </div>
    </div>
  );
}

/** 프로필 동그라미 (이름 첫 글자) */
function Avatar({ name, className }: { name: string; className: string }) {
  return (
    <span aria-hidden="true" className={cn('grid shrink-0 place-items-center rounded-full bg-(--wn-sns-avatar-bg) font-semibold text-(--wn-fg)', className)}>
      {[...name.trim()][0] ?? '?'}
    </span>
  );
}

function SnsStat({ label, value, children }: { label: string; value: string; children: ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 tabular-nums">
      {children}
      <span>
        <span className="sr-only">{label} </span>
        {value}
      </span>
    </span>
  );
}

/** SNS 게시물: 프로필 · 글 · 시각 · 답글/재게시/좋아요 수 · 답글 목록 (답글은 커뮤니티 댓글과 같은 대본 규칙) */
function SnsCard({ data }: { data: SnsData }) {
  const replies = parseComments(data.script);
  const replyCount = data.replies.trim() || String(replies.filter((line) => line.type === 'comment').length);
  const handle = data.handle.trim() ? (data.handle.trim().startsWith('@') ? data.handle.trim() : `@${data.handle.trim()}`) : '';
  const icon = 'size-4 shrink-0';

  return (
    <div className={cn(CARD, 'bg-(--wn-sns-bg) px-5 pt-4 pb-1')}>
      <div className="flex items-center gap-3">
        <Avatar name={data.name} className="size-11 text-lg" />
        <div className="min-w-0">
          <div className="truncate font-bold">{data.name}</div>
          {handle ? <div className="truncate text-sm text-(--wn-muted)">{handle}</div> : null}
        </div>
      </div>
      {data.body ? <div className="mt-3 text-[16px] leading-relaxed whitespace-pre-wrap">{data.body}</div> : null}
      {data.date.trim() ? <div className="mt-3 text-[13px] text-(--wn-muted) tabular-nums">{data.date}</div> : null}
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 border-t border-(--wn-line) py-3 text-[13px] text-(--wn-muted)">
        <SnsStat label="답글" value={replyCount}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true" className={icon}>
            <path d="M4 5h16v11H9l-5 4V5Z" />
          </svg>
        </SnsStat>
        {data.reposts.trim() ? (
          <SnsStat label="재게시" value={data.reposts.trim()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={icon}>
              <path d="M17 2l3 3-3 3M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3M20 13v2a4 4 0 0 1-4 4H4" />
            </svg>
          </SnsStat>
        ) : null}
        {data.likes.trim() ? (
          <SnsStat label="좋아요" value={data.likes.trim()}>
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={cn(icon, 'text-(--wn-sns-like)')}>
              <path d="M12 21s-7.5-4.6-9.5-9.3C1.2 8.3 3.4 5 6.8 5c2 0 3.4 1.1 4.2 2.4h2C13.8 6.1 15.2 5 17.2 5c3.4 0 5.6 3.3 4.3 6.7C19.5 16.4 12 21 12 21Z" />
            </svg>
          </SnsStat>
        ) : null}
      </div>
      {replies.length > 0 ? (
        <div className="divide-y divide-(--wn-line) border-t border-(--wn-line)">
          {replies.map((reply, index) =>
            reply.type === 'notice' ? (
              <div key={index} className="py-3 text-center text-sm text-(--wn-muted)">
                {reply.text}
              </div>
            ) : (
              <div key={index} className="flex gap-2.5 py-3">
                <Avatar name={reply.name} className="size-8 text-sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="min-w-0 truncate text-sm font-bold">{reply.name}</span>
                    {reply.time ? <span className="ml-auto shrink-0 text-xs text-(--wn-muted)">{reply.time}</span> : null}
                  </div>
                  {reply.text ? <div className="mt-0.5 leading-snug whitespace-pre-wrap">{reply.text}</div> : null}
                </div>
              </div>
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}

/** 이메일: 제목 · 보낸 사람(이름·주소) · 받는 사람 · 시각 · 본문 · 첨부 파일. 에디터에서는 field로 카드 위에서 바로 고친다 */
export function MailCard({ data, field }: { data: MailData; field?: FieldRenderer }) {
  const editing = Boolean(field);
  const slot = (name: keyof MailData, label: string, maxLength: number, className: string, multiline = false, wrap = false) =>
    field ? (
      field({ name, value: data[name], label, placeholder: label, maxLength, className, multiline, wrap })
    ) : (
      <span className={className}>{data[name]}</span>
    );
  const sender = splitMailSender(data.from);
  // 읽는 화면: 빈 줄로 문단을 나눈다
  const paragraphs = data.body.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean);

  return (
    <div className={cn(CARD, 'bg-(--wn-mail-bg) px-5 pt-4 pb-5')}>
      <div>{slot('subject', '메일 제목', 120, 'block w-full text-[19px] leading-snug font-bold whitespace-pre-wrap', true)}</div>
      <div className="mt-3 flex items-start gap-3 border-t border-(--wn-line) pt-3">
        <span
          aria-hidden="true"
          className="grid size-10 shrink-0 place-items-center rounded-full bg-(--wn-mail-avatar-bg) text-base font-semibold text-(--wn-mail-avatar-fg)"
        >
          {[...sender.name][0] ?? '?'}
        </span>
        <div className="min-w-0 flex-1 text-[13px] leading-snug">
          {editing ? (
            <div className="flex flex-col items-start gap-1">
              {slot('from', '보낸 사람 (이름 <주소>)', 80, 'max-w-full text-[14px] font-semibold', false, true)}
              <div className="flex max-w-full flex-wrap items-center gap-x-1 text-(--wn-muted)">
                <span className="shrink-0">받는 사람</span>
                {/* 두 글자 이름도 누르기 쉽게 너비는 32px 이상 */}
                {slot('to', '받는 사람 (비우면 안 보여요)', 80, 'max-w-full min-w-8', false, true)}
              </div>
              {slot('date', '시각', 40, 'max-w-full text-(--wn-muted) tabular-nums')}
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-baseline gap-x-1.5">
                <span className="sr-only">보낸 사람 </span>
                <span className="text-[14px] font-semibold break-all">{sender.name}</span>
                {sender.address ? <span className="min-w-0 break-all text-(--wn-muted)">&lt;{sender.address}&gt;</span> : null}
              </div>
              {data.to.trim() ? <div className="mt-0.5 break-all text-(--wn-muted)">받는 사람 {data.to}</div> : null}
              {data.date.trim() ? <div className="mt-0.5 text-(--wn-muted) tabular-nums">{data.date}</div> : null}
            </>
          )}
        </div>
      </div>
      <div className="mt-3 border-t border-(--wn-line) pt-4 leading-relaxed">
        {editing ? (
          // 회차 본문 편집기('본문')와 이름이 겹치지 않게
          slot('body', '메일 본문', 5000, 'block w-full whitespace-pre-wrap', true)
        ) : (
          <div className="space-y-3">
            {paragraphs.map((paragraph, index) => (
              <div key={index} className="whitespace-pre-wrap">
                {paragraph}
              </div>
            ))}
          </div>
        )}
      </div>
      {editing || data.attachment.trim() ? (
        <div className="mt-4 flex w-fit max-w-full items-center gap-2 rounded-xl border border-(--wn-border) bg-(--wn-mail-chip-bg) px-3 py-2 text-[13px]">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-4 shrink-0 text-(--wn-muted)">
            <path d="M20.5 11.5l-8.2 8.2a5 5 0 0 1-7.1-7.1l8.5-8.5a3.4 3.4 0 0 1 4.8 4.8l-8.4 8.4a1.8 1.8 0 0 1-2.6-2.6l7.7-7.7" />
          </svg>
          {editing ? null : <span className="sr-only">첨부 파일 </span>}
          {slot('attachment', '첨부 파일 이름 (비우면 안 보여요)', 80, editing ? 'max-w-full min-w-8' : 'min-w-0 truncate', false, true)}
        </div>
      ) : null}
    </div>
  );
}

/** 검색 결과: 검색 사이트 이름 · 검색창(검색어) · 결과 수 · 결과 목록(주소 · 제목 · 요약). 글자만 그리고 링크는 아니다 */
function SearchCard({ data }: { data: SearchData }) {
  const results = parseSearchResults(data.script);

  return (
    <div className={cn(CARD, 'bg-(--wn-search-bg) px-5 pt-4 pb-2')}>
      {data.engine.trim() ? <div className="text-[15px] font-extrabold tracking-tight text-(--wn-search-brand)">{data.engine}</div> : null}
      <div className="mt-2.5 flex items-center gap-2.5 rounded-full border border-(--wn-border) bg-(--wn-search-box-bg) px-4 py-2.5">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" className="size-4 shrink-0 text-(--wn-muted)">
          <circle cx="11" cy="11" r="6.5" />
          <path d="M20 20l-4.2-4.2" />
        </svg>
        <span className="min-w-0 flex-1 truncate text-[15px]">
          <span className="sr-only">검색어 </span>
          {data.query}
        </span>
      </div>
      {data.count.trim() ? <div className="mt-2.5 px-1 text-xs text-(--wn-muted)">{data.count}</div> : null}
      {results.length > 0 ? (
        <div className="mt-1 divide-y divide-(--wn-line)">
          {results.map((result, index) => (
            <div key={index} className="py-3">
              {result.url || result.ad ? (
                <div className="flex min-w-0 items-center gap-1.5 text-xs text-(--wn-muted)">
                  {result.ad ? (
                    <span className="shrink-0 rounded border border-(--wn-border) px-1 text-[10px] leading-4 font-bold">광고</span>
                  ) : null}
                  <span className="min-w-0 truncate">{result.url}</span>
                </div>
              ) : null}
              <div className="mt-0.5 text-[16px] leading-snug font-semibold break-keep text-(--wn-search-title)">{result.title}</div>
              {result.snippet ? (
                <div className="mt-1 text-[14px] leading-relaxed break-keep whitespace-pre-wrap text-(--wn-muted)">{result.snippet}</div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** 휴대폰 알림: 잠금화면 날짜 · 큰 시계 아래에 알림이 쌓인다. 알림마다 앱 그림(첫 글자) · 앱 이름 · 시각 · 보낸 사람 · 내용 */
function PushCard({ data }: { data: PushData }) {
  const lines = parsePushScript(data.script);
  const hasClock = data.time.trim() || data.date.trim();

  return (
    <div className="wn-block mx-auto w-full max-w-[380px] rounded-[28px] border border-(--wn-border) bg-linear-to-b from-(--wn-push-bg-from) to-(--wn-push-bg-to) px-3.5 pt-7 pb-3.5 text-(--wn-push-fg) shadow-sm">
      {hasClock ? (
        <div className="text-center text-(--wn-push-clock)">
          {data.date.trim() ? <div className="text-[15px] font-medium">{data.date}</div> : null}
          {data.time.trim() ? <div className="mt-0.5 text-[56px] leading-none font-semibold tracking-tight tabular-nums">{data.time}</div> : null}
        </div>
      ) : null}
      {lines.length > 0 ? (
        <div className={cn('space-y-2', hasClock && 'mt-6')}>
          {lines.map((line, index) =>
            line.type === 'notice' ? (
              <div key={index} className="py-0.5 text-center text-xs font-medium text-(--wn-push-muted)">
                {line.text}
              </div>
            ) : (
              <div key={index} className="flex gap-3 rounded-[18px] bg-(--wn-push-card-bg) px-3.5 py-3">
                <span
                  aria-hidden="true"
                  className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-(--wn-push-icon-bg) text-sm font-bold text-(--wn-push-icon-fg)"
                >
                  {[...(line.app || line.title || '알')][0]}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2 text-xs text-(--wn-push-muted)">
                    <span className="min-w-0 truncate font-semibold">{line.app || '알림'}</span>
                    {line.time ? <span className="ml-auto shrink-0">{line.time}</span> : null}
                  </div>
                  {line.title ? <div className="mt-0.5 truncate text-[14px] font-bold">{line.title}</div> : null}
                  {line.body ? <div className="mt-0.5 text-[14px] leading-snug break-keep whitespace-pre-wrap">{line.body}</div> : null}
                </div>
              </div>
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}

/** 문자 메시지: 위쪽 상대 이름 · 받은 문자 회색 / 보낸 문자 파란 말풍선 (대본은 카톡과 같은 규칙). 상대가 둘 이상일 때만 이름을 붙인다 */
function SmsCard({ data }: { data: SmsData }) {
  const lines = parseScript(data.script);
  const contact = smsContact(data, lines);
  const others = scriptSpeakers(lines).filter((name) => !isMine(name, data.me));
  const showNames = others.length > 1;

  return (
    <div className={cn(CARD, 'overflow-hidden bg-(--wn-sms-bg)')}>
      <div className="flex flex-col items-center gap-1 border-b border-(--wn-line) px-4 pt-4 pb-3">
        <span aria-hidden="true" className="grid size-11 place-items-center rounded-full bg-(--wn-sms-avatar-bg) text-lg font-semibold text-(--wn-sms-avatar-fg)">
          {[...contact][0] ?? '?'}
        </span>
        <div className="max-w-full truncate text-[15px] font-semibold">{contact}</div>
        <div className="text-[11px] text-(--wn-muted)">문자 메시지</div>
      </div>
      <div className="px-3.5 pt-1 pb-4">
        {lines.map((line, index) => {
          if (line.type === 'notice') {
            return (
              <div key={index} className="pt-4 pb-1 text-center text-[11px] font-medium text-(--wn-muted)">
                {line.text}
              </div>
            );
          }
          const mine = isMine(line.name, data.me);
          const previous = lines[index - 1];
          const startsRun = !previous || previous.type !== 'message' || previous.name !== line.name;
          return (
            <div key={index} className={cn('flex flex-col', mine ? 'items-end' : 'items-start', startsRun ? 'mt-3' : 'mt-1')}>
              {!mine && showNames && startsRun ? <span className="mb-1 ml-3 text-[11px] text-(--wn-muted)">{line.name}</span> : null}
              <div
                className={cn(
                  'max-w-[78%] rounded-[20px] px-3.5 py-2 text-[15px] leading-snug whitespace-pre-wrap',
                  mine ? 'bg-(--wn-sms-out-bg) text-(--wn-sms-out-fg)' : 'bg-(--wn-sms-in-bg) text-(--wn-sms-in-fg)',
                )}
              >
                {/* 화면 낭독기: 누가 보낸 문자인지 */}
                <span className="sr-only">{mine ? '보낸 문자: ' : `${line.name}: `}</span>
                {line.text}
              </div>
              {line.time ? <span className="mx-2 mt-1 text-[11px] text-(--wn-muted)">{line.time}</span> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** 영수증: 가게 · 정보 · 날짜, 품목 표(품목 · 수량 · 금액), 합계, 맨 아래 한 줄. 화면 낭독기가 표로 읽도록 진짜 table */
function ReceiptCard({ data }: { data: ReceiptData }) {
  const lines = parseReceiptScript(data.script);
  const total = receiptTotal(data, lines);
  const hasQty = lines.some((line) => line.type === 'item' && line.qty);
  const columns = hasQty ? 3 : 2;
  const dash = 'border-t border-dashed border-(--wn-receipt-line)';

  return (
    <div className="wn-block mx-auto w-full max-w-[340px] px-2 py-1">
      <div className="rounded-sm bg-(--wn-receipt-paper) px-5 pt-5 pb-4 text-(--wn-receipt-ink) shadow-md">
        {data.store.trim() ? <div className="text-center text-[17px] font-bold">{data.store}</div> : null}
        {data.info.trim() ? <div className="mt-1 text-center text-xs whitespace-pre-wrap text-(--wn-receipt-muted)">{data.info}</div> : null}
        {data.date.trim() ? <div className="mt-0.5 text-center text-xs text-(--wn-receipt-muted) tabular-nums">{data.date}</div> : null}
        <div aria-hidden="true" className={cn('my-3', dash)} />
        <table className="w-full text-[13px]">
          <caption className="sr-only">{data.store.trim() ? `${data.store} 영수증` : '영수증'}</caption>
          <thead>
            <tr className="text-[11px] text-(--wn-receipt-muted)">
              <th scope="col" className="pb-1 text-left font-medium">
                품목
              </th>
              {hasQty ? (
                <th scope="col" className="w-10 pb-1 text-center font-medium">
                  수량
                </th>
              ) : null}
              <th scope="col" className="pb-1 text-right font-medium">
                금액
              </th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) =>
              line.type === 'divider' ? (
                <tr key={index} aria-hidden="true">
                  <td colSpan={columns} className="py-1.5">
                    <div className={dash} />
                  </td>
                </tr>
              ) : line.type === 'note' ? (
                <tr key={index}>
                  <td colSpan={columns} className="py-0.5 text-xs text-(--wn-receipt-muted)">
                    {line.text}
                  </td>
                </tr>
              ) : (
                <tr key={index}>
                  <td className="py-0.5 pr-2 align-top break-keep">{line.name}</td>
                  {hasQty ? <td className="py-0.5 text-center align-top tabular-nums">{line.qty}</td> : null}
                  <td className="py-0.5 text-right align-top whitespace-nowrap tabular-nums">{line.price}</td>
                </tr>
              ),
            )}
          </tbody>
          {total ? (
            <tfoot>
              <tr aria-hidden="true">
                <td colSpan={columns} className="pt-2">
                  <div className={dash} />
                </td>
              </tr>
              <tr>
                <th scope="row" colSpan={columns - 1} className="pt-2 text-left text-[14px] font-bold">
                  합계
                </th>
                <td className="pt-2 text-right text-[15px] font-bold whitespace-nowrap tabular-nums">{total}</td>
              </tr>
            </tfoot>
          ) : null}
        </table>
        {data.footer.trim() ? (
          <div className={cn('mt-3 pt-3 text-center text-xs whitespace-pre-wrap text-(--wn-receipt-muted)', dash)}>{data.footer}</div>
        ) : null}
      </div>
    </div>
  );
}

/** 위치 공유: 작은 지도 그림(장식) · 위치 공유 표시 · 장소 이름 · 주소 · 한 줄 메모. 에디터에서는 field로 카드 위에서 바로 고친다 */
export function LocationCard({ data, field }: { data: LocationData; field?: FieldRenderer }) {
  const editing = Boolean(field);
  const slot = (name: keyof LocationData, label: string, maxLength: number, className: string, wrap = false) =>
    field ? (
      field({ name, value: data[name], label, placeholder: label, maxLength, className, wrap })
    ) : (
      <span className={className}>{data[name]}</span>
    );

  return (
    <div className={cn(CARD, 'overflow-hidden bg-(--wn-loc-bg)')}>
      {/* 진짜 지도가 아니라 분위기만 내는 그림 */}
      <svg viewBox="0 0 320 150" aria-hidden="true" className="block h-auto w-full" preserveAspectRatio="xMidYMid slice">
        <rect width="320" height="150" fill="var(--wn-loc-map-bg)" />
        <rect x="196" y="18" width="92" height="52" rx="14" fill="var(--wn-loc-park)" />
        <path d="M0 118 C60 104 92 132 150 124 S260 98 320 112 V150 H0 Z" fill="var(--wn-loc-water)" />
        <g stroke="var(--wn-loc-road)" strokeLinecap="round" fill="none">
          <path d="M-10 84 L330 70" strokeWidth="11" />
          <path d="M118 -10 L138 160" strokeWidth="9" />
          <path d="M40 -10 L64 104" strokeWidth="5" />
          <path d="M210 82 L232 160" strokeWidth="5" />
          <path d="M150 36 L330 30" strokeWidth="5" />
        </g>
        <ellipse cx="160" cy="80" rx="9" ry="3.5" fill="black" opacity="0.18" />
        <path d="M160 79 C160 79 145 61 145 50 A15 15 0 0 1 175 50 C175 61 160 79 160 79 Z" fill="var(--wn-loc-pin)" />
        <circle cx="160" cy="50" r="5.5" fill="white" />
      </svg>
      <div className="px-4 pt-3 pb-4">
        {editing || data.badge.trim() ? (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-(--wn-loc-badge)">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="size-3.5 shrink-0">
              <path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />
            </svg>
            {slot('badge', '위쪽 표시 (비우면 안 보여요)', 40, '')}
          </div>
        ) : null}
        <div className="mt-1">{slot('place', '장소 이름', 60, 'block w-full text-[17px] leading-snug font-bold break-keep', true)}</div>
        {editing || data.address.trim() ? (
          <div className="mt-0.5 text-[13px] text-(--wn-muted)">
            {editing ? null : <span className="sr-only">주소 </span>}
            {slot('address', '주소 (비우면 안 보여요)', 120, 'block w-full break-keep', true)}
          </div>
        ) : null}
        {editing || data.note.trim() ? (
          <div className="mt-2.5 rounded-xl bg-(--wn-loc-note-bg) px-3 py-2 text-sm">{slot('note', '한 줄 메모 (비우면 안 보여요)', 120, 'block w-full break-keep', true)}</div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * 투표: 위쪽 표시 · 질문 · 선택지(표 수 막대) · 맨 아래 한 줄.
 * 막대는 그림일 뿐이라 숨기고, 화면 낭독기는 '떡볶이, 내 선택, 12표 55%'처럼 글자로 읽는다
 */
function PollCard({ data }: { data: PollData }) {
  const options = parsePollScript(data.script);
  const voted = options.some((option) => option.votes !== null);
  const total = pollTotal(options);
  const top = Math.max(0, ...options.map((option) => option.votes ?? 0));
  const status = pollStatus(data, options);
  // 투표 전이거나 내가 고른 게 있으면 동그라미 자리를 둔다 (글자 줄이 맞게)
  const marks = !voted || options.some((option) => option.mine);

  return (
    <div className={cn(CARD, 'bg-(--wn-poll-bg) px-4 pt-4 pb-3.5')}>
      {data.badge.trim() ? (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-(--wn-poll-accent)">
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="size-3.5 shrink-0">
            <rect x="4" y="12" width="4" height="8" rx="1" />
            <rect x="10" y="4" width="4" height="16" rx="1" />
            <rect x="16" y="8" width="4" height="12" rx="1" />
          </svg>
          <span className="min-w-0">{data.badge}</span>
        </div>
      ) : null}
      {data.question.trim() ? <div className="mt-1.5 text-[17px] leading-snug font-bold break-keep">{data.question}</div> : null}
      {options.length > 0 ? (
        <ul aria-label="선택지" className="mt-3 space-y-2">
          {options.map((option, index) => {
            const percentLabel = pollPercentLabel(option, total);
            // 막대는 반올림 전 비율로, 표가 조금이라도 있으면 가는 막대라도 보이게
            const share = total > 0 && option.votes ? (option.votes / total) * 100 : 0;
            const leading = voted && top > 0 && option.votes === top;
            return (
              <li
                key={index}
                className={cn(
                  'relative overflow-hidden rounded-xl border',
                  option.mine ? 'border-(--wn-poll-accent)' : 'border-(--wn-poll-border)',
                )}
              >
                {voted ? (
                  <span
                    aria-hidden="true"
                    className={cn(
                      'absolute inset-y-0 left-0',
                      share > 0 && 'min-w-[3px]',
                      option.mine ? 'bg-(--wn-poll-bar-mine)' : 'bg-(--wn-poll-bar)',
                    )}
                    style={{ width: `${share}%` }}
                  />
                ) : null}
                <span className="relative flex items-center gap-2.5 px-3 py-2.5 text-sm">
                  {marks ? (
                    option.mine ? (
                      <svg viewBox="0 0 20 20" aria-hidden="true" className="size-[18px] shrink-0">
                        <circle cx="10" cy="10" r="9" fill="var(--wn-poll-accent)" />
                        <path d="M6 10.4l2.6 2.6L14.2 7.4" fill="none" stroke="var(--wn-poll-bg)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      <span aria-hidden="true" className="size-[18px] shrink-0 rounded-full border-[1.5px] border-(--wn-poll-muted)" />
                    )
                  ) : null}
                  <span className={cn('min-w-0 flex-1 break-keep', leading && 'font-bold')}>
                    {option.text}
                    {option.mine ? <span className="sr-only">, 내 선택</span> : null}
                  </span>
                  {voted ? (
                    <span className="shrink-0 text-xs text-(--wn-poll-muted) tabular-nums">
                      <span className="sr-only">, </span>
                      {/* 표 수와 % 사이는 진짜 띄어쓰기 (낭독기가 '12표55%'로 붙여 읽지 않게) */}
                      {option.label}{' '}
                      <span className={cn('ml-0.5', leading && 'font-bold text-(--wn-fg)')}>
                        {percentLabel === '<1%' ? (
                          <>
                            <span aria-hidden="true">&lt;1%</span>
                            <span className="sr-only">1% 미만</span>
                          </>
                        ) : (
                          percentLabel
                        )}
                      </span>
                    </span>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
      {status ? <div className="mt-3 text-xs text-(--wn-muted)">{status}</div> : null}
    </div>
  );
}

const TRANSFER_ROWS: Array<{ name: 'to' | 'from' | 'memo' | 'date'; label: string; maxLength: number; optional: boolean }> = [
  { name: 'to', label: '받는 분', maxLength: 40, optional: false },
  { name: 'from', label: '보낸 계좌', maxLength: 60, optional: true },
  { name: 'memo', label: '메모', maxLength: 60, optional: true },
  { name: 'date', label: '일시', maxLength: 40, optional: true },
];

/**
 * 송금 완료: 은행 앱의 송금 결과 화면 (위쪽 은행 이름 · 체크 · 완료 문구 · 큰 금액 · 받는 분·보낸 계좌·메모·일시).
 * 아래 목록은 화면 낭독기가 '받는 분 김수진'처럼 짝지어 읽도록 dl. 에디터에서는 field로 카드 위에서 바로 고친다
 */
export function TransferCard({ data, field }: { data: TransferData; field?: FieldRenderer }) {
  const editing = Boolean(field);
  const slot = (name: keyof TransferData, label: string, maxLength: number, className: string, wrap = false) =>
    field ? (
      field({ name, value: data[name], label, placeholder: label, maxLength, className, wrap })
    ) : (
      <span className={className}>{data[name]}</span>
    );
  const rows = TRANSFER_ROWS.filter((row) => editing || data[row.name].trim());

  return (
    <div className={cn(CARD, 'bg-(--wn-transfer-bg) px-5 pt-4 pb-5')}>
      {editing || data.bank.trim() ? (
        <div className="text-[13px] font-bold text-(--wn-transfer-accent)">{slot('bank', '은행·앱 이름 (비우면 안 보여요)', 30, 'max-w-full')}</div>
      ) : null}
      <div className="mt-4 flex flex-col items-center text-center">
        <svg viewBox="0 0 48 48" aria-hidden="true" className="size-12">
          <circle cx="24" cy="24" r="22" fill="var(--wn-transfer-accent)" />
          <path d="M14.5 24.5l6.5 6.5 12.5-13.5" fill="none" stroke="var(--wn-transfer-accent-fg)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div className="mt-3 max-w-full text-[15px] font-semibold text-(--wn-muted)">{slot('status', '완료 문구', 30, 'max-w-full text-center')}</div>
        <div className="mt-0.5 max-w-full text-[28px] leading-tight font-bold break-all tabular-nums">{slot('amount', '금액', 30, 'max-w-full text-center', true)}</div>
      </div>
      {rows.length > 0 ? (
        <dl className="mt-5 space-y-2 border-t border-(--wn-line) pt-4 text-sm">
          {rows.map((row) => (
            <div key={row.name} className="flex items-baseline justify-between gap-4">
              <dt className="shrink-0 text-(--wn-muted)">{row.label}</dt>
              <dd className="min-w-0 text-right break-keep">
                {slot(row.name, row.optional ? `${row.label} (비우면 안 보여요)` : row.label, row.maxLength, 'max-w-full text-right', true)}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}

/**
 * 알람: 휴대폰 알람이 울리는 화면 (날짜 · 오전/오후 · 큰 시각 · 알람 이름 · 반복 요일 · '다시 알림'·'중지' 모양).
 * 아래 두 단추는 화면 모양일 뿐이라 진짜 단추가 아니라 글자로 그린다.
 * 반복 요일은 일~토 일곱 글자 줄에서 칠하고(그림이라 낭독기에서는 숨김), 낭독기에는 '반복 월, 화, 수'로 읽힌다
 */
export function AlarmCard({ data, field }: { data: AlarmData; field?: FieldRenderer }) {
  const editing = Boolean(field);
  const slot = (name: keyof AlarmData, label: string, maxLength: number, className: string, wrap = false) =>
    field ? (
      field({ name, value: data[name], label, placeholder: label, maxLength, className, wrap })
    ) : (
      <span className={className}>{data[name]}</span>
    );
  const repeat = editing ? null : alarmDays(data.days);

  return (
    // @container: 큰 시각 글씨를 카드 너비에 맞춰 줄인다 (좁은 화면 에디터에서 '12:59:59'가 칸 밖으로 잘리지 않게, 넓으면 64px 그대로)
    <div className="wn-block @container mx-auto w-full max-w-[340px] rounded-[28px] border border-(--wn-border) bg-linear-to-b from-(--wn-alarm-bg-from) to-(--wn-alarm-bg-to) px-6 pt-6 pb-6 text-center text-(--wn-alarm-fg) shadow-sm">
      {editing || data.date.trim() ? (
        <div className="text-[13px] font-medium text-(--wn-alarm-muted)">{slot('date', '날짜 (비우면 안 보여요)', 40, 'max-w-full text-center')}</div>
      ) : null}
      <div className="mt-5 flex flex-col items-center">
        {editing || data.period.trim() ? (
          <div className="text-[17px] font-medium text-(--wn-alarm-muted)">{slot('period', '오전·오후 (비우면 안 보여요)', 10, 'max-w-full text-center')}</div>
        ) : null}
        <div className="max-w-full text-[min(64px,25cqi)] leading-none font-light tracking-tight tabular-nums">{slot('time', '시각', 10, 'max-w-full text-center')}</div>
      </div>
      {editing || data.label.trim() ? (
        <div className="mt-4 text-[16px] font-semibold break-keep">{slot('label', '알람 이름 (비우면 안 보여요)', 40, 'max-w-full text-center', true)}</div>
      ) : null}
      {editing ? (
        <div className="mt-3 text-[13px] text-(--wn-alarm-muted)">
          {slot('days', '반복 요일 (월 화 수 · 매일 · 평일 · 주말)', 40, 'max-w-full text-center', true)}
        </div>
      ) : repeat ? (
        <div className="mt-3 text-[13px] font-semibold">
          <span className="sr-only">반복 {repeat.spoken}</span>
          <span aria-hidden="true" className="inline-flex gap-2">
            {WEEKDAYS.map((day, index) => (
              <span key={day} className={repeat.days[index] ? 'text-(--wn-alarm-accent)' : 'font-normal text-(--wn-alarm-muted)'}>
                {day}
              </span>
            ))}
          </span>
        </div>
      ) : data.days.trim() ? (
        <div className="mt-3 text-[13px] break-keep text-(--wn-alarm-muted)">{data.days}</div>
      ) : null}
      {/* 화면 모양만 (누르는 단추가 아님) */}
      <div className="mt-7 flex gap-3 text-[15px] font-semibold">
        <span className="flex-1 rounded-full bg-(--wn-alarm-chip-bg) py-3">다시 알림</span>
        <span className="flex-1 rounded-full bg-(--wn-alarm-accent) py-3 text-(--wn-alarm-accent-fg)">중지</span>
      </div>
    </div>
  );
}

/**
 * 일정: 캘린더 앱 일정 카드. 날짜가 '11월 14일 토요일'처럼 읽히면 왼쪽에 달 · 큰 날 · 요일 타일(그림이라 낭독기는 날짜 글을 읽음),
 * 오른쪽에 제목 · 시간 · 장소 · 알림 · 메모. 에디터에서는 field로 카드 위에서 바로 고친다
 */
export function EventCard({ data, field }: { data: EventData; field?: FieldRenderer }) {
  const editing = Boolean(field);
  const slot = (name: keyof EventData, label: string, maxLength: number, className: string, wrap = false, multiline = false) =>
    field ? (
      field({ name, value: data[name], label, placeholder: label, maxLength, className, wrap, multiline })
    ) : (
      <span className={className}>{data[name]}</span>
    );
  const parts = eventDateParts(data.date);
  const icon = 'mt-0.5 size-4 shrink-0 text-(--wn-event-accent)';

  return (
    <div className="wn-block mx-auto w-full max-w-[420px] rounded-[22px] border border-(--wn-border) bg-(--wn-event-bg) p-4 text-(--wn-fg) shadow-sm">
      {editing || data.calendar.trim() ? (
        <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-(--wn-muted)">
          <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full bg-(--wn-event-accent)" />
          {slot('calendar', '캘린더 이름 (비우면 안 보여요)', 30, 'max-w-full')}
        </div>
      ) : null}
      <div className="flex gap-3.5">
        {parts ? (
          <div aria-hidden="true" className="flex w-16 shrink-0 flex-col items-center self-start rounded-2xl bg-(--wn-event-tile-bg) py-2.5">
            <span className="text-xs font-semibold text-(--wn-event-accent)">{parts.month}월</span>
            <span className="text-[28px] leading-tight font-bold tabular-nums">{parts.day}</span>
            {parts.weekday ? <span className="text-xs text-(--wn-muted)">{parts.weekday}요일</span> : null}
          </div>
        ) : null}
        <div className="min-w-0 flex-1 space-y-1.5 border-l-[3px] border-(--wn-event-accent) pl-3">
          <div className="text-[17px] leading-snug font-bold break-keep">{slot('title', '일정 제목', 80, 'block w-full', true)}</div>
          {/* 날짜: 타일로 보여도 낭독기에는 글로 읽어 주고, 타일로 못 읽으면 글 그대로 보여 준다 */}
          {editing ? (
            <div className="text-[13px] text-(--wn-muted)">{slot('date', '날짜 (예: 11월 14일 토요일)', 40, 'block w-full', true)}</div>
          ) : data.date.trim() ? (
            <div className={parts ? 'sr-only' : 'text-[13px] text-(--wn-muted)'}>{data.date}</div>
          ) : null}
          {editing || data.time.trim() ? (
            <div className="flex items-start gap-1.5 text-sm">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className={icon}>
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </svg>
              {slot('time', '시간 (비우면 안 보여요)', 40, 'block w-full', true)}
            </div>
          ) : null}
          {editing || data.place.trim() ? (
            <div className="flex items-start gap-1.5 text-sm">
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={icon}>
                <path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />
              </svg>
              {editing ? null : <span className="sr-only">장소 </span>}
              {slot('place', '장소 (비우면 안 보여요)', 80, 'block w-full break-keep', true)}
            </div>
          ) : null}
          {editing || data.alert.trim() ? (
            <div className="flex items-start gap-1.5 text-sm">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={icon}>
                <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              </svg>
              {editing ? null : <span className="sr-only">알림 </span>}
              {slot('alert', '알림 (비우면 안 보여요)', 40, 'block w-full', true)}
            </div>
          ) : null}
          {editing || data.note.trim() ? (
            <div className="pt-1 text-[13px] whitespace-pre-wrap text-(--wn-muted)">{slot('note', '메모 (비우면 안 보여요)', 200, 'block w-full whitespace-pre-wrap', false, true)}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/**
 * 아이템 획득: 게임·판타지 소설의 아이템 창. 등급 이름으로 테두리·이름·강조 줄 색을 고른다 (itemGradeKey).
 * 능력치·설명은 시스템 창과 같은 대본 규칙 ('공격력: +12' · 「강조」 · '---' 구분선 · 그냥 쓰면 설명 글)
 */
function ItemCard({ data }: { data: ItemData }) {
  const lines = parseSystemScript(data.script);
  const grade = itemGradeKey(data.grade);
  const meta = data.grade.trim() || data.category.trim();

  return (
    <div
      style={{ '--item-grade': `var(--wn-item-${grade})` } as CSSProperties}
      className="wn-block mx-auto w-full max-w-[420px] rounded-2xl border-[1.5px] border-(--item-grade) bg-(--wn-item-bg) px-5 py-4 text-(--wn-item-fg) shadow-[0_0_22px_color-mix(in_srgb,var(--item-grade)_22%,transparent)]"
    >
      {data.title.trim() ? (
        <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-(--wn-item-muted)">
          <span aria-hidden="true">✦</span>
          {data.title}
        </div>
      ) : null}
      <div className="flex items-center gap-3.5">
        <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--item-grade)_14%,transparent)] text-(--item-grade)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" className="size-6">
            <path d="M12 2.5l7.5 7.5-7.5 11.5L4.5 10z" />
            <path d="M4.5 10h15M12 2.5L9 10l3 11.5L15 10z" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[18px] leading-snug font-bold break-keep text-(--item-grade)">{data.name}</div>
          {meta ? (
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-(--wn-item-muted)">
              {data.grade.trim() ? (
                <span className="rounded-md border border-(--item-grade) px-1.5 py-px font-bold text-(--item-grade)">
                  <span className="sr-only">등급 </span>
                  {data.grade.trim()}
                </span>
              ) : null}
              {data.category.trim() ? <span className="break-keep">{data.category.trim()}</span> : null}
            </div>
          ) : null}
        </div>
      </div>
      {lines.length > 0 ? (
        <div className="mt-3.5 space-y-1.5 border-t border-(--wn-item-line) pt-3.5 text-sm">
          {lines.map((line, index) => {
            switch (line.type) {
              case 'stat':
                return (
                  <div key={index} className="flex items-baseline justify-between gap-4">
                    <span className="min-w-0 text-(--wn-item-muted)">{line.label}</span>
                    <span className="min-w-0 text-right font-semibold tabular-nums">{line.value}</span>
                  </div>
                );
              case 'emphasis':
                return (
                  <div key={index} className="py-0.5 font-bold text-(--item-grade)">
                    {line.text}
                  </div>
                );
              case 'divider':
                return (
                  <div key={index} role="separator" className="flex items-center gap-3 pt-1.5 pb-0.5 text-xs font-semibold text-(--wn-item-muted)">
                    <span aria-hidden="true" className="h-px flex-1 bg-(--wn-item-line)" />
                    {line.text ? (
                      <>
                        <span>{line.text}</span>
                        <span aria-hidden="true" className="h-px flex-1 bg-(--wn-item-line)" />
                      </>
                    ) : null}
                  </div>
                );
              case 'text':
                return (
                  <div key={index} className="leading-relaxed break-keep text-(--wn-item-muted)">
                    {line.text}
                  </div>
                );
            }
          })}
        </div>
      ) : null}
    </div>
  );
}

/**
 * 음악 재생: 음악 앱의 '지금 재생 중' 화면 (앨범 그림 자리 · 곡 제목 · 가수 · 가사 · 재생 막대와 시간 · 재생 단추 모양).
 * 막대 길이는 적은 재생 위치/전체 길이로 정하고(musicProgress), 시각으로 못 읽으면 막대 없이 적은 글자만.
 * 아래 단추들은 화면 모양일 뿐이라 그림으로만 그리고 낭독기에서는 숨긴다 (낭독기에는 '재생 위치 1:24 / 3:45')
 */
export function MusicCard({ data, field }: { data: MusicData; field?: FieldRenderer }) {
  const editing = Boolean(field);
  const slot = (name: keyof MusicData, label: string, maxLength: number, className: string, wrap = false, multiline = false) =>
    field ? (
      field({ name, value: data[name], label, placeholder: label, maxLength, className, wrap, multiline })
    ) : (
      <span className={className}>{data[name]}</span>
    );
  const progress = musicProgress(data.elapsed, data.duration);
  const percent = `${((progress ?? 0) * 100).toFixed(1)}%`;
  const elapsed = data.elapsed.trim() || (progress !== null ? '0:00' : '');
  const duration = data.duration.trim();
  const icon = 'size-5 shrink-0';

  return (
    <div className="wn-block mx-auto w-full max-w-[380px] rounded-[26px] border border-(--wn-border) bg-linear-to-b from-(--wn-music-bg-from) to-(--wn-music-bg-to) px-5 pt-4 pb-5 text-(--wn-music-fg) shadow-sm">
      {editing || data.app.trim() ? (
        <div className="mb-3.5 flex items-center gap-1.5 text-xs font-semibold text-(--wn-music-muted)">
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="size-3.5 shrink-0 text-(--wn-music-accent)">
            <rect x="3" y="10" width="4" height="11" rx="1.5" />
            <rect x="10" y="3" width="4" height="18" rx="1.5" />
            <rect x="17" y="13" width="4" height="8" rx="1.5" />
          </svg>
          {slot('app', '위쪽 문구 (비우면 안 보여요)', 30, 'max-w-full')}
        </div>
      ) : null}
      <div className="flex items-center gap-3.5">
        <span
          aria-hidden="true"
          className="grid size-16 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-(--wn-music-art-from) to-(--wn-music-art-to) text-white shadow-sm"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-7">
            <path d="M9 18V5l11-2v13" />
            <circle cx="6.5" cy="18" r="2.5" />
            <circle cx="17.5" cy="16" r="2.5" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[17px] leading-snug font-bold break-keep">{slot('title', '곡 제목', 80, 'block w-full', true)}</div>
          <div className="mt-0.5 text-sm break-keep text-(--wn-music-muted)">{slot('artist', '가수', 60, 'block w-full', true)}</div>
        </div>
      </div>
      {editing || data.lyric.trim() ? (
        <div className="mt-4 rounded-xl bg-(--wn-music-chip-bg) px-3.5 py-2.5 text-[15px] leading-relaxed font-medium break-keep whitespace-pre-wrap">
          {editing ? null : <span className="sr-only">가사 </span>}
          {slot('lyric', '가사 (비우면 안 보여요)', 200, 'block w-full whitespace-pre-wrap', false, true)}
        </div>
      ) : null}
      {editing || elapsed || duration ? (
        <div className="mt-4">
          {editing || progress !== null ? (
            <div aria-hidden="true" className="relative h-1 rounded-full bg-(--wn-music-track)">
              <div className="h-full rounded-full bg-(--wn-music-accent)" style={{ width: percent }} />
              <div className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-(--wn-music-accent) shadow-sm" style={{ left: percent }} />
            </div>
          ) : null}
          <div className="mt-2 flex flex-wrap justify-between gap-x-3 gap-y-1 text-xs text-(--wn-music-muted) tabular-nums">
            {editing ? (
              <>
                {/* 좁은 화면에서 두 칸이 한 줄에 안 들어가면 '전체 길이'를 아래 줄 오른쪽으로 */}
                {slot('elapsed', '재생 위치 (예: 1:24)', 10, 'min-w-12')}
                {slot('duration', '전체 길이 (예: 3:45)', 10, 'ml-auto min-w-12 text-right')}
              </>
            ) : (
              <>
                <span className="sr-only">재생 위치 {[elapsed, duration].filter(Boolean).join(' / ')}</span>
                <span aria-hidden="true">{elapsed}</span>
                <span aria-hidden="true">{duration}</span>
              </>
            )}
          </div>
        </div>
      ) : null}
      {/* 화면 모양만 (누르는 단추가 아님): 섞어 듣기 · 이전 곡 · 일시 정지 · 다음 곡 · 반복 */}
      <div aria-hidden="true" className="mt-4 flex items-center justify-between px-1.5">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cn(icon, 'text-(--wn-music-muted)')}>
          <path d="M3 7h3.5c2 0 3.2 1 4.3 2.6l2.4 4.8C14.3 16 15.5 17 17.5 17H21" />
          <path d="M3 17h3.5c1.4 0 2.4-.5 3.3-1.4M14.2 8.4c.9-.9 1.9-1.4 3.3-1.4H21" />
          <path d="M18 4l3 3-3 3M18 14l3 3-3 3" />
        </svg>
        <svg viewBox="0 0 24 24" fill="currentColor" className="size-6 shrink-0">
          <path d="M18 5.5v13a1 1 0 0 1-1.55.83L7.5 13.2V18a1 1 0 0 1-2 0V6a1 1 0 0 1 2 0v4.8l8.95-6.13A1 1 0 0 1 18 5.5z" />
        </svg>
        <span className="grid size-14 shrink-0 place-items-center rounded-full bg-(--wn-music-accent) text-(--wn-music-accent-fg) shadow-sm">
          <svg viewBox="0 0 24 24" fill="currentColor" className="size-6">
            <rect x="6.5" y="5" width="4" height="14" rx="1.2" />
            <rect x="13.5" y="5" width="4" height="14" rx="1.2" />
          </svg>
        </span>
        <svg viewBox="0 0 24 24" fill="currentColor" className="size-6 shrink-0">
          <path d="M6 5.5v13a1 1 0 0 0 1.55.83l8.95-6.13V18a1 1 0 0 0 2 0V6a1 1 0 0 0-2 0v4.8L7.55 4.67A1 1 0 0 0 6 5.5z" />
        </svg>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cn(icon, 'text-(--wn-music-muted)')}>
          <path d="M17 3l3 3-3 3" />
          <path d="M4 11.5V10a4 4 0 0 1 4-4h12" />
          <path d="M7 21l-3-3 3-3" />
          <path d="M20 12.5V14a4 4 0 0 1-4 4H4" />
        </svg>
      </div>
    </div>
  );
}

/** 순위 오르내림 표시: ▲ 빨강 · ▼ 파랑 · NEW 배지 · - 회색 (색만으로 구분하지 않게 기호·글자도) */
function RankChangeMark({ change }: { change: RankChange }) {
  if (!change) return null;
  const spoken = <span className="sr-only">, {rankChangeSpoken(change)}</span>;
  if (change.dir === 'new')
    return (
      <>
        <span aria-hidden="true" className="rounded-[5px] border border-(--wn-rank-new) px-1 text-[10px] leading-4 font-bold text-(--wn-rank-new)">
          NEW
        </span>
        {spoken}
      </>
    );
  return (
    <>
      <span
        aria-hidden="true"
        className={cn(
          'text-xs font-semibold tabular-nums',
          change.dir === 'up' ? 'text-(--wn-rank-up)' : change.dir === 'down' ? 'text-(--wn-rank-down)' : 'text-(--wn-rank-muted)',
        )}
      >
        {change.dir === 'same' ? '–' : rankChangeText(change)}
      </span>
      {spoken}
    </>
  );
}

/**
 * 실시간 순위: 방송 후원 랭킹·게임 순위·음원 차트 같은 순위표 (제목 · 표시 · 순위 줄).
 * 순위 줄은 대본으로 한 줄씩 (parseRankScript): 1~3위 번호는 강조색, '*' 줄은 바탕을 칠해 주인공 자리를 보여 준다.
 * 낭독기에는 '1위, 밥알, 1,250,000원, 2계단 오름'처럼 읽힌다
 */
function RankCard({ data }: { data: RankData }) {
  const lines = parseRankScript(data.script);
  const title = data.title.trim();
  const badge = data.badge.trim();
  // 오르내림이 하나라도 있으면 모든 줄에 그 자리를 둬서 점수 줄이 맞게
  const changes = lines.some((line) => line.type === 'row' && line.change);

  return (
    <div className={cn(CARD, 'bg-(--wn-rank-bg) px-3.5 pt-4 pb-3')}>
      {title || badge ? (
        // 좁으면 표시를 제목 아래로 (제목이 한 글자씩 세로로 쌓이지 않게)
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1 px-1.5">
          <span className="min-w-32 flex-1 text-[17px] leading-snug font-bold break-keep">{title}</span>
          {badge ? (
            <span className="mt-0.5 max-w-full shrink-0 rounded-full bg-(--wn-rank-badge-bg) px-2 py-0.5 text-xs font-bold text-(--wn-rank-badge-fg)">{badge}</span>
          ) : null}
        </div>
      ) : null}
      {lines.length > 0 ? (
        <ol aria-label="순위" className={cn('space-y-0.5', title || badge ? 'mt-3' : '')}>
          {lines.map((line, index) =>
            line.type === 'gap' ? (
              <li key={index} className="py-0.5 text-center text-sm leading-none text-(--wn-rank-muted)">
                <span aria-hidden="true">⋮</span>
                <span className="sr-only">중간 생략</span>
              </li>
            ) : (
              <li key={index} className={cn('flex items-center gap-3 rounded-xl px-1.5 py-2', line.mine && 'bg-(--wn-rank-me-bg) font-semibold')}>
                <span className={cn('min-w-7 shrink-0 text-center text-[17px] font-bold tabular-nums', line.rank <= 3 ? 'text-(--wn-rank-top)' : 'text-(--wn-rank-muted)')}>
                  {line.rank}
                  <span className="sr-only">위,</span>
                </span>
                {/* 이름과 점수가 한 줄에 안 들어가면 점수를 아래 줄 오른쪽으로 (긴 점수가 이름 칸을 눌러 버리지 않게) */}
                <span className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-3">
                  {/* 이름 칸은 6rem부터: 그만큼도 안 남으면 점수가 아래 줄로 내려간다 (이름·점수가 둘 다 좁게 눌리지 않게) */}
                  <span className="min-w-0 flex-[1_1_6rem] break-keep">
                    {line.name}
                    {line.mine ? <span className="sr-only"> (강조)</span> : null}
                  </span>
                  {line.score ? (
                    <span className="ml-auto min-w-0 text-right text-sm tabular-nums">
                      <span className="sr-only">, </span>
                      {line.score}
                    </span>
                  ) : null}
                </span>
                {changes ? (
                  <span className="flex min-w-9 shrink-0 justify-end">
                    <RankChangeMark change={line.change} />
                  </span>
                ) : null}
              </li>
            ),
          )}
        </ol>
      ) : null}
    </div>
  );
}

/**
 * 할 일 목록: 메모 앱 체크리스트 (날짜 · 제목 · 끝낸 개수 · 항목). 항목은 대본으로 한 줄씩 (parseTodoScript).
 * 끝낸 일은 동그라미에 체크 + 취소선(색만으로 구분하지 않게), 낭독기에는 '와플 반죽 숙성시키기, 완료'처럼 읽힌다
 */
function TodoCard({ data }: { data: TodoData }) {
  const lines = parseTodoScript(data.script);
  const { done, total } = todoProgress(lines);
  const title = data.title.trim();
  const date = data.date.trim();

  return (
    <div className={cn(CARD, 'bg-(--wn-todo-bg) px-5 pt-4 pb-4')}>
      {date ? <div className="text-xs font-medium text-(--wn-todo-muted)">{date}</div> : null}
      {title || total > 0 ? (
        <div className={cn('flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5', date && 'mt-1')}>
          <span className="min-w-32 flex-1 text-[18px] leading-snug font-bold break-keep">{title}</span>
          {total > 0 ? (
            <span className="shrink-0 text-xs font-semibold text-(--wn-todo-muted) tabular-nums">
              {done}/{total} 완료
            </span>
          ) : null}
        </div>
      ) : null}
      {/* 아무것도 안 적었으면 빈 상자 대신 한 줄 */}
      {!title && !date && lines.length === 0 ? <div className="text-sm text-(--wn-todo-muted)">할 일 없음</div> : null}
      {lines.length > 0 ? (
        <ul aria-label="할 일" className={cn('space-y-0.5', title || date || total > 0 ? 'mt-2.5' : '')}>
          {lines.map((line, index) =>
            line.type === 'section' ? (
              line.text ? (
                <li key={index} className="pt-2.5 pb-0.5 text-xs font-bold text-(--wn-todo-muted) break-keep">
                  {line.text}
                </li>
              ) : (
                <li key={index} aria-hidden="true" className="py-2">
                  <span className="block h-px bg-(--wn-todo-line)" />
                </li>
              )
            ) : (
              <li key={index} className="flex items-start gap-2.5 py-1">
                <span
                  aria-hidden="true"
                  className={cn(
                    'mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-[1.5px]',
                    line.done ? 'border-(--wn-todo-accent) bg-(--wn-todo-accent) text-(--wn-todo-accent-fg)' : 'border-(--wn-todo-muted)',
                  )}
                >
                  {line.done ? (
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="size-3">
                      <path d="M5 10.5l3.2 3.2L15 7" />
                    </svg>
                  ) : null}
                </span>
                <span className={cn('min-w-0 flex-1 leading-relaxed break-keep', line.done && 'text-(--wn-todo-muted) line-through decoration-(--wn-todo-muted)')}>
                  {line.text}
                  <span className="sr-only">{line.done ? ', 완료' : ', 미완료'}</span>
                </span>
              </li>
            ),
          )}
        </ul>
      ) : null}
    </div>
  );
}

/**
 * 명함: 가로 명함 모양 (회사 로고 자리 · 회사 · 이름 · 직함 · 전화 · 이메일 · 주소 · 손글씨 메모).
 * 명함 비율(7:4)을 기본으로 하되 글이 길면 아래로 늘어난다. 에디터에서는 field로 카드 위에서 바로 고친다
 */
export function NamecardCard({ data, field }: { data: NamecardData; field?: FieldRenderer }) {
  const editing = Boolean(field);
  const slot = (name: keyof NamecardData, label: string, maxLength: number, className: string) =>
    field ? (
      field({ name, value: data[name], label, placeholder: label, maxLength, className, wrap: true })
    ) : (
      <span className={className}>{data[name]}</span>
    );
  const show = (name: keyof NamecardData) => editing || data[name].trim() !== '';
  const initial = [...data.company.trim()][0] ?? [...data.name.trim()][0] ?? '?';
  const icon = 'mt-0.5 size-3.5 shrink-0 text-(--wn-namecard-accent)';
  const contact = show('phone') || show('email') || show('address');

  return (
    <div className="wn-block mx-auto w-full max-w-[380px]">
      {/* 넘치는 글을 자르지 않아야(overflow 기본값) 명함 비율보다 글이 길 때 카드가 아래로 늘어난다 → 위 띠는 모서리에 맞게 따로 둥글림 */}
      <div className="relative flex aspect-[7/4] flex-col rounded-xl border border-(--wn-border) bg-(--wn-namecard-bg) px-5 pt-5 pb-4 text-(--wn-fg) shadow-md">
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1.5 rounded-t-[11px] bg-(--wn-namecard-accent)" />
        {show('company') ? (
          <div className="flex items-center gap-2 text-[13px] font-bold text-(--wn-namecard-accent)">
            <span aria-hidden="true" className="grid size-6 shrink-0 place-items-center rounded-md bg-(--wn-namecard-accent) text-xs text-(--wn-namecard-accent-fg)">
              {initial}
            </span>
            {slot('company', '회사·소속 (비우면 안 보여요)', 40, 'min-w-0 max-w-full break-keep')}
          </div>
        ) : null}
        <div className="mt-auto pt-4">
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
            <span className="max-w-full text-[22px] leading-tight font-bold break-keep">{slot('name', '이름', 30, 'max-w-full')}</span>
            {show('role') ? <span className="max-w-full text-[13px] break-keep text-(--wn-namecard-muted)">{slot('role', '직함 (비우면 안 보여요)', 40, 'max-w-full')}</span> : null}
          </div>
          {contact ? (
            <div className="mt-2.5 space-y-1 border-t border-(--wn-namecard-line) pt-2.5 text-[12.5px] text-(--wn-namecard-muted)">
              {show('phone') ? (
                <div className="flex items-start gap-1.5">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={icon}>
                    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
                  </svg>
                  {editing ? null : <span className="sr-only">전화 </span>}
                  {slot('phone', '전화 (비우면 안 보여요)', 30, 'min-w-0 max-w-full tabular-nums')}
                </div>
              ) : null}
              {show('email') ? (
                <div className="flex items-start gap-1.5">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={icon}>
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path d="M3 7l9 6 9-6" />
                  </svg>
                  {editing ? null : <span className="sr-only">이메일 </span>}
                  {slot('email', '이메일 (비우면 안 보여요)', 60, 'min-w-0 max-w-full break-all')}
                </div>
              ) : null}
              {show('address') ? (
                <div className="flex items-start gap-1.5">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={icon}>
                    <path d="M12 21s-7-7.5-7-12a7 7 0 0 1 14 0c0 4.5-7 12-7 12z" />
                    <circle cx="12" cy="9" r="2.5" />
                  </svg>
                  {editing ? null : <span className="sr-only">주소 </span>}
                  {slot('address', '주소 (비우면 안 보여요)', 80, 'min-w-0 max-w-full break-keep')}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
        {show('memo') ? (
          // 손으로 적은 메모 (펜 글씨, 살짝 기울임 — 고치는 동안에는 바로 세워서)
          <div className={cn('mt-3 text-right font-pen text-[22px] leading-7 text-(--wn-namecard-ink)', !editing && '-rotate-2')}>
            {editing ? null : <span className="sr-only">손글씨 메모 </span>}
            {slot('memo', '손글씨 메모 (비우면 안 보여요)', 60, 'max-w-full text-right')}
          </div>
        ) : null}
      </div>
    </div>
  );
}

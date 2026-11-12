import type { ReactNode } from 'react';
import {
  CHAT_COLORS,
  chatColorKey,
  commentDisplayName,
  isMine,
  isPostAuthor,
  kakaoTitle,
  parseComments,
  parsePushScript,
  parseReceiptScript,
  parseScript,
  parseSearchResults,
  parseSystemScript,
  postCommentCount,
  receiptTotal,
  scriptSpeakers,
  smsContact,
  splitMailSender,
  type CallData,
  type ChatData,
  type DonationData,
  type KakaoData,
  type LiveData,
  type MailData,
  type NewsData,
  type NoteData,
  type PostData,
  type PushData,
  type ReceiptData,
  type SearchData,
  type SmsData,
  type SnsData,
  type StoryBlock,
  type SystemData,
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
  multiline?: boolean;
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
  }
}

export function LiveCard({ data, field }: { data: LiveData; field?: FieldRenderer }) {
  const editing = Boolean(field);
  const slot = (name: keyof LiveData, label: string, maxLength: number, className: string) =>
    field ? (
      field({ name, value: data[name], label, placeholder: label, maxLength, className })
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
        <div className="mt-2">{slot('title', '방송 제목', 120, 'block w-full text-[21px] leading-snug font-bold whitespace-pre-wrap')}</div>
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
                  <span aria-hidden="true" className="h-px flex-1 bg-(--wn-sys-line)" />
                  {line.text ? <span>{line.text}</span> : null}
                  <span aria-hidden="true" className="h-px flex-1 bg-(--wn-sys-line)" />
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
  const slot = (name: keyof MailData, label: string, maxLength: number, className: string, multiline = false) =>
    field ? (
      field({ name, value: data[name], label, placeholder: label, maxLength, className, multiline })
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
              {slot('from', '보낸 사람 (이름 <주소>)', 80, 'max-w-full text-[14px] font-semibold')}
              <div className="flex max-w-full flex-wrap items-center gap-x-1 text-(--wn-muted)">
                <span className="shrink-0">받는 사람</span>
                {/* 두 글자 이름도 누르기 쉽게 너비는 32px 이상 */}
                {slot('to', '받는 사람 (비우면 안 보여요)', 80, 'max-w-full min-w-8')}
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
          {slot('attachment', '첨부 파일 이름 (비우면 안 보여요)', 80, editing ? 'max-w-full min-w-8' : 'min-w-0 truncate')}
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

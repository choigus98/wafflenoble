import type { ReactNode } from 'react';
import {
  CHAT_COLORS,
  chatColorKey,
  isMine,
  kakaoTitle,
  parseScript,
  scriptSpeakers,
  type ChatData,
  type DonationData,
  type KakaoData,
  type LiveData,
  type StoryBlock,
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

import {
  CHAT_COLORS,
  type ChatData,
  type DonationData,
  type KakaoData,
  type LiveData,
  type StoryBlock,
} from '@/lib/story-blocks';
import { cn } from '@/lib/utils';

// 템플릿 카드. 상태가 없어서 열람 화면(서버)과 에디터 미리보기(브라우저)가 같이 쓴다.
// 기기 화면을 흉내 내므로 사이트 테마와 상관없이 항상 어두운 색으로 그린다.
// 열람 화면의 .novel-body p 스타일이 끼어들지 않도록 안쪽에는 p 태그를 쓰지 않는다.

const CARD = 'wn-block mx-auto w-full max-w-[460px] rounded-[22px] border border-white/10 text-[#f2f2f5]';

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

function LiveCard({ data }: { data: LiveData }) {
  return (
    <div className={cn(CARD, 'bg-[#1f212b] px-5 py-4')}>
      <div className="flex items-start justify-between gap-3">
        <span className="pt-1 text-[17px] font-bold">{data.streamer}</span>
        {data.badge ? (
          <span className="shrink-0 rounded-full bg-[#4a1b20] px-3 py-1 text-[13px] font-bold tracking-wide text-[#ff5b61]">
            {data.badge}
          </span>
        ) : null}
      </div>
      {data.title ? <div className="mt-2 text-[21px] leading-snug font-bold whitespace-pre-wrap">{data.title}</div> : null}
      <div className="mt-3 flex items-center justify-between gap-3 text-sm">
        {data.viewers ? (
          <span className="flex items-center gap-1.5 font-medium text-[#ff95b0]">
            <span aria-hidden="true" className="size-3 rounded-full border-2 border-[#ffd3df] bg-[#ff95b0]" />
            시청자 {data.viewers}명
          </span>
        ) : (
          <span />
        )}
        {data.category ? <span className="text-white/65">{data.category}</span> : null}
      </div>
    </div>
  );
}

function ChatCard({ data }: { data: ChatData }) {
  const people = new Map(data.people.map((person) => [person.id, person]));
  const messages = data.messages.filter((message) => message.text.trim());
  return (
    <div className={cn(CARD, 'bg-[#1b1d25] px-5 pt-4 pb-5')}>
      <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3.5">
        <span className="text-[17px] font-bold">{data.title}</span>
        {data.badge ? <span className="text-[13px] font-semibold tracking-wide text-white/65">{data.badge}</span> : null}
      </div>
      <div className="space-y-3 pt-4">
        {messages.map((message) => {
          const person = people.get(message.from);
          return (
            <div key={message.id}>
              <div className="text-sm font-bold" style={{ color: CHAT_COLORS[person?.color ?? 'blue'] }}>
                {person?.name}
              </div>
              <div className="mt-0.5 whitespace-pre-wrap">{message.text}</div>
            </div>
          );
        })}
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

function DonationCard({ data }: { data: DonationData }) {
  const footer = data.footer.trim() || `${data.donor} 님이 치즈 후원을 보냈습니다.`;
  return (
    <div className={cn(CARD, 'bg-black px-5 py-4')}>
      <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3.5">
        <span className="flex items-center gap-2 text-base font-bold">
          <SignalIcon className="size-5 shrink-0 text-[#1fca70]" />
          {data.platform}
        </span>
        {data.badge ? (
          <span className="shrink-0 rounded-full bg-[#0d3320] px-3 py-1 text-[13px] font-semibold text-[#22d374]">
            {data.badge}
          </span>
        ) : null}
      </div>
      <div className="flex items-baseline justify-between gap-3 pt-4">
        <span className="text-[17px] font-bold">{data.donor}</span>
        <span className="text-[26px] leading-none font-extrabold tracking-tight text-[#1fca70] tabular-nums">
          {data.amount}
        </span>
      </div>
      {data.message ? (
        <div className="mt-3.5 rounded-2xl bg-[#26272b] px-4 py-3.5 leading-relaxed whitespace-pre-wrap">{data.message}</div>
      ) : null}
      <div className="mt-3 text-right text-xs text-white/55">{footer}</div>
    </div>
  );
}

function KakaoCard({ data }: { data: KakaoData }) {
  const people = new Map(data.people.map((person) => [person.id, person]));
  const other = data.people.find((person) => person.id !== data.meId);
  const title = data.mode === 'dm' ? other?.name : data.room;
  const messages = data.messages.filter((message) => message.text.trim());
  return (
    <div className={cn(CARD, 'overflow-hidden bg-black')}>
      <div className="bg-[#252527] px-4 py-3 text-center">
        <div className="text-base font-bold">{title}</div>
        {data.mode === 'group' && data.memberCount ? (
          <div className="mt-0.5 text-xs text-white/55">{data.memberCount}명 참여 중</div>
        ) : null}
      </div>
      <div className="px-4 pt-2 pb-5">
        {data.date ? (
          <div className="flex justify-center pt-2">
            <span className="rounded-full bg-[#252527] px-3 py-1 text-xs text-white/80">{data.date}</span>
          </div>
        ) : null}
        {messages.map((message, index) => {
          const mine = message.from === data.meId;
          const startsRun = index === 0 || messages[index - 1].from !== message.from;
          return (
            <div
              key={message.id}
              className={cn('flex flex-col', mine ? 'items-end' : 'items-start', startsRun ? 'mt-4' : 'mt-1.5')}
            >
              {!mine && startsRun ? (
                <span className="mb-1 ml-0.5 text-xs text-white/70">{people.get(message.from)?.name}</span>
              ) : null}
              <div
                className={cn(
                  'max-w-[80%] rounded-[18px] px-3.5 py-2 leading-snug whitespace-pre-wrap',
                  mine ? 'bg-[#f6b8cd] text-[#1d1a1b]' : 'bg-[#2c2c2e] text-white',
                )}
              >
                {message.text}
              </div>
              {message.time ? <span className="mt-1 text-[11px] text-white/50">{message.time}</span> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

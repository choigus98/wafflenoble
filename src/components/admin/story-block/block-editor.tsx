'use client';

import { useEffect, useRef, useState, type KeyboardEvent, type Ref } from 'react';
import { AlarmCard, CallCard, DonationCard, EventCard, LiveCard, LocationCard, MailCard, NewsCard, NoteCard, StoryBlockView, TransferCard, type FieldRenderer } from '@/components/story-block-view';
import { Button } from '@/components/ui';
import {
  CALL_DETAIL_DEFAULT,
  CHAT_COLORS,
  CHAT_COLOR_KEYS,
  LIMITS,
  chatColorKey,
  commentSpeakers,
  isMine,
  isPostAuthor,
  kakaoTitle,
  parseComments,
  parsePollScript,
  parseScript,
  parseReceiptScript,
  pollStatus,
  postCommentCount,
  receiptTotal,
  renameSpeaker,
  scriptSpeakers,
  smsContact,
  templateLabel,
  type ChatColor,
  type ChatData,
  type ItemData,
  type KakaoData,
  type PollData,
  type PostData,
  type PushData,
  type ReceiptData,
  type SearchData,
  type SmsData,
  type SnsData,
  type StoryBlock,
  type SystemData,
} from '@/lib/story-blocks';
import { scrollBehavior } from '@/lib/motion';
import { cn } from '@/lib/utils';

// 입력은 화면에 바로 보이고, 문서(→ 자동저장)에는 잠깐 모았다가 반영한다 (커서 튐 방지, 저장 횟수 줄이기)
const COMMIT_DELAY_MS = 300;

type CardBlock = Extract<StoryBlock, { kind: 'live' | 'donation' | 'news' | 'call' | 'note' | 'mail' | 'location' | 'transfer' | 'alarm' | 'event' }>;
type ConversationBlock = Extract<StoryBlock, { kind: 'kakao' | 'chat' | 'post' | 'system' | 'sns' | 'search' | 'push' | 'sms' | 'receipt' | 'poll' | 'item' }>;

const TEXTAREA =
  'w-full resize-y rounded-2xl border border-line bg-surface px-4 py-3 text-base leading-relaxed text-fg field-sizing-content placeholder:text-muted/60 focus:border-accent focus:ring-3 focus:ring-accent/20 focus:outline-none';

const SCRIPT_PLACEHOLDER: Record<ConversationBlock['kind'], string> = {
  kakao: '양띵: 수진아 뭐 해? [오후 8:14]\n나: 방송 준비하고 있어요!',
  chat: '밥알: 연화님 ㅎㅇ\n감자도리: 오늘 뭐함?',
  post: '익명1: 와 이거 진짜임? [20:31]\nㄴ 글쓴이: ㅇㅇ 방금 봄',
  system: '「잃어버린 기억을 찾아라」\n제한 시간: 24시간\n--- 보상 ---\n???',
  sns: '익명1: 어디예요?? [3분 전]\n익명2: 나도 가 봄 [1분 전]',
  search: '자정에만 여는 와플 가게 후기\nwaffle.example.com/review\n골목 끝 그 가게, 가 보신 분?',
  push: '카톡 · 엄마: 어디야? [방금]\n은행: 입금 10,000원 [3분 전]',
  sms: '엄마: 어디야? [오후 11:52]\n나: 금방 가요',
  receipt: '버터 와플 ×2: 7,000원\n아메리카노: 4,500원',
  poll: '* 떡볶이: 12\n치킨: 7\n와플: 3',
  item: '공격력: +12\n「굽는 와플마다 행운 +1」\n---\n오래된 뒤집개.',
};

function useDraft<T extends StoryBlock>(block: T, onChange: (block: StoryBlock) => void) {
  const [draft, setDraft] = useState<T>(block);
  const latestRef = useRef<T>(block);
  const timerRef = useRef<number | null>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  });

  // 화면을 떠나거나 편집 창이 닫힐 때, 아직 반영 안 된 변경이 있으면 바로 반영
  useEffect(() => {
    return () => {
      if (timerRef.current === null) return;
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
      try {
        onChangeRef.current(latestRef.current);
      } catch {
        // 에디터가 먼저 사라진 경우 (페이지 이동) — 반영할 곳이 없으니 넘어간다
      }
    };
  }, []);

  function update(next: T) {
    setDraft(next);
    latestRef.current = next;
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      onChangeRef.current(latestRef.current);
    }, COMMIT_DELAY_MS);
  }

  function flush() {
    if (timerRef.current === null) return;
    window.clearTimeout(timerRef.current);
    timerRef.current = null;
    onChangeRef.current(latestRef.current);
  }

  function cancel() {
    if (timerRef.current === null) return;
    window.clearTimeout(timerRef.current);
    timerRef.current = null;
  }

  return { draft, update, flush, cancel };
}

// ─── 방송창 · 후원 알림 · 뉴스 기사 · 전화 · 쪽지 · 이메일: 카드 위에서 바로 고치기 ──────

// 작은 글씨 칸도 누르기 쉽게 높이는 24px 이상 (WCAG 2.5.8)
const INLINE_EDIT =
  'min-h-6 rounded-md bg-transparent outline-none ring-1 ring-transparent transition placeholder:text-(--wn-muted) placeholder:opacity-70 hover:ring-(--wn-border) focus:ring-2 focus:ring-accent';

/** 줄바꿈 칸(wrap)이 비어 있을 때 자리표시가 다 보이는 최소 너비 (한글 1em, 나머지 0.55em으로 어림, 칸보다 넓지 않게) */
function placeholderWidth(text: string): string {
  const em = [...text].reduce((sum, char) => sum + (/[\u3131-\u318e\uac00-\ud7a3]/.test(char) ? 1 : 0.55), 0);
  return `min(${em.toFixed(1)}em, 100%)`;
}

export function InlineCardEditor({
  block,
  onChange,
  autoFocus,
}: {
  block: CardBlock;
  onChange: (block: StoryBlock) => void;
  autoFocus: boolean;
}) {
  // 입력칸에서 벗어나면 바로 반영한다 (고치자마자 발행을 눌러도 마지막 글자가 빠지지 않게)
  const { draft, update, flush } = useDraft(block, onChange);
  const firstField = { live: 'streamer', donation: 'donor', call: 'name', news: 'title', note: 'body', mail: 'subject', location: 'place', transfer: 'amount', alarm: 'time', event: 'title' }[draft.kind];

  const field: FieldRenderer = ({ name, value, label, placeholder, maxLength, className, multiline, wrap }) => {
    const set = (next: string) => update({ ...draft, data: { ...draft.data, [name]: next } } as CardBlock);
    // wrap: 한 줄 값이지만 좁은 화면에서 줄을 바꿔 다 보이게 (입력칸은 줄을 못 바꿔서 긴 값이 잘려 보였다).
    // Enter는 막고, 붙여 넣은 줄바꿈은 띄어쓰기로 바꾼다
    return multiline || wrap ? (
      <textarea
        key={name}
        aria-label={label}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={1}
        autoFocus={autoFocus && name === firstField}
        onChange={(e) => set(wrap ? e.target.value.replace(/\r?\n/g, ' ') : e.target.value)}
        onKeyDown={
          wrap
            ? (e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) e.preventDefault();
              }
            : undefined
        }
        onBlur={flush}
        style={wrap && !value ? { minWidth: placeholderWidth(placeholder) } : undefined}
        // 줄바꿈 칸은 값이 짧으면('평일') 너무 좁아져 누르기 어려워서 최소 32px
        className={cn(className, INLINE_EDIT, 'resize-none field-sizing-content', wrap && 'min-w-8')}
      />
    ) : (
      <input
        key={name}
        aria-label={label}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        autoFocus={autoFocus && name === firstField}
        size={Math.max(2, [...(value || placeholder)].length)}
        onChange={(e) => set(e.target.value)}
        onBlur={flush}
        className={cn(className, INLINE_EDIT, 'field-sizing-content')}
      />
    );
  };

  switch (draft.kind) {
    case 'live':
      return <LiveCard data={draft.data} field={field} />;
    case 'donation':
      return <DonationCard data={draft.data} field={field} />;
    case 'news':
      return <NewsCard data={draft.data} field={field} />;
    case 'note':
      return <NoteCard data={draft.data} field={field} />;
    case 'mail':
      return <MailCard data={draft.data} field={field} />;
    case 'location':
      return <LocationCard data={draft.data} field={field} />;
    case 'transfer':
      return <TransferCard data={draft.data} field={field} />;
    case 'alarm':
      return <AlarmCard data={draft.data} field={field} />;
    case 'event':
      return <EventCard data={draft.data} field={field} />;
    case 'call': {
      const call = draft;
      // 모드를 바꾸면, 아직 안 고친 기본 문구는 새 모드에 맞게 (휴대전화 ↔ 00:12)
      const setMode = (mode: 'incoming' | 'active') => {
        if (mode === call.data.mode) return;
        const detail = call.data.detail.trim();
        const untouched = detail === '' || detail === CALL_DETAIL_DEFAULT[call.data.mode];
        update({ ...call, data: { ...call.data, mode, detail: untouched ? CALL_DETAIL_DEFAULT[mode] : call.data.detail } });
        // 단추를 누른 바로 그때 저장 (입력칸처럼 '벗어날 때'가 없으므로)
        window.setTimeout(flush, 0);
      };
      return (
        <div className="space-y-2">
          {/* 카드 오른쪽 위 도구 막대(휴대폰 폭에서 늘 보임) 아래에 오도록 위 여백 + 왼쪽 정렬 */}
          <div role="group" aria-label="전화 화면 종류" className="mt-5 ml-1 flex w-fit rounded-full bg-surface-2 p-1 text-xs font-semibold">
            {(['incoming', 'active'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={call.data.mode === mode}
                onClick={() => setMode(mode)}
                className={cn(
                  'h-8 rounded-full px-3 transition',
                  call.data.mode === mode ? 'bg-surface text-fg shadow-sm' : 'text-muted hover:text-fg',
                )}
              >
                {mode === 'incoming' ? '걸려 오는 전화' : '통화 중'}
              </button>
            ))}
          </div>
          <CallCard data={call.data} field={field} />
        </div>
      );
    }
  }
}

// ─── 카톡 · 채팅창 · 게시글 댓글: 대본으로 쓰기 ──────────────

export function ConversationEditor({
  block,
  onChange,
  onClose,
  onDelete,
}: {
  block: ConversationBlock;
  onChange: (block: StoryBlock) => void;
  onClose: () => void;
  onDelete: () => void;
}) {
  const { draft, update, flush, cancel } = useDraft(block, onChange);
  const rootRef = useRef<HTMLDivElement>(null);
  const scriptRef = useRef<HTMLTextAreaElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  // 열리면 편집 창 머리가 위쪽 고정 툴바에 가리지 않게 스크롤하고, 커서를 둔다 (게시글은 제목 끝, 나머지는 대본 끝)
  useEffect(() => {
    rootRef.current?.scrollIntoView({ block: 'start', behavior: scrollBehavior() });
    const target = titleRef.current ?? scriptRef.current;
    if (target) {
      target.focus({ preventScroll: true });
      target.setSelectionRange(target.value.length, target.value.length);
    }
  }, []);

  const lines = draft.kind === 'kakao' || draft.kind === 'chat' || draft.kind === 'sms' ? parseScript(draft.data.script) : [];
  // 게시글 댓글·SNS 답글은 같은 대본 규칙
  const comments = draft.kind === 'post' || draft.kind === 'sns' ? parseComments(draft.data.script) : [];
  // 시스템 창·검색 결과는 말하는 사람이 없어서 등장인물 칩을 안 보여 준다
  const speakers =
    draft.kind === 'post' || draft.kind === 'sns'
      ? commentSpeakers(comments)
      : draft.kind === 'system' || draft.kind === 'search' || draft.kind === 'push' || draft.kind === 'receipt' || draft.kind === 'poll' || draft.kind === 'item'
        ? []
        : scriptSpeakers(lines);

  function setData(
    patch:
      | Partial<KakaoData>
      | Partial<ChatData>
      | Partial<PostData>
      | Partial<SystemData>
      | Partial<SnsData>
      | Partial<SearchData>
      | Partial<PushData>
      | Partial<SmsData>
      | Partial<ReceiptData>
      | Partial<PollData>
      | Partial<ItemData>,
  ) {
    update({ ...draft, data: { ...draft.data, ...patch } } as ConversationBlock);
  }

  function rename(from: string, to: string) {
    if (draft.kind === 'system' || draft.kind === 'search' || draft.kind === 'push' || draft.kind === 'receipt' || draft.kind === 'poll' || draft.kind === 'item') return;
    if (draft.kind === 'sns') {
      setData({ script: renameSpeaker(draft.data.script, from, to, { replies: true }) });
      return;
    }
    if (draft.kind === 'sms') {
      setData({
        script: renameSpeaker(draft.data.script, from, to),
        me: draft.data.me === from ? to : draft.data.me,
        contact: draft.data.contact.trim() === from ? to : draft.data.contact,
      });
      return;
    }
    if (draft.kind === 'post') {
      const script = renameSpeaker(draft.data.script, from, to, { replies: true });
      setData({ script, author: draft.data.author === from ? to : draft.data.author });
      return;
    }
    const script = renameSpeaker(draft.data.script, from, to);
    if (draft.kind === 'kakao') {
      setData({ script, me: draft.data.me === from ? to : draft.data.me });
    } else {
      const colors = { ...draft.data.colors };
      if (colors[from]) {
        colors[to] = colors[from];
        delete colors[from];
      }
      setData({ script, colors });
    }
  }

  function cycleColor(name: string) {
    if (draft.kind !== 'chat') return;
    const current = chatColorKey(name, speakers, draft.data.colors);
    const next = CHAT_COLOR_KEYS[(CHAT_COLOR_KEYS.indexOf(current) + 1) % CHAT_COLOR_KEYS.length];
    // 대본에서 사라진 이름의 색 지정은 정리한다
    const kept = Object.fromEntries(Object.entries(draft.data.colors).filter(([key]) => speakers.includes(key)));
    setData({ colors: { ...kept, [name]: next } as Record<string, ChatColor> });
  }

  function done() {
    flush();
    onClose();
  }

  function remove() {
    if (!window.confirm('이 템플릿을 지울까요?')) return;
    cancel();
    onDelete();
  }

  return (
    <div
      ref={rootRef}
      // Esc = 완료 (고친 내용은 이미 미리보기에 반영돼 있어서 따로 '취소'가 없다). 이름 바꾸기 칸의 Esc는 그 칸만 닫는다
      onKeyDown={(event) => {
        if (event.key !== 'Escape' || event.defaultPrevented || event.nativeEvent.isComposing) return;
        event.preventDefault();
        done();
      }}
      className="@container scroll-mt-20 rounded-[24px] border border-accent/50 bg-surface p-4 shadow-sm sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-sm font-bold">{templateLabel(draft)}</span>
          <span className="text-xs text-muted">{draft.kind === 'post' ? '고치면' : '대본을 고치면'} 미리보기에 바로 보여요</span>
        </div>
        <div className="flex gap-1.5">
          <Button type="button" variant="ghost" size="sm" className="hover:text-danger" onClick={remove}>
            삭제
          </Button>
          <Button type="button" size="sm" onClick={done}>
            완료
          </Button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {draft.kind === 'kakao' ? (
          <>
            <MiniInput
              label={draft.data.mode === 'dm' ? '방 제목' : '방 이름'}
              value={draft.data.title}
              maxLength={40}
              placeholder={draft.data.mode === 'dm' ? `${kakaoTitle({ ...draft.data, title: '' }, lines)} (비우면 상대 이름)` : '단체방'}
              onChange={(title) => setData({ title })}
              inputClassName="w-52"
            />
            {draft.data.mode === 'group' ? (
              <MiniInput
                label="인원"
                value={draft.data.memberCount}
                maxLength={10}
                suffix="명"
                inputMode="numeric"
                onChange={(memberCount) => setData({ memberCount })}
                inputClassName="w-14"
              />
            ) : null}
          </>
        ) : draft.kind === 'sns' ? (
          <>
            <MiniInput label="이름" value={draft.data.name} maxLength={40} onChange={(name) => setData({ name })} inputClassName="w-28" />
            <MiniInput label="아이디" value={draft.data.handle} maxLength={40} onChange={(handle) => setData({ handle })} inputClassName="w-28" />
            <MiniInput label="시각" value={draft.data.date} maxLength={40} onChange={(date) => setData({ date })} inputClassName="w-36" />
            <MiniInput
              label="답글"
              value={draft.data.replies}
              maxLength={20}
              placeholder={String(comments.filter((line) => line.type === 'comment').length)}
              onChange={(replies) => setData({ replies })}
              inputClassName="w-12"
            />
            <MiniInput label="재게시" value={draft.data.reposts} maxLength={20} onChange={(reposts) => setData({ reposts })} inputClassName="w-12" />
            <MiniInput label="좋아요" value={draft.data.likes} maxLength={20} onChange={(likes) => setData({ likes })} inputClassName="w-14" />
          </>
        ) : draft.kind === 'receipt' ? (
          <>
            <MiniInput label="가게" value={draft.data.store} maxLength={40} onChange={(store) => setData({ store })} inputClassName="w-36" />
            <MiniInput label="날짜" value={draft.data.date} maxLength={40} onChange={(date) => setData({ date })} inputClassName="w-36" />
            <MiniInput
              label="합계"
              value={draft.data.total}
              maxLength={40}
              placeholder={receiptTotal({ ...draft.data, total: '' }, parseReceiptScript(draft.data.script)) || '비우면 품목을 더해서'}
              onChange={(total) => setData({ total })}
              inputClassName="w-28"
            />
            <MiniInput
              label="가게 정보"
              value={draft.data.info}
              maxLength={120}
              placeholder="비우면 안 보여요"
              onChange={(info) => setData({ info })}
              className="w-full"
              inputClassName="flex-1"
            />
            <MiniInput
              label="맨 아래"
              value={draft.data.footer}
              maxLength={120}
              placeholder="비우면 안 보여요"
              onChange={(footer) => setData({ footer })}
              className="w-full"
              inputClassName="flex-1"
            />
          </>
        ) : draft.kind === 'poll' ? (
          <>
            <MiniInput
              label="질문"
              value={draft.data.question}
              maxLength={120}
              onChange={(question) => setData({ question })}
              className="w-full"
              inputClassName="flex-1"
            />
            <MiniInput
              label="위쪽 표시"
              value={draft.data.badge}
              maxLength={40}
              placeholder="비우면 안 보여요"
              onChange={(badge) => setData({ badge })}
              className="w-full"
              inputClassName="flex-1"
            />
            <MiniInput
              label="맨 아래"
              value={draft.data.status}
              maxLength={60}
              placeholder={pollStatus({ ...draft.data, status: '' }, parsePollScript(draft.data.script)) || '비우면 안 보여요'}
              onChange={(status) => setData({ status })}
              className="w-full"
              inputClassName="flex-1"
            />
          </>
        ) : draft.kind === 'sms' ? (
          <MiniInput
            label="상대"
            value={draft.data.contact}
            maxLength={40}
            placeholder={`${smsContact({ ...draft.data, contact: '' }, lines)} (비우면 대본의 상대)`}
            onChange={(contact) => setData({ contact })}
            inputClassName="w-56"
          />
        ) : draft.kind === 'push' ? (
          <>
            <MiniInput
              label="시계"
              value={draft.data.time}
              maxLength={20}
              placeholder="비우면 안 보여요"
              onChange={(time) => setData({ time })}
              inputClassName="w-24"
            />
            <MiniInput
              label="날짜"
              value={draft.data.date}
              maxLength={40}
              placeholder="비우면 안 보여요"
              onChange={(date) => setData({ date })}
              inputClassName="w-40"
            />
          </>
        ) : draft.kind === 'search' ? (
          <>
            <MiniInput
              inputRef={titleRef}
              label="검색어"
              value={draft.data.query}
              maxLength={100}
              onChange={(query) => setData({ query })}
              inputClassName="w-44"
            />
            <MiniInput
              label="검색 사이트"
              value={draft.data.engine}
              maxLength={40}
              placeholder="비우면 안 보여요"
              onChange={(engine) => setData({ engine })}
              inputClassName="w-28"
            />
            <MiniInput
              label="결과 수"
              value={draft.data.count}
              maxLength={40}
              placeholder="비우면 안 보여요"
              onChange={(count) => setData({ count })}
              inputClassName="w-40"
            />
          </>
        ) : draft.kind === 'item' ? (
          <>
            <MiniInput label="이름" value={draft.data.name} maxLength={60} onChange={(name) => setData({ name })} className="w-full" inputClassName="flex-1" />
            <MiniInput
              label="등급"
              value={draft.data.grade}
              maxLength={20}
              placeholder="일반·고급·희귀·영웅·전설·신화"
              onChange={(grade) => setData({ grade })}
              inputClassName="w-48"
            />
            <MiniInput label="분류" value={draft.data.category} maxLength={40} placeholder="비우면 안 보여요" onChange={(category) => setData({ category })} inputClassName="w-40" />
            <MiniInput
              label="위쪽 문구"
              value={draft.data.title}
              maxLength={40}
              placeholder="비우면 안 보여요"
              onChange={(title) => setData({ title })}
              className="w-full"
              inputClassName="flex-1"
            />
          </>
        ) : draft.kind === 'system' ? (
          <MiniInput
            label="제목"
            value={draft.data.title}
            maxLength={60}
            placeholder="비우면 제목 줄 없음"
            onChange={(title) => setData({ title })}
            inputClassName="w-52"
          />
        ) : draft.kind === 'chat' ? (
          <>
            <MiniInput label="제목" value={draft.data.title} maxLength={60} onChange={(title) => setData({ title })} inputClassName="w-44" />
            <MiniInput
              label="배지"
              value={draft.data.badge}
              maxLength={20}
              placeholder="비우면 안 보여요"
              onChange={(badge) => setData({ badge })}
              inputClassName="w-32"
            />
          </>
        ) : (
          <>
            <MiniInput label="게시판" value={draft.data.board} maxLength={40} onChange={(board) => setData({ board })} inputClassName="w-28" />
            <MiniInput
              label="글쓴이"
              value={draft.data.author}
              maxLength={LIMITS.name}
              onChange={(author) => setData({ author })}
              inputClassName="w-24"
            />
            <MiniInput label="시각" value={draft.data.date} maxLength={40} onChange={(date) => setData({ date })} inputClassName="w-36" />
            <MiniInput label="조회" value={draft.data.views} maxLength={20} onChange={(views) => setData({ views })} inputClassName="w-14" />
            <MiniInput label="추천" value={draft.data.likes} maxLength={20} onChange={(likes) => setData({ likes })} inputClassName="w-12" />
            <MiniInput
              label="댓글 수"
              value={draft.data.commentCount}
              maxLength={10}
              placeholder={postCommentCount({ ...draft.data, commentCount: '' }, comments)}
              onChange={(commentCount) => setData({ commentCount })}
              inputClassName="w-12"
            />
          </>
        )}
      </div>
      {draft.kind === 'post' ? (
        <div className="mt-1.5 text-xs text-muted">게시판·조회·추천은 비우면 안 보이고, 댓글 수는 비우면 아래 댓글 개수로 보여요</div>
      ) : null}
      {draft.kind === 'sns' ? (
        <div className="mt-1.5 text-xs text-muted">재게시·좋아요는 비우면 안 보이고, 답글 수는 비우면 아래 답글 개수로 보여요</div>
      ) : null}

      {/* 넓으면 대본 | 미리보기 나란히 (대본이 길어져도 미리보기는 따라 내려옴), 좁으면 위아래 */}
      <div className="mt-3 grid items-start gap-3 @xl:grid-cols-2">
        <div className="flex flex-col gap-2">
          {draft.kind === 'post' ? (
            <>
              <MiniInput
                inputRef={titleRef}
                label="제목"
                value={draft.data.title}
                maxLength={120}
                onChange={(title) => setData({ title })}
                className="w-full"
                inputClassName="flex-1"
              />
              <textarea
                value={draft.data.body}
                onChange={(e) => setData({ body: e.target.value })}
                aria-label="게시글 본문"
                maxLength={LIMITS.body}
                placeholder="게시글 본문"
                className={cn(TEXTAREA, 'min-h-32')}
              />
              <span aria-hidden="true" className="mt-2 text-xs font-semibold text-muted">
                댓글
              </span>
            </>
          ) : null}
          {draft.kind === 'sns' ? (
            <>
              <textarea
                value={draft.data.body}
                onChange={(e) => setData({ body: e.target.value })}
                aria-label="게시물 본문"
                maxLength={LIMITS.message}
                placeholder="게시물 본문"
                className={cn(TEXTAREA, 'min-h-28')}
              />
              <span aria-hidden="true" className="mt-2 text-xs font-semibold text-muted">
                답글
              </span>
            </>
          ) : null}
          <textarea
            ref={scriptRef}
            value={draft.data.script}
            onChange={(e) => setData({ script: e.target.value })}
            aria-label={draft.kind === 'post' ? '댓글 대본' : draft.kind === 'sns' ? '답글 대본' : draft.kind === 'search' ? '검색 결과 대본' : draft.kind === 'push' ? '알림 대본' : draft.kind === 'receipt' ? '품목 대본' : draft.kind === 'poll' ? '선택지 대본' : draft.kind === 'item' ? '능력치 대본' : '대본'}
            spellCheck={false}
            maxLength={LIMITS.script}
            placeholder={SCRIPT_PLACEHOLDER[draft.kind]}
            className={cn(TEXTAREA, draft.kind === 'post' || draft.kind === 'sns' ? 'min-h-40' : 'min-h-60')}
          />
          <ScriptHelp kind={draft.kind} />
        </div>
        <div className="max-h-[560px] overflow-y-auto rounded-2xl bg-(--wn-stage) p-3 @xl:sticky @xl:top-20">
          <StoryBlockView block={draft} />
        </div>
      </div>

      {speakers.length > 0 ? (
        <SpeakerChips
          speakers={speakers}
          isRight={(name) => (draft.kind === 'kakao' || draft.kind === 'sms') && isMine(name, draft.data.me)}
          onSetRight={draft.kind === 'kakao' || draft.kind === 'sms' ? (name) => setData({ me: name }) : undefined}
          colorOf={draft.kind === 'chat' ? (name) => chatColorKey(name, speakers, draft.data.colors) : undefined}
          onCycleColor={draft.kind === 'chat' ? cycleColor : undefined}
          // '글쓴이:'로 쓴 사람은 이름이 이미 '글쓴이'라 따로 표시하지 않는다
          badgeOf={
            draft.kind === 'post' ? (name) => (name !== '글쓴이' && isPostAuthor(name, draft.data.author) ? '글쓴이' : null) : undefined
          }
          onRename={rename}
        />
      ) : null}

      <div className="mt-4 flex justify-end">
        <Button type="button" size="sm" onClick={done}>
          완료
        </Button>
      </div>
    </div>
  );
}

function MiniInput({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  suffix,
  inputMode,
  className,
  inputClassName,
  inputRef,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength: number;
  suffix?: string;
  inputMode?: 'numeric';
  className?: string;
  inputClassName?: string;
  inputRef?: Ref<HTMLInputElement>;
}) {
  return (
    <label
      className={cn(
        'inline-flex h-10 max-w-full items-center gap-2 rounded-xl border border-line bg-surface px-3 focus-within:border-accent focus-within:ring-3 focus-within:ring-accent/20',
        className,
      )}
    >
      <span className="shrink-0 text-xs font-semibold text-muted">{label}</span>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        inputMode={inputMode}
        className={cn('h-full min-w-0 bg-transparent text-base text-fg placeholder:text-muted/60 focus:outline-none', inputClassName)}
      />
      {suffix ? <span className="shrink-0 text-sm text-muted">{suffix}</span> : null}
    </label>
  );
}

const SCRIPT_HELP: Record<ConversationBlock['kind'], Array<[string, string]>> = {
  kakao: [
    ['이름: 대사', '한 줄에 하나'],
    ['나: …', '오른쪽 말풍선'],
    ['이름 없이 쓰기', '앞사람이 이어서'],
    ['[오후 8:14]', '줄 끝에 시간'],
    ['--- 10월 5일 ---', '가운데 날짜'],
  ],
  chat: [
    ['닉네임: 채팅', '한 줄에 하나'],
    ['이름 없이 쓰기', '같은 사람이 이어서'],
    ['--- 안내 ---', '가운데 안내 문구'],
  ],
  system: [
    ['힘: 15', '이름 · 값 한 줄'],
    ['「…」 또는 […]', '가운데 굵게'],
    ['--- 보상 ---', '구분선'],
    ['그냥 쓰기', '안내 문장'],
  ],
  sns: [
    ['닉네임: 답글', '한 줄에 하나'],
    ['이름 없이 쓰기', '앞 답글에 줄바꿈'],
    ['[3분 전]', '줄 끝에 시간'],
    ['--- 안내 ---', '가운데 회색 줄'],
  ],
  item: [
    ['공격력: +12', '능력치 한 줄'],
    ['「…」 또는 […]', '등급 색으로 굵게'],
    ['---', '구분선'],
    ['그냥 쓰기', '설명 글'],
  ],
  poll: [
    ['선택지: 12', '표 수'],
    ['* 선택지: 12', '내가 고른 것'],
    ['선택지: 12명', '단위 그대로'],
    ['선택지만 쓰기', '0표 (모두 그러면 투표 전)'],
  ],
  receipt: [
    ['이름: 금액', '품목 하나'],
    ['이름 ×2: 금액', '수량'],
    ['할인: -1,000원', '빼는 금액'],
    ['---', '구분선'],
    ['그냥 쓰기', '작은 안내 글'],
  ],
  sms: [
    ['이름: 문자', '한 줄에 하나'],
    ['나: …', '오른쪽 파란 말풍선'],
    ['이름 없이 쓰기', '앞사람이 이어서'],
    ['[오후 8:14]', '줄 끝에 시간'],
    ['--- 오늘 ---', '가운데 날짜'],
  ],
  push: [
    ['앱 · 보낸 사람: 내용', '알림 하나'],
    ['앱: 내용', '보낸 사람 없이'],
    ['[3분 전]', '줄 끝에 시각'],
    ['이름 없이 쓰기', '앞 알림에 줄바꿈'],
    ['--- 안내 ---', '가운데 작은 글'],
  ],
  search: [
    ['빈 줄', '결과 나누기'],
    ['첫 줄', '제목'],
    ['example.com/…', '둘째 줄에 주소'],
    ['나머지 줄', '요약'],
    ['[광고] 제목', '광고 표시'],
  ],
  post: [
    ['닉네임: 댓글', '한 줄에 하나'],
    ['ㄴ 닉네임: …', '답글'],
    ['글쓴이: …', '글쓴이 표시'],
    ['이름 없이 쓰기', '앞 댓글에 줄바꿈'],
    ['[3분 전]', '줄 끝에 시간'],
    ['--- 삭제된 댓글입니다 ---', '회색 줄'],
  ],
};

function ScriptHelp({ kind }: { kind: ConversationBlock['kind'] }) {
  const items = SCRIPT_HELP[kind];
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
      {items.map(([code, description]) => (
        <li key={code}>
          <code className="rounded bg-surface-2 px-1 py-0.5 font-sans text-fg">{code}</code> {description}
        </li>
      ))}
    </ul>
  );
}

/**
 * 대본에 나오는 사람들. 여기서 이름을 바꾸면 대본의 그 사람 줄이 전부 바뀐다.
 * 카톡은 누가 오른쪽(나) 말풍선인지, 채팅창은 닉네임 색을 고른다. 게시글은 글쓴이를 표시한다.
 */
function SpeakerChips({
  speakers,
  isRight,
  onSetRight,
  colorOf,
  onCycleColor,
  badgeOf,
  onRename,
}: {
  speakers: string[];
  isRight: (name: string) => boolean;
  onSetRight?: (name: string) => void;
  colorOf?: (name: string) => ChatColor;
  onCycleColor?: (name: string) => void;
  badgeOf?: (name: string) => string | null;
  onRename: (from: string, to: string) => void;
}) {
  const [renaming, setRenaming] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  // Enter·Esc로 이름 칸을 닫으면 그 사람의 ✎ 단추로 포커스를 돌려준다 (칸이 사라지면서 포커스가 화면 맨 앞으로 튕기지 않게)
  const refocusRef = useRef<string | null>(null);

  useEffect(() => {
    const name = refocusRef.current;
    if (renaming !== null || name === null) return;
    refocusRef.current = null;
    rootRef.current?.querySelector<HTMLButtonElement>(`button[data-rename="${CSS.escape(name)}"]`)?.focus();
  }, [renaming, speakers]);

  function finishRename(from: string, to: string, refocus = false) {
    setRenaming(null);
    const next = to.trim();
    const renamed = next !== '' && next !== from;
    if (renamed) onRename(from, next);
    if (refocus) refocusRef.current = renamed ? next : from;
  }

  return (
    <div ref={rootRef} className="mt-3 flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-xs font-semibold text-muted">등장인물</span>
      {speakers.map((name) => {
        if (renaming === name) {
          return (
            <input
              key={name}
              autoFocus
              defaultValue={name}
              maxLength={LIMITS.name}
              aria-label={`${name}의 새 이름`}
              onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
                if (event.nativeEvent.isComposing || event.keyCode === 229) return;
                if (event.key === 'Enter') {
                  event.preventDefault();
                  finishRename(name, event.currentTarget.value, true);
                } else if (event.key === 'Escape') {
                  // 편집 창 전체의 Esc(완료)로 번지지 않게
                  event.preventDefault();
                  refocusRef.current = name;
                  setRenaming(null);
                }
              }}
              onBlur={(event) => finishRename(name, event.currentTarget.value)}
              className="h-8 w-28 rounded-full border border-accent bg-surface px-3 text-base text-fg focus:outline-none"
            />
          );
        }
        const right = isRight(name);
        return (
          <span
            key={name}
            className={cn(
              'inline-flex h-8 items-center gap-1 rounded-full border pr-1 pl-2.5 text-sm',
              right ? 'border-(--wn-kakao-me-bg) bg-(--wn-kakao-me-bg)/20' : 'border-line bg-surface',
            )}
          >
            {colorOf && onCycleColor ? (
              <button
                type="button"
                onClick={() => onCycleColor(name)}
                title="닉네임 색 바꾸기"
                aria-label={`${name} 닉네임 색 바꾸기`}
                className="size-4 shrink-0 rounded-full ring-1 ring-black/10"
                style={{ background: CHAT_COLORS[colorOf(name)] }}
              />
            ) : null}
            <span className="font-semibold">{name}</span>
            {badgeOf?.(name) ? (
              <span className="rounded-md bg-surface-2 px-1.5 py-px text-[11px] font-semibold text-muted">{badgeOf(name)}</span>
            ) : null}
            {onSetRight ? (
              right ? (
                // '나'는 항상 오른쪽. 다른 사람을 오른쪽으로 바꿨다면 눌러서 되돌린다
                name === '나' ? (
                  // 오른쪽 칩은 배경에 노란빛이 깔려서 흐린 글자 대신 본문 색 (어두운 화면 대비)
                  <span className="px-1 text-xs text-fg">오른쪽</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onSetRight('나')}
                    title="왼쪽으로 되돌리기"
                    className="h-6 rounded-full px-1.5 text-xs text-fg transition hover:bg-surface-2"
                  >
                    오른쪽 ✓
                  </button>
                )
              ) : (
                <button
                  type="button"
                  onClick={() => onSetRight(name)}
                  // 옆 ✎ 단추와 붙어 있어서 누르는 높이를 24px로 (WCAG 2.5.8)
                  className="h-6 rounded-full px-1.5 text-xs text-muted transition hover:bg-surface-2 hover:text-fg"
                >
                  오른쪽으로
                </button>
              )
            ) : null}
            <button
              type="button"
              onClick={() => setRenaming(name)}
              data-rename={name}
              title="이름 모두 바꾸기"
              aria-label={`${name} 이름 모두 바꾸기`}
              className={cn('grid size-6 place-items-center rounded-full transition hover:bg-surface-2 hover:text-fg', right ? 'text-fg' : 'text-muted')}
            >
              ✎
            </button>
          </span>
        );
      })}
    </div>
  );
}

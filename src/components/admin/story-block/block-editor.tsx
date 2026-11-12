'use client';

import { useEffect, useRef, useState, type KeyboardEvent, type Ref } from 'react';
import { CallCard, DonationCard, LiveCard, NewsCard, NoteCard, StoryBlockView, type FieldRenderer } from '@/components/story-block-view';
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
  parseScript,
  postCommentCount,
  renameSpeaker,
  scriptSpeakers,
  templateLabel,
  type ChatColor,
  type ChatData,
  type KakaoData,
  type PostData,
  type StoryBlock,
  type SystemData,
} from '@/lib/story-blocks';
import { scrollBehavior } from '@/lib/motion';
import { cn } from '@/lib/utils';

// 입력은 화면에 바로 보이고, 문서(→ 자동저장)에는 잠깐 모았다가 반영한다 (커서 튐 방지, 저장 횟수 줄이기)
const COMMIT_DELAY_MS = 300;

type CardBlock = Extract<StoryBlock, { kind: 'live' | 'donation' | 'news' | 'call' | 'note' }>;
type ConversationBlock = Extract<StoryBlock, { kind: 'kakao' | 'chat' | 'post' | 'system' }>;

const TEXTAREA =
  'w-full resize-y rounded-2xl border border-line bg-surface px-4 py-3 text-base leading-relaxed text-fg field-sizing-content placeholder:text-muted/60 focus:border-accent focus:ring-3 focus:ring-accent/20 focus:outline-none';

const SCRIPT_PLACEHOLDER: Record<ConversationBlock['kind'], string> = {
  kakao: '양띵: 수진아 뭐 해? [오후 8:14]\n나: 방송 준비하고 있어요!',
  chat: '밥알: 연화님 ㅎㅇ\n감자도리: 오늘 뭐함?',
  post: '익명1: 와 이거 진짜임? [20:31]\nㄴ 글쓴이: ㅇㅇ 방금 봄',
  system: '「잃어버린 기억을 찾아라」\n제한 시간: 24시간\n--- 보상 ---\n???',
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

// ─── 방송창 · 후원 알림 · 뉴스 기사: 카드 위에서 바로 고치기 ──────

const INLINE_EDIT =
  'rounded-md bg-transparent outline-none ring-1 ring-transparent transition placeholder:text-(--wn-muted) placeholder:opacity-70 hover:ring-(--wn-border) focus:ring-2 focus:ring-accent';

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
  const firstField = { live: 'streamer', donation: 'donor', call: 'name', news: 'title', note: 'body' }[draft.kind];

  const field: FieldRenderer = ({ name, value, label, placeholder, maxLength, className, multiline }) => {
    const set = (next: string) => update({ ...draft, data: { ...draft.data, [name]: next } } as CardBlock);
    return multiline ? (
      <textarea
        key={name}
        aria-label={label}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={1}
        autoFocus={autoFocus && name === firstField}
        onChange={(e) => set(e.target.value)}
        onBlur={flush}
        className={cn(className, INLINE_EDIT, 'resize-none field-sizing-content')}
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

  const lines = draft.kind === 'kakao' || draft.kind === 'chat' ? parseScript(draft.data.script) : [];
  const comments = draft.kind === 'post' ? parseComments(draft.data.script) : [];
  // 시스템 창은 말하는 사람이 없어서 등장인물 칩을 안 보여 준다
  const speakers = draft.kind === 'post' ? commentSpeakers(comments) : draft.kind === 'system' ? [] : scriptSpeakers(lines);

  function setData(patch: Partial<KakaoData> | Partial<ChatData> | Partial<PostData> | Partial<SystemData>) {
    update({ ...draft, data: { ...draft.data, ...patch } } as ConversationBlock);
  }

  function rename(from: string, to: string) {
    if (draft.kind === 'system') return;
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
    <div ref={rootRef} className="@container scroll-mt-20 rounded-[24px] border border-accent/50 bg-surface p-4 shadow-sm sm:p-5">
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
          <textarea
            ref={scriptRef}
            value={draft.data.script}
            onChange={(e) => setData({ script: e.target.value })}
            aria-label={draft.kind === 'post' ? '댓글 대본' : '대본'}
            spellCheck={false}
            maxLength={LIMITS.script}
            placeholder={SCRIPT_PLACEHOLDER[draft.kind]}
            className={cn(TEXTAREA, draft.kind === 'post' ? 'min-h-40' : 'min-h-60')}
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
          isRight={(name) => draft.kind === 'kakao' && isMine(name, draft.data.me)}
          onSetRight={draft.kind === 'kakao' ? (name) => setData({ me: name }) : undefined}
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

  function finishRename(from: string, to: string) {
    setRenaming(null);
    const next = to.trim();
    if (next && next !== from) onRename(from, next);
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5">
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
                  finishRename(name, event.currentTarget.value);
                } else if (event.key === 'Escape') {
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
                  <span className="px-1 text-xs text-muted">오른쪽</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onSetRight('나')}
                    title="왼쪽으로 되돌리기"
                    className="rounded-full px-1.5 text-xs text-muted transition hover:bg-surface-2 hover:text-fg"
                  >
                    오른쪽 ✓
                  </button>
                )
              ) : (
                <button
                  type="button"
                  onClick={() => onSetRight(name)}
                  className="rounded-full px-1.5 text-xs text-muted transition hover:bg-surface-2 hover:text-fg"
                >
                  오른쪽으로
                </button>
              )
            ) : null}
            <button
              type="button"
              onClick={() => setRenaming(name)}
              title="이름 모두 바꾸기"
              aria-label={`${name} 이름 모두 바꾸기`}
              className="grid size-6 place-items-center rounded-full text-muted transition hover:bg-surface-2 hover:text-fg"
            >
              ✎
            </button>
          </span>
        );
      })}
    </div>
  );
}

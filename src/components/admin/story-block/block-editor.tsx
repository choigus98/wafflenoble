'use client';

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { StoryBlockView } from '@/components/story-block-view';
import { Button } from '@/components/ui';
import {
  CHAT_COLORS,
  CHAT_COLOR_KEYS,
  LIMITS,
  newId,
  parseChatLines,
  templateLabel,
  type ChatColor,
  type ChatData,
  type ChatMessage,
  type ChatPerson,
  type DonationData,
  type KakaoData,
  type LiveData,
  type StoryBlock,
} from '@/lib/story-blocks';
import { cn } from '@/lib/utils';

// 입력할 때마다 에디터 문서를 바꾸지 않고 잠깐 모았다가 반영한다 (커서 튐 방지, 자동저장 횟수 줄이기)
const COMMIT_DELAY_MS = 300;

// iOS는 16px보다 작은 입력창에 포커스하면 화면을 확대하므로 text-base 유지.
// 너비는 쓰는 곳에서 정한다 (w-full과 다른 너비를 같이 주면 w-full이 이겨 버림)
const INPUT_BASE =
  'h-10 rounded-lg border border-line bg-surface px-3 text-base text-fg placeholder:text-muted/60 focus:border-accent focus:ring-3 focus:ring-accent/20 focus:outline-none';
const INPUT = `${INPUT_BASE} w-full`;
const TEXTAREA =
  'w-full resize-none rounded-lg border border-line bg-surface px-3 py-2 text-base leading-snug text-fg field-sizing-content placeholder:text-muted/60 focus:border-accent focus:ring-3 focus:ring-accent/20 focus:outline-none';
const ME_TONE = 'border-[#f6b8cd]/70 bg-[#f6b8cd]/10';

export function StoryBlockEditor({
  block,
  onChange,
  onClose,
  onDelete,
}: {
  block: StoryBlock;
  onChange: (block: StoryBlock) => void;
  onClose: () => void;
  onDelete: () => void;
}) {
  const [draft, setDraft] = useState(block);
  const latestRef = useRef(block);
  const timerRef = useRef<number | null>(null);
  const onChangeRef = useRef(onChange);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onChangeRef.current = onChange;
  });

  // 열리면 편집 창 머리(완료 버튼)가 위쪽 고정 툴바에 가리지 않도록 그 아래로 스크롤
  useEffect(() => {
    rootRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, []);

  // 편집 창이 닫히거나 화면을 떠날 때, 아직 반영 안 된 변경이 있으면 바로 반영
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

  function update(next: StoryBlock) {
    setDraft(next);
    latestRef.current = next;
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      onChangeRef.current(latestRef.current);
    }, COMMIT_DELAY_MS);
  }

  function done() {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
      onChangeRef.current(latestRef.current);
    }
    onClose();
  }

  function remove() {
    if (!window.confirm('이 템플릿을 지울까요?')) return;
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    onDelete();
  }

  let form: ReactNode;
  switch (draft.kind) {
    case 'live':
      form = <LiveForm data={draft.data} onChange={(data) => update({ kind: 'live', data })} />;
      break;
    case 'donation':
      form = <DonationForm data={draft.data} onChange={(data) => update({ kind: 'donation', data })} />;
      break;
    case 'chat':
      form = <ChatForm data={draft.data} onChange={(data) => update({ kind: 'chat', data })} />;
      break;
    case 'kakao':
      form = <KakaoForm data={draft.data} onChange={(data) => update({ kind: 'kakao', data })} />;
      break;
  }

  return (
    <div ref={rootRef} className="scroll-mt-20 rounded-[24px] border border-accent/50 bg-surface p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-bold">{templateLabel(draft)} 편집</span>
        <div className="flex gap-1.5">
          <Button type="button" variant="ghost" size="sm" className="hover:text-danger" onClick={remove}>
            삭제
          </Button>
          <Button type="button" size="sm" onClick={done}>
            완료
          </Button>
        </div>
      </div>
      <div className="mt-4 max-h-[460px] overflow-y-auto rounded-2xl bg-[#0e0e10] p-3 sm:p-4">
        <StoryBlockView block={draft} />
      </div>
      <div className="mt-5">{form}</div>
      <div className="mt-5 flex justify-end">
        <Button type="button" size="sm" onClick={done}>
          완료
        </Button>
      </div>
    </div>
  );
}

function Labeled({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={cn('block space-y-1', className)}>
      <span className="block text-xs font-semibold text-muted">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-muted/80">{hint}</span> : null}
    </label>
  );
}

// ─── 라이브 방송창 · 후원 알림 ─────────────────────────

function LiveForm({ data, onChange }: { data: LiveData; onChange: (data: LiveData) => void }) {
  const set = (patch: Partial<LiveData>) => onChange({ ...data, ...patch });
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Labeled label="방송인">
        <input className={INPUT} value={data.streamer} maxLength={40} onChange={(e) => set({ streamer: e.target.value })} />
      </Labeled>
      <Labeled label="배지" hint="비우면 안 보여요">
        <input className={INPUT} value={data.badge} maxLength={20} onChange={(e) => set({ badge: e.target.value })} />
      </Labeled>
      <Labeled label="방송 제목" className="sm:col-span-2">
        <input className={INPUT} value={data.title} maxLength={120} onChange={(e) => set({ title: e.target.value })} />
      </Labeled>
      <Labeled label="시청자 수" hint="‘시청자 ○명’으로 보여요. 비우면 안 보여요">
        <input className={INPUT} value={data.viewers} maxLength={20} onChange={(e) => set({ viewers: e.target.value })} />
      </Labeled>
      <Labeled label="카테고리">
        <input className={INPUT} value={data.category} maxLength={40} onChange={(e) => set({ category: e.target.value })} />
      </Labeled>
    </div>
  );
}

function DonationForm({ data, onChange }: { data: DonationData; onChange: (data: DonationData) => void }) {
  const set = (patch: Partial<DonationData>) => onChange({ ...data, ...patch });
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Labeled label="위쪽 문구">
        <input className={INPUT} value={data.platform} maxLength={40} onChange={(e) => set({ platform: e.target.value })} />
      </Labeled>
      <Labeled label="배지" hint="비우면 안 보여요">
        <input className={INPUT} value={data.badge} maxLength={20} onChange={(e) => set({ badge: e.target.value })} />
      </Labeled>
      <Labeled label="후원자">
        <input className={INPUT} value={data.donor} maxLength={40} onChange={(e) => set({ donor: e.target.value })} />
      </Labeled>
      <Labeled label="금액">
        <input className={INPUT} value={data.amount} maxLength={40} onChange={(e) => set({ amount: e.target.value })} />
      </Labeled>
      <Labeled label="후원 메시지" className="sm:col-span-2">
        <textarea
          className={cn(TEXTAREA, 'min-h-20')}
          value={data.message}
          maxLength={LIMITS.message}
          onChange={(e) => set({ message: e.target.value })}
        />
      </Labeled>
      <Labeled label="아래쪽 문구" hint="비우면 ‘후원자 님이 치즈 후원을 보냈습니다.’로 보여요" className="sm:col-span-2">
        <input
          className={INPUT}
          value={data.footer}
          maxLength={120}
          placeholder={`${data.donor} 님이 치즈 후원을 보냈습니다.`}
          onChange={(e) => set({ footer: e.target.value })}
        />
      </Labeled>
    </div>
  );
}

// ─── 채팅창 · 카톡 ─────────────────────────────────────

function ChatForm({ data, onChange }: { data: ChatData; onChange: (data: ChatData) => void }) {
  const set = (patch: Partial<ChatData>) => onChange({ ...data, ...patch });
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <Labeled label="채팅창 제목">
          <input className={INPUT} value={data.title} maxLength={60} onChange={(e) => set({ title: e.target.value })} />
        </Labeled>
        <Labeled label="배지" hint="비우면 안 보여요">
          <input className={INPUT} value={data.badge} maxLength={20} onChange={(e) => set({ badge: e.target.value })} />
        </Labeled>
      </div>
      <ConversationEditor
        variant="chat"
        people={data.people}
        messages={data.messages}
        onChange={(next) => set(next)}
      />
    </div>
  );
}

function KakaoForm({ data, onChange }: { data: KakaoData; onChange: (data: KakaoData) => void }) {
  const set = (patch: Partial<KakaoData>) => onChange({ ...data, ...patch });
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        {data.mode === 'group' ? (
          <>
            <Labeled label="방 이름">
              <input className={INPUT} value={data.room} maxLength={40} onChange={(e) => set({ room: e.target.value })} />
            </Labeled>
            <Labeled label="참여 인원" hint="‘○명 참여 중’으로 보여요. 비우면 안 보여요">
              <input
                className={INPUT}
                value={data.memberCount}
                maxLength={10}
                inputMode="numeric"
                onChange={(e) => set({ memberCount: e.target.value })}
              />
            </Labeled>
          </>
        ) : null}
        <Labeled label="날짜 표시" hint="비우면 안 보여요" className="sm:col-span-2">
          <input className={INPUT} value={data.date} maxLength={40} onChange={(e) => set({ date: e.target.value })} />
        </Labeled>
      </div>
      <ConversationEditor
        variant={data.mode === 'dm' ? 'kakao-dm' : 'kakao-group'}
        meId={data.meId}
        people={data.people}
        messages={data.messages}
        onChange={(next) => set(next)}
      />
    </div>
  );
}

type Variant = 'kakao-dm' | 'kakao-group' | 'chat';

function pickColor(people: ChatPerson[]): ChatColor {
  const used = new Set(people.map((person) => person.color));
  return CHAT_COLOR_KEYS.find((color) => !used.has(color)) ?? CHAT_COLOR_KEYS[people.length % CHAT_COLOR_KEYS.length];
}

/**
 * 대화 편집기 (카톡 1:1·단체방, 실시간 채팅창 공용)
 * - 사람 이름은 한 곳에서만 고치면 그 사람의 대사 전체에 반영된다 (대사는 사람 id로 연결)
 * - 대사 칸에서 Enter → 다음 대사 추가 (카톡은 나 ↔ 상대 번갈아), Shift+Enter → 줄바꿈
 */
function ConversationEditor({
  variant,
  meId,
  people,
  messages,
  onChange,
}: {
  variant: Variant;
  meId?: string;
  people: ChatPerson[];
  messages: ChatMessage[];
  onChange: (next: { people: ChatPerson[]; messages: ChatMessage[] }) => void;
}) {
  const [focusId, setFocusId] = useState<string | null>(null);
  const [bulk, setBulk] = useState('');
  const isKakao = variant !== 'chat';
  const me = isKakao ? people.find((person) => person.id === meId) : undefined;
  const others = isKakao ? people.filter((person) => person.id !== meId) : people;
  const speakers = me ? [me, ...others] : people;
  const canAddPerson = people.length < LIMITS.people;
  const canAddMessage = messages.length < LIMITS.messages;
  const nameOf = (id: string) => people.find((person) => person.id === id)?.name.trim() || '이름 없음';

  const emit = (nextPeople: ChatPerson[], nextMessages: ChatMessage[]) =>
    onChange({ people: nextPeople, messages: nextMessages });

  function renamePerson(id: string, name: string) {
    emit(
      people.map((person) => (person.id === id ? { ...person, name } : person)),
      messages,
    );
  }

  function addPerson() {
    if (!canAddPerson) return;
    const base = variant === 'chat' ? '시청자' : '친구';
    emit([...people, { id: newId(), name: `${base}${others.length + 1}`, color: pickColor(people) }], messages);
  }

  function removePerson(id: string) {
    const count = messages.filter((message) => message.from === id).length;
    if (count > 0 && !window.confirm(`‘${nameOf(id)}’의 대사 ${count}개도 함께 지워져요. 지울까요?`)) return;
    emit(
      people.filter((person) => person.id !== id),
      messages.filter((message) => message.from !== id),
    );
  }

  function cycleColor(id: string) {
    emit(
      people.map((person) =>
        person.id === id
          ? { ...person, color: CHAT_COLOR_KEYS[(CHAT_COLOR_KEYS.indexOf(person.color) + 1) % CHAT_COLOR_KEYS.length] }
          : person,
      ),
      messages,
    );
  }

  /** Enter로 다음 대사를 만들 때 누가 말할지. 카톡은 나 ↔ 상대, 채팅창은 다음 시청자 */
  function nextSpeaker(index: number): string | undefined {
    const current = messages[index]?.from;
    if (isKakao && meId) {
      if (current !== meId) return meId;
      for (let i = index - 1; i >= 0; i--) {
        if (messages[i].from !== meId) return messages[i].from;
      }
      return others[0]?.id ?? meId;
    }
    const at = people.findIndex((person) => person.id === current);
    return people[(at + 1) % people.length]?.id;
  }

  function insertMessage(at: number, from: string | undefined) {
    if (!canAddMessage || !from) return;
    const message: ChatMessage = { id: newId(), from, text: '', time: '' };
    const next = [...messages];
    next.splice(at, 0, message);
    emit(people, next);
    setFocusId(message.id);
  }

  function updateMessage(id: string, patch: Partial<ChatMessage>) {
    emit(
      people,
      messages.map((message) => (message.id === id ? { ...message, ...patch } : message)),
    );
  }

  function removeMessage(id: string) {
    emit(
      people,
      messages.filter((message) => message.id !== id),
    );
  }

  function moveMessage(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= messages.length) return;
    const next = [...messages];
    [next[index], next[target]] = [next[target], next[index]];
    emit(people, next);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>, index: number) {
    // 한글 조합 중에 누른 Enter는 글자를 확정하는 용도라 무시
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing || event.keyCode === 229) return;
    event.preventDefault();
    insertMessage(index + 1, nextSpeaker(index));
  }

  function addBulk() {
    const lines = parseChatLines(bulk);
    if (lines.length === 0) return;
    let nextPeople = [...people];
    const added: ChatMessage[] = [];
    for (const line of lines) {
      if (messages.length + added.length >= LIMITS.messages) break;
      const key = line.name.toLowerCase();
      let person: ChatPerson | undefined =
        me && (key === '나' || key === me.name.trim().toLowerCase())
          ? me
          : nextPeople.find((candidate) => candidate.name.trim().toLowerCase() === key);
      // 1:1 대화에서 처음 보는 이름은 상대로 본다
      if (!person && variant === 'kakao-dm') person = nextPeople.find((candidate) => candidate.id !== meId);
      if (!person && nextPeople.length < LIMITS.people) {
        person = { id: newId(), name: line.name.slice(0, LIMITS.name), color: pickColor(nextPeople) };
        nextPeople = [...nextPeople, person];
      }
      if (person) {
        added.push({
          id: newId(),
          from: person.id,
          text: line.text.slice(0, LIMITS.message),
          time: isKakao ? line.time : '',
        });
      }
    }
    emit(nextPeople, [...messages, ...added]);
    setBulk('');
  }

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h4 className="text-xs font-bold text-muted">{variant === 'chat' ? '시청자' : '대화하는 사람'}</h4>
        {me ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <label className={cn('block space-y-1 rounded-xl border p-2.5', ME_TONE)}>
              <span className="block text-xs font-semibold text-muted">나 · 오른쪽 분홍 말풍선</span>
              <input
                className={INPUT}
                value={me.name}
                maxLength={LIMITS.name}
                onChange={(e) => renamePerson(me.id, e.target.value)}
              />
            </label>
            {variant === 'kakao-dm' && others[0] ? (
              <label className="block space-y-1 rounded-xl border border-line bg-surface p-2.5">
                <span className="block text-xs font-semibold text-muted">상대 · 왼쪽 말풍선, 방 제목</span>
                <input
                  className={INPUT}
                  value={others[0].name}
                  maxLength={LIMITS.name}
                  onChange={(e) => renamePerson(others[0].id, e.target.value)}
                />
              </label>
            ) : null}
          </div>
        ) : null}
        {variant !== 'kakao-dm' ? (
          <div className="flex flex-wrap gap-2">
            {others.map((person) => (
              <div key={person.id} className="flex items-center gap-1 rounded-xl border border-line bg-surface py-1 pr-1 pl-2">
                {variant === 'chat' ? (
                  <button
                    type="button"
                    onClick={() => cycleColor(person.id)}
                    title="닉네임 색 바꾸기"
                    aria-label={`${person.name} 닉네임 색 바꾸기`}
                    className="size-6 shrink-0 rounded-full ring-1 ring-black/10"
                    style={{ background: CHAT_COLORS[person.color] }}
                  />
                ) : null}
                <input
                  value={person.name}
                  maxLength={LIMITS.name}
                  onChange={(e) => renamePerson(person.id, e.target.value)}
                  aria-label="이름"
                  className="h-8 w-28 rounded-md bg-transparent px-1.5 text-base focus:bg-surface-2 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => removePerson(person.id)}
                  aria-label={`${person.name} 빼기`}
                  className="grid size-8 place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-danger"
                >
                  ✕
                </button>
              </div>
            ))}
            {canAddPerson ? (
              <button
                type="button"
                onClick={addPerson}
                className="h-10 rounded-xl border border-dashed border-line px-3 text-sm font-semibold text-muted transition hover:border-accent hover:text-accent"
              >
                ＋ {variant === 'chat' ? '시청자' : '사람'} 추가
              </button>
            ) : null}
          </div>
        ) : null}
        <p className="text-xs text-muted">이름을 바꾸면 그 사람의 말풍선 전체에 바로 반영돼요.</p>
      </section>

      <section className="space-y-2">
        <h4 className="text-xs font-bold text-muted">
          대사 {messages.length}개{' '}
          <span className="font-normal">· Enter로 다음 대사, Shift+Enter로 줄바꿈</span>
        </h4>
        {messages.length > 0 ? (
          <ol className="space-y-2">
            {messages.map((message, index) => {
              const mine = isKakao && message.from === meId;
              return (
                <li
                  key={message.id}
                  className={cn('space-y-1.5 rounded-xl border p-2', mine ? ME_TONE : 'border-line bg-surface')}
                >
                  {/* 윗줄: 말하는 사람 · 시간 · 순서/삭제, 아랫줄: 대사 (긴 대사도 넓게) */}
                  <div className="flex items-center gap-2">
                    <select
                      value={message.from}
                      onChange={(e) => updateMessage(message.id, { from: e.target.value })}
                      aria-label="말하는 사람"
                      className="h-9 max-w-[55%] min-w-0 rounded-lg border border-line bg-surface px-2 text-base font-semibold"
                    >
                      {speakers.map((person) => (
                        <option key={person.id} value={person.id}>
                          {(person.name.trim() || '이름 없음') + (isKakao && person.id === meId ? ' (나)' : '')}
                        </option>
                      ))}
                    </select>
                    {isKakao ? (
                      <input
                        value={message.time}
                        maxLength={20}
                        onChange={(e) => updateMessage(message.id, { time: e.target.value })}
                        placeholder="시간 (선택)"
                        aria-label="보낸 시간"
                        className={cn(INPUT_BASE, 'h-9 w-28 min-w-0 shrink px-2.5')}
                      />
                    ) : null}
                    <div className="ml-auto flex shrink-0">
                      <IconButton label="위로" onClick={() => moveMessage(index, -1)} disabled={index === 0}>
                        ↑
                      </IconButton>
                      <IconButton label="아래로" onClick={() => moveMessage(index, 1)} disabled={index === messages.length - 1}>
                        ↓
                      </IconButton>
                      <IconButton label="대사 지우기" onClick={() => removeMessage(message.id)} danger>
                        ✕
                      </IconButton>
                    </div>
                  </div>
                  <textarea
                    value={message.text}
                    rows={1}
                    maxLength={LIMITS.message}
                    autoFocus={message.id === focusId}
                    onChange={(e) => updateMessage(message.id, { text: e.target.value })}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    placeholder="대사"
                    aria-label={`${nameOf(message.from)}의 대사`}
                    className={cn(TEXTAREA, 'min-h-10')}
                  />
                </li>
              );
            })}
          </ol>
        ) : null}

        {canAddMessage ? (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs font-semibold text-muted">대사 추가</span>
            {speakers.map((person) => (
              <button
                key={person.id}
                type="button"
                onClick={() => insertMessage(messages.length, person.id)}
                className={cn(
                  'h-9 rounded-full border px-3 text-sm font-semibold transition',
                  isKakao && person.id === meId ? `${ME_TONE} hover:bg-[#f6b8cd]/25` : 'border-line bg-surface hover:bg-surface-2',
                )}
              >
                ＋ {person.name.trim() || '이름 없음'}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted">대사는 {LIMITS.messages}개까지 넣을 수 있어요.</p>
        )}
      </section>

      <details className="rounded-xl border border-line bg-surface-2/50 p-3">
        <summary className="cursor-pointer text-sm font-semibold">여러 줄 한 번에 넣기</summary>
        <div className="mt-3 space-y-2">
          <p className="text-xs leading-relaxed text-muted">
            한 줄에 ‘이름: 대사’로 적으면 순서대로 아래에 추가돼요.{' '}
            {isKakao
              ? '‘나: …’는 오른쪽 말풍선이 되고, 줄 끝에 [오후 8:14]를 붙이면 시간으로 들어가요.'
              : '처음 보는 이름은 시청자로 자동 추가돼요.'}
          </p>
          <textarea
            value={bulk}
            onChange={(e) => setBulk(e.target.value)}
            rows={5}
            placeholder={isKakao ? '상대: 뭐 해?\n나: 방송 준비하고 있어요! [오후 8:15]' : '밥알: 연화님 ㅎㅇ\n감자도리: 오늘 뭐함?'}
            className={cn(TEXTAREA, 'min-h-28 field-sizing-fixed')}
          />
          <div className="flex justify-end">
            <Button type="button" size="sm" variant="secondary" onClick={addBulk} disabled={!bulk.trim()}>
              아래에 추가
            </Button>
          </div>
        </div>
      </details>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'grid size-8 place-items-center rounded-lg text-sm text-muted transition hover:bg-surface-2 disabled:pointer-events-none disabled:opacity-30',
        danger ? 'hover:text-danger' : 'hover:text-fg',
      )}
    >
      {children}
    </button>
  );
}

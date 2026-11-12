'use client';

import { useEffect, useId, useRef, type RefObject } from 'react';
import {
  changeLabel,
  changeSummary,
  clipAround,
  clipLines,
  inlineChange,
  SCENE_BREAK_UNIT,
  type Change,
  type ChapterChanges,
  type FieldChange,
} from '@/lib/paragraph-diff';

const show = (text: string) => (text === SCENE_BREAK_UNIT ? '✦ 장면 전환' : text);
const shorten = (text: string) => {
  const line = show(text).split('\n')[0];
  return [...line].length > 40 ? `${[...line].slice(0, 40).join('')}…` : line;
};

const LABEL = 'text-xs font-semibold text-muted';
const BLOCK = 'mt-1 block rounded-lg px-2.5 py-1.5 text-sm leading-relaxed whitespace-pre-wrap text-fg';
const MARK = 'mr-1.5 text-xs font-semibold text-muted';

/** 제목·작가의 말: 비어 있다가 생기면 새 글, 비우면 지운 글, 아니면 고친 글 */
const fieldAsChange = ({ before, after }: FieldChange): Change =>
  !before
    ? { kind: 'added', text: after, template: false }
    : !after
      ? { kind: 'removed', text: before, template: false }
      : { kind: 'changed', before, after, template: false };

/** 바뀐 것 하나: 고친 글은 전·후를 나란히 두고 실제로 바뀐 글자만 표시 (지운 글자는 취소선, 넣은 글자는 밑줄). 길면 바뀐 곳 둘레만 */
function ChangeView({ change }: { change: Change }) {
  if (change.kind === 'removed')
    return (
      <del className={`${BLOCK} bg-danger/10 line-through decoration-danger/70`}>
        <span className="sr-only">지운 글: </span>
        {clipLines(show(change.text))}
      </del>
    );
  if (change.kind === 'added')
    return (
      <ins className={`${BLOCK} bg-accent-soft no-underline`}>
        <span className="sr-only">새 글: </span>
        {clipLines(show(change.text))}
      </ins>
    );
  const { removed, added, ...same } = inlineChange(show(change.before), show(change.after));
  const { prefix, suffix } = clipAround(same.prefix, same.suffix, change.template);
  return (
    <>
      <p className={`${BLOCK} bg-danger/10`}>
        <span aria-hidden="true" className={MARK}>
          전
        </span>
        <span className="sr-only">고치기 전: </span>
        {prefix}
        {removed ? <del className="rounded-sm bg-danger/20 line-through decoration-danger decoration-2">{removed}</del> : null}
        {suffix}
      </p>
      <p className={`${BLOCK} bg-accent-soft`}>
        <span aria-hidden="true" className={MARK}>
          후
        </span>
        <span className="sr-only">고친 뒤: </span>
        {prefix}
        {added ? <ins className="rounded-sm bg-accent/20 underline decoration-accent decoration-2 underline-offset-2">{added}</ins> : null}
        {suffix}
      </p>
    </>
  );
}

/** 제목·작가의 말 항목: 새로 쓰거나 비웠으면 이름 옆에 적어 준다 */
function FieldItem({ label, change }: { label: string; change: Change }) {
  return (
    <li className="rounded-xl border border-line p-3">
      <p className={LABEL}>
        {label}
        {change.kind === 'added' ? ' · 새로 씀' : change.kind === 'removed' ? ' · 비움' : ''}
      </p>
      <ChangeView change={change} />
    </li>
  );
}

/**
 * 길드원에게 보이는 회차를 고치는 중에 '수정 반영' 전에 마지막 발행본과 달라진 곳을 보여 주는 창.
 * 여는 단추와 계산은 에디터 쪽에 있고(누를 때만 계산), 이 창은 받은 결과를 그리기만 한다.
 * 브라우저 기본 모달이라 Esc로 닫히고, 닫으면 연 단추로 포커스가 돌아간다
 */
export function ChangesDialog({ result, dialogRef }: { result: ChapterChanges | null; dialogRef: RefObject<HTMLDialogElement | null> }) {
  const titleId = useId();
  // 열 때마다(새로 비교할 때마다) 목록 맨 위부터: 지난번에 내려 둔 자리가 남지 않게
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    listRef.current?.scrollTo({ top: 0 });
  }, [result]);
  const title = result?.title ? fieldAsChange(result.title) : null;
  const note = result?.note ? fieldAsChange(result.note) : null;
  const summary = result ? changeSummary(result) : [];

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClick={(event) => {
        if (event.target === event.currentTarget) dialogRef.current?.close();
      }}
      className="m-auto w-[min(36rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-line bg-surface p-0 text-fg shadow-xl backdrop:bg-black/45"
    >
      <div className="flex max-h-[min(44rem,calc(100dvh-2rem))] flex-col">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line py-2.5 pr-2.5 pl-5">
          <h2 id={titleId} className="font-bold">
            발행본과 바뀐 곳
          </h2>
          <button
            type="button"
            autoFocus
            onClick={() => dialogRef.current?.close()}
            aria-label="닫기"
            className="grid size-9 place-items-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-fg"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" className="size-4">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        {/* 목록이 길면 안에서 스크롤: 키보드로도 내릴 수 있게 포커스를 받는다 */}
        <div
          ref={listRef}
          tabIndex={0}
          role="region"
          aria-label="바뀐 곳 목록"
          className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-5 py-4 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
        >
          {result ? (
            <>
              <p className="text-sm text-muted">
                {summary.length > 0 ? summary.join(' · ') : '발행본과 같아요. 빈 줄 간격이나 글자 모양(굵게·기울임)만 달라졌을 수 있어요.'}
              </p>
              {summary.length > 0 ? (
                <ol className="space-y-3">
                  {title ? <FieldItem label="제목" change={title} /> : null}
                  {result.groups.map((group, index) => (
                    <li key={index} className="space-y-2.5 rounded-xl border border-line p-3">
                      <p className="truncate text-xs text-muted">{group.anchor ? `바로 앞: ${shorten(group.anchor)}` : '본문 맨 처음'}</p>
                      {group.changes.map((change, k) => (
                        <div key={k}>
                          <p className={LABEL}>{changeLabel(change)}</p>
                          <ChangeView change={change} />
                        </div>
                      ))}
                    </li>
                  ))}
                  {note ? <FieldItem label="작가의 말" change={note} /> : null}
                </ol>
              ) : null}
              <p className="text-xs text-muted">‘수정 반영’을 누르면 길드원에게 이대로 보여요.</p>
            </>
          ) : null}
        </div>
      </div>
    </dialog>
  );
}

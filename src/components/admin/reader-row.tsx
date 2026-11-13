'use client';

import Link from 'next/link';
import { startTransition, useActionState, useMemo, useState, type FormEvent } from 'react';
import { deleteReader, renameReader } from '@/app/admin/actions';
import { SubmitButton } from '@/components/submit-button';
import { Button, FormMessage, Input } from '@/components/ui';
import { IDLE } from '@/lib/action-state';
import { cn, NICKNAME_MAX } from '@/lib/utils';

type ReaderSummary = {
  id: string;
  nickname: string;
  firstSeen: string;
  lastSeen: string;
  // 2주 넘게 안 들어왔으면 마지막으로 들어온 뒤 지난 날 수 (아니면 null)
  awayDays: number | null;
  readChapters: number;
  likes: number;
  // 가장 최근에 연 회차 (작품이 여러 개일 수 있어서 작품 이름도 같이)
  lastRead: { href: string; novel: string; chapter: string; at: string; when: string } | null;
  // 작품마다 읽기 진행: '3화까지 · 최신 화' 같은 글과 막대 몫 (최근에 연 작품부터)
  progress: { novelId: number; novel: string; label: string; percent: number; latest: boolean }[];
};

export function ReaderRow({ reader }: { reader: ReaderSummary }) {
  const [editing, setEditing] = useState(false);
  const rename = useMemo(() => renameReader.bind(null, reader.id), [reader.id]);
  const [state, dispatch, pending] = useActionState(rename, IDLE);

  function handleRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  }

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 py-4">
      {/* 아주 좁은 화면(320px)에서는 이름 칸이 9rem보다 좁아지지 않게 '이름 수정 · 삭제'가 아래 줄로 */}
      <div className="min-w-[9rem] flex-1 space-y-1">
        {editing ? (
          <form onSubmit={handleRename} className="flex gap-2">
            <Input name="name" defaultValue={reader.nickname} maxLength={NICKNAME_MAX} required autoFocus aria-label="새 이름" className="h-9" />
            <Button size="sm" disabled={pending} className="h-9">
              저장
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-9" onClick={() => setEditing(false)}>
              취소
            </Button>
          </form>
        ) : (
          // 이름 옆 자리가 모자라면 배지가 이름 아래 줄로 (긴 이름이 '…'만 남지 않게)
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
            <p className="max-w-full min-w-0 truncate font-semibold">{reader.nickname}</p>
            {reader.awayDays !== null ? (
              <span className="shrink-0 rounded-full bg-surface-2 px-2 py-px text-[11px] font-semibold text-muted">{reader.awayDays}일째 안 들어옴</span>
            ) : null}
          </div>
        )}
        <p className="text-[13px] text-muted">
          처음 {reader.firstSeen} · 마지막 {reader.lastSeen} · 읽은 회차 {reader.readChapters} ·{' '}
          <span className="text-like">♥ {reader.likes}</span>
        </p>
        {reader.lastRead ? (
          // 제목이 길면 자르지 않고 다음 줄로 (관리자가 끝까지 읽을 수 있게)
          <p className="text-[13px] leading-relaxed break-keep text-muted">
            최근에 읽은 회차{' '}
            <Link href={reader.lastRead.href} className="font-medium text-accent underline-offset-2 hover:underline">
              {reader.lastRead.novel} · {reader.lastRead.chapter}
            </Link>{' '}
            · <time dateTime={reader.lastRead.at}>{reader.lastRead.when}</time>
          </p>
        ) : null}
        <FormMessage state={state} />
      </div>
      {!editing ? (
        <div className="flex gap-1">
          <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(true)}>
            이름 수정
          </Button>
          <form
            action={deleteReader.bind(null, reader.id)}
            onSubmit={(event) => {
              if (!window.confirm(`${reader.nickname}님을 삭제할까요? 좋아요·열람 기록도 지워져요.`)) {
                event.preventDefault();
              }
            }}
          >
            <SubmitButton variant="ghost" size="sm" className="text-danger" pendingText="삭제 중…">
              삭제
            </SubmitButton>
          </form>
        </div>
      ) : null}
      {/* 작품별 읽기 진행: 이름·단추 줄 아래 전체 폭으로 (좁은 화면에서 막대가 단추에 밀려 짧아지지 않게) */}
      {reader.progress.length > 0 ? (
        <ul aria-label={`${reader.nickname}님 작품별 읽기 진행`} className="w-full max-w-md space-y-2">
          {reader.progress.map((item) => (
            <li key={item.novelId}>
              {/* 좁은 화면에서는 진행 글이 작품 이름 아래 줄로 */}
              <p className="flex flex-wrap items-baseline justify-between gap-x-3 text-[13px]">
                <span className="min-w-0 truncate font-medium">{item.novel}</span>
                <span className="text-muted tabular-nums">{item.label}</span>
              </p>
              {/* 막대는 글과 같은 내용이라 낭독기에서는 건너뜀. 최신 화까지 읽었으면 진하게 */}
              <span aria-hidden="true" className="mt-1 block h-1.5 overflow-hidden rounded-full bg-surface-2">
                <span className={cn('block h-full rounded-full', item.latest ? 'bg-accent' : 'bg-accent/55')} style={{ width: `${item.percent}%` }} />
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

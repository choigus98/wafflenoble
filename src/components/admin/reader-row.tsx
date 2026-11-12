'use client';

import Link from 'next/link';
import { startTransition, useActionState, useMemo, useState, type FormEvent } from 'react';
import { deleteReader, renameReader } from '@/app/admin/actions';
import { SubmitButton } from '@/components/submit-button';
import { Button, FormMessage, Input } from '@/components/ui';
import { IDLE } from '@/lib/action-state';
import { NICKNAME_MAX } from '@/lib/utils';

type ReaderSummary = {
  id: string;
  nickname: string;
  firstSeen: string;
  lastSeen: string;
  readChapters: number;
  likes: number;
  // 가장 최근에 연 회차 (작품이 여러 개일 수 있어서 작품 이름도 같이)
  lastRead: { href: string; novel: string; chapter: string; at: string; when: string } | null;
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
      <div className="min-w-0 flex-1 space-y-1">
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
          <p className="truncate font-semibold">{reader.nickname}</p>
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
    </li>
  );
}

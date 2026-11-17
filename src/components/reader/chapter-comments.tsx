'use client';

import { useId, useRef, useState, useTransition } from 'react';
import { addComment, deleteComment } from '@/app/(reader)/actions';
import { Button, Textarea } from '@/components/ui';
import { COMMENT_MAX, type CommentItem } from '@/lib/comments';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';

/**
 * 회차 끝 댓글. 길드원끼리는 모두 '익명'(내 댓글만 '나')이고, 작가(관리자)에게는 쓴 사람 이름이 보인다.
 * 이름은 서버에서 관리자에게만 보내므로(lib/comments.ts) 길드원 화면의 데이터에는 아예 없다
 */
export function ChapterComments({
  chapterId,
  initial,
  canWrite,
  isAdmin,
}: {
  chapterId: number;
  initial: CommentItem[];
  canWrite: boolean; // 길드원이 공개 회차를 볼 때만
  isAdmin: boolean;
}) {
  const [comments, setComments] = useState(initial);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const inputId = useId();
  const length = [...draft.trim()].length;
  const tooLong = length > COMMENT_MAX;

  function submit() {
    if (pending || length === 0 || tooLong) return;
    startTransition(async () => {
      const result = await addComment(chapterId, draft);
      if ('error' in result) {
        setError(result.error);
        return;
      }
      setError(null);
      setDraft('');
      setComments(result.comments);
      setStatus('댓글을 남겼어요');
    });
  }

  function remove(id: number) {
    if (!window.confirm('이 댓글을 지울까요?')) return;
    startTransition(async () => {
      const result = await deleteComment(id);
      if ('error' in result) {
        setError(result.error);
        return;
      }
      setError(null);
      setComments(result.comments);
      setStatus('댓글을 지웠어요');
      inputRef.current?.focus();
    });
  }

  return (
    <section aria-labelledby="comments-title" data-print-hide="" className="space-y-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="comments-title" className="text-base font-bold">
          댓글 <span className="text-muted tabular-nums">{comments.length > 0 ? comments.length : ''}</span>
        </h2>
        <p className="text-xs text-muted">{isAdmin ? '쓴 사람 이름은 작가에게만 보여요' : '댓글은 익명으로 보여요'}</p>
      </div>

      {comments.length > 0 ? (
        <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
          {comments.map((comment) => (
            <li key={comment.id} className="space-y-1.5 px-4 py-3.5">
              <div className="flex items-center gap-2 text-xs">
                <span className={cn('font-semibold', comment.mine ? 'text-accent' : 'text-fg')}>
                  {comment.author ?? (comment.mine ? '나' : '익명')}
                </span>
                {isAdmin && comment.author ? <span className="sr-only">(작가에게만 보이는 이름)</span> : null}
                <time dateTime={comment.createdAt} className="text-muted tabular-nums">
                  {formatDateTime(new Date(comment.createdAt))}
                </time>
                {comment.mine || isAdmin ? (
                  <button
                    type="button"
                    onClick={() => remove(comment.id)}
                    disabled={pending}
                    className="ml-auto rounded-md px-1.5 py-0.5 text-muted hover:text-danger focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none disabled:opacity-50"
                  >
                    지우기
                  </button>
                ) : null}
              </div>
              <p className="text-[15px] leading-relaxed whitespace-pre-line break-words break-keep">{comment.body}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
          {canWrite ? '첫 댓글을 남겨 보세요.' : '아직 댓글이 없어요.'}
        </p>
      )}

      {canWrite ? (
        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <label htmlFor={inputId} className="sr-only">
            댓글 쓰기 (익명으로 보여요)
          </label>
          <Textarea
            ref={inputRef}
            id={inputId}
            value={draft}
            rows={3}
            placeholder="이번 화 어땠나요? 다른 길드원에게는 익명으로 보여요."
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              // ⌘/Ctrl + Enter로 바로 남기기
              if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                submit();
              }
            }}
            aria-invalid={tooLong || undefined}
            className="resize-y"
          />
          {/* 좁은 화면에서는 오른쪽 아래 떠 있는 단추(듣기·책갈피)가 덮지 않게 남기기 단추를 왼쪽에 둔다 */}
          <div className="flex flex-row-reverse items-center justify-between gap-3 sm:flex-row">
            <span className={cn('text-xs tabular-nums', tooLong ? 'font-semibold text-danger' : 'text-muted')}>
              {length}/{COMMENT_MAX}
            </span>
            <Button size="sm" disabled={pending || length === 0 || tooLong}>
              {pending ? '남기는 중…' : '댓글 남기기'}
            </Button>
          </div>
        </form>
      ) : null}

      {error ? (
        <p role="alert" className="text-[13px] text-danger">
          {error}
        </p>
      ) : null}
      <p role="status" className="sr-only">
        {status}
      </p>
    </section>
  );
}

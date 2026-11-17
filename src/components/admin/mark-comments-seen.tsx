'use client';

import { useEffect, useRef } from 'react';
import { markCommentsSeen } from '@/app/admin/actions';

/** '댓글' 화면을 열면 새 댓글을 확인한 것으로 적는다 (화면에 그리는 것은 없음) */
export function MarkCommentsSeen({ until }: { until: string }) {
  const done = useRef<string | null>(null);
  useEffect(() => {
    if (done.current === until) return;
    done.current = until;
    void markCommentsSeen(until);
  }, [until]);
  return null;
}

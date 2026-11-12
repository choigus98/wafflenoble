'use client';

import { useState } from 'react';
import { deleteNovel } from '@/app/admin/actions';
import { SubmitButton } from '@/components/submit-button';
import { Input } from '@/components/ui';

/** 작품 제목을 똑같이 입력해야 삭제 버튼이 켜진다 (서버에서도 한 번 더 확인) */
export function DeleteNovelForm({ novelId, title }: { novelId: number; title: string }) {
  const [typed, setTyped] = useState('');
  return (
    <form action={deleteNovel.bind(null, novelId)} className="space-y-3">
      <p className="text-sm leading-relaxed text-muted">
        작품을 지우면 모든 회차와 좋아요·열람 기록이 함께 지워지고 되돌릴 수 없어요. 지우려면 작품 제목{' '}
        <strong className="text-fg">{title}</strong>을(를) 입력해 주세요.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          name="confirmTitle"
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          placeholder={title}
          aria-label="삭제 확인용 작품 제목"
          autoComplete="off"
        />
        <SubmitButton variant="danger" disabled={typed !== title} pendingText="지우는 중…" className="h-11">
          작품 삭제
        </SubmitButton>
      </div>
    </form>
  );
}

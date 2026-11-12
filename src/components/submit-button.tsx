'use client';

import type { ComponentProps } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui';

/** <form action={서버액션}> 안에서 전송 중이면 자동으로 비활성화되는 버튼 */
export function SubmitButton({
  pendingText,
  children,
  disabled,
  ...props
}: ComponentProps<typeof Button> & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button disabled={pending || disabled} aria-busy={pending} {...props}>
      {pending && pendingText ? pendingText : children}
    </Button>
  );
}

'use client';

import { Logo } from '@/components/logo';
import { Button } from '@/components/ui';

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main" tabIndex={-1} className="outline-none mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
      <Logo />
      <div className="space-y-2">
        <h1 className="text-xl font-bold">잠깐 문제가 생겼어요</h1>
        <p className="text-muted">잠시 후 다시 시도해 주세요.</p>
      </div>
      <Button type="button" variant="secondary" onClick={reset}>
        다시 시도
      </Button>
    </main>
  );
}

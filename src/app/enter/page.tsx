import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { WaffleIcon } from '@/components/logo';
import { Skeleton } from '@/components/ui';
import { getRememberedReader, getViewer } from '@/lib/auth/guards';
import { getGuildSettings } from '@/lib/settings';
import { safeNextPath } from '@/lib/utils';
import { EnterForm } from './enter-form';

// metadata를 따로 두지 않는다 → 링크 미리보기에는 루트 기본값 '와플노블'만 보인다

export default function EnterPage({ searchParams }: PageProps<'/enter'>) {
  return (
    <main id="main" tabIndex={-1} className="outline-none mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-6 py-12">
      <div className="mb-9 flex flex-col items-center gap-4 text-center">
        <WaffleIcon className="size-14" />
        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold tracking-tight">와플노블</h1>
          <p className="text-[15px] text-muted">길드원 전용 서재예요</p>
        </div>
      </div>
      <Suspense fallback={<EnterSkeleton />}>
        <EnterGate searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function EnterGate({ searchParams }: Pick<PageProps<'/enter'>, 'searchParams'>) {
  const { next } = await searchParams;
  const nextPath = safeNextPath(next);

  // 이미 입장한 상태면 바로 원래 가려던 곳으로
  if (await getViewer()) redirect(nextPath);

  const [guild, remembered] = await Promise.all([getGuildSettings(), getRememberedReader()]);
  return (
    <EnterForm
      next={nextPath}
      defaultName={remembered?.name ?? ''}
      closed={!guild.guildPasswordHash}
      returning={Boolean(remembered)}
    />
  );
}

function EnterSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-11" />
      <Skeleton className="h-11" />
      <Skeleton className="h-12" />
    </div>
  );
}

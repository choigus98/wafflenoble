import Link from 'next/link';
import { Suspense } from 'react';
import { Logo } from '@/components/logo';
import { NicknameMenu } from '@/components/reader/nickname-menu';
import { ButtonLink, Skeleton } from '@/components/ui';
import { requireViewer } from '@/lib/auth/guards';

// 헤더 뼈대는 정적으로 먼저 보내고, 세션을 읽는 이름 영역만 Suspense 안에서 스트리밍한다
export default function ReaderLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4">
          <Link href="/" className="rounded-lg focus-visible:outline-2 focus-visible:outline-accent">
            <Logo />
          </Link>
          <Suspense fallback={<Skeleton className="h-8 w-24 rounded-full" />}>
            <ViewerArea />
          </Suspense>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-20">{children}</main>
    </div>
  );
}

async function ViewerArea() {
  const viewer = await requireViewer();
  if (viewer.kind === 'admin') {
    return (
      <ButtonLink href="/admin" variant="secondary" size="sm">
        관리자 화면
      </ButtonLink>
    );
  }
  // 이름이 바뀌면 key가 바뀌어 메뉴가 새로 그려진다 (이름 바꾸기 창이 자연스럽게 닫힘)
  return <NicknameMenu key={viewer.reader.nickname} name={viewer.reader.nickname} />;
}

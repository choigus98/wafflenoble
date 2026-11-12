import type { Metadata } from 'next';
import Link from 'next/link';
import { logoutAdmin } from '@/app/admin/actions';
import { AdminNav } from '@/components/admin/admin-nav';
import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { Badge, Button, ButtonLink } from '@/components/ui';

export const metadata: Metadata = { title: '관리자' };

// 레이아웃은 정적 뼈대만 그린다. 권한 확인은 각 페이지의 조회 함수와 서버 액션에서 한다
// (레이아웃은 화면 이동 때 다시 실행되지 않을 수 있어서 여기서 막으면 안전하지 않다)
export default function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header data-focus-hide="" className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-1 px-4 pt-3 sm:h-16 sm:flex-nowrap sm:pt-0">
          <Link href="/admin" className="flex items-center gap-2 rounded-lg focus-visible:outline-2 focus-visible:outline-accent">
            <Logo />
            <Badge tone="accent">작가</Badge>
          </Link>
          <div className="ml-auto flex items-center gap-1 sm:order-last">
            <ThemeToggle />
            <ButtonLink href="/" variant="ghost" size="sm">
              열람 화면
            </ButtonLink>
            <form action={logoutAdmin}>
              <Button variant="ghost" size="sm">
                로그아웃
              </Button>
            </form>
          </div>
          <AdminNav />
        </div>
      </header>
      <main id="main" tabIndex={-1} className="outline-none mx-auto w-full max-w-5xl flex-1 px-4 pt-8 pb-20">{children}</main>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Suspense } from 'react';
import { cn } from '@/lib/utils';

const LINKS = [
  { href: '/admin', label: '작품', match: (path: string) => path === '/admin' || path.startsWith('/admin/novels') },
  { href: '/admin/readers', label: '길드원', match: (path: string) => path.startsWith('/admin/readers') },
  { href: '/admin/settings', label: '설정', match: (path: string) => path.startsWith('/admin/settings') },
];

function NavLinks({ pathname }: { pathname: string | null }) {
  return (
    <nav className="-mx-1 flex w-full gap-1 overflow-x-auto pb-2 sm:mx-0 sm:w-auto sm:pb-0">
      {LINKS.map((link) => {
        const active = pathname ? link.match(pathname) : false;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'rounded-lg px-3 py-2 text-sm font-semibold transition',
              active ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-surface-2 hover:text-fg',
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

function ActiveNavLinks() {
  return <NavLinks pathname={usePathname()} />;
}

/**
 * 현재 경로는 요청 시점에만 알 수 있어서(Cache Components), 정적 뼈대에는 강조 없는 메뉴를 넣고
 * 현재 메뉴 강조는 Suspense 안에서 채운다
 */
export function AdminNav() {
  return (
    <Suspense fallback={<NavLinks pathname={null} />}>
      <ActiveNavLinks />
    </Suspense>
  );
}

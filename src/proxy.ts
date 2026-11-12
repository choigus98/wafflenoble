import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_COOKIE, READER_COOKIE, verifyAdminToken, verifyReaderToken } from '@/lib/auth/session';

// 쿠키 서명만 보는 1차 검사 (DB 조회 없음). 실제 권한 판단은 lib/auth/guards.ts에서 다시 한다.
// 링크 미리보기 봇도 쿠키가 없으니 /enter로 가서 '와플노블' 메타만 읽는다.
const OPEN_PATHS = new Set(['/enter', '/admin/login']);

export async function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.searchParams.delete('_rsc');
  const path = url.pathname + url.search;

  // 서버 컴포넌트에서 '원래 가려던 경로'를 알 수 있도록 전달 (클라이언트가 보낸 값은 덮어씀)
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-wn-path', path);
  const pass = () => NextResponse.next({ request: { headers: requestHeaders } });

  if (OPEN_PATHS.has(url.pathname)) return pass();

  const admin = await verifyAdminToken(request.cookies.get(ADMIN_COOKIE)?.value);
  if (url.pathname === '/admin' || url.pathname.startsWith('/admin/')) {
    return admin ? pass() : NextResponse.redirect(new URL('/admin/login', request.url));
  }

  if (admin) return pass();
  const reader = await verifyReaderToken(request.cookies.get(READER_COOKIE)?.value);
  if (reader) return pass();

  const enter = new URL('/enter', request.url);
  if (url.pathname !== '/') enter.searchParams.set('next', path);
  return NextResponse.redirect(enter);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|icon\\.svg|robots\\.txt).*)'],
};

import 'server-only';
import { eq } from 'drizzle-orm';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { db } from '@/lib/db';
import { readers } from '@/lib/db/schema';
import { getGuildSettings } from '@/lib/settings';
import { currentAdminPasswordVersion } from './password';
import { ADMIN_COOKIE, READER_COOKIE, verifyAdminToken, verifyReaderToken } from './session';

export type Reader = { id: string; nickname: string };
export type Viewer = { kind: 'admin' } | { kind: 'reader'; reader: Reader };

/**
 * 현재 요청의 열람자. 쿠키 서명뿐 아니라 비밀번호 버전, 길드원 존재 여부까지 확인한다.
 * proxy는 서명만 보는 1차 검사라서, 데이터에 접근하기 전에는 항상 여기를 거친다.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const jar = await cookies();

  const admin = await verifyAdminToken(jar.get(ADMIN_COOKIE)?.value);
  const adminVersion = currentAdminPasswordVersion();
  if (admin && adminVersion && admin.pv === adminVersion) return { kind: 'admin' };

  const claims = await verifyReaderToken(jar.get(READER_COOKIE)?.value);
  if (!claims) return null;
  const guild = await getGuildSettings();
  if (!guild.guildPasswordHash || claims.gv !== guild.guildPasswordVersion) return null;
  const reader = await db.query.readers.findFirst({
    columns: { id: true, nickname: true },
    where: eq(readers.id, claims.rid),
  });
  return reader ? { kind: 'reader', reader } : null;
});

export async function isAdmin(): Promise<boolean> {
  return (await getViewer())?.kind === 'admin';
}

export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) redirect('/admin/login');
}

/** 관리자 또는 입장한 길드원. 아니면 입장 화면으로 보내고, 원래 가려던 경로를 next로 넘긴다 */
export async function requireViewer(): Promise<Viewer> {
  const viewer = await getViewer();
  if (viewer) return viewer;
  const path = (await headers()).get('x-wn-path');
  redirect(path && path !== '/' ? `/enter?next=${encodeURIComponent(path)}` : '/enter');
}

/** 좋아요·조회 기록처럼 길드원만 할 수 있는 동작용 (관리자는 null) */
export async function getReader(): Promise<Reader | null> {
  const viewer = await getViewer();
  return viewer?.kind === 'reader' ? viewer.reader : null;
}

/**
 * 서명은 유효하지만 길드 비밀번호가 바뀌어 무효가 된 쿠키에서도 이름을 꺼낸다.
 * 다시 입장할 때 이름 칸을 미리 채우는 용도로만 쓴다.
 */
export async function getRememberedReader(): Promise<{ id: string; name: string } | null> {
  const claims = await verifyReaderToken((await cookies()).get(READER_COOKIE)?.value);
  return claims ? { id: claims.rid, name: claims.name } : null;
}

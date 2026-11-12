'use server';

import { and, eq, sql } from 'drizzle-orm';
import { refresh } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/guards';
import { hashPassword } from '@/lib/auth/password';
import { ADMIN_COOKIE } from '@/lib/auth/session';
import { countCharacters, sanitizeChapterHtml } from '@/lib/content';
import { db } from '@/lib/db';
import { isUniqueViolation } from '@/lib/db/errors';
import { chapters, novels, readers, settings } from '@/lib/db/schema';
import { NICKNAME_MAX, NICKNAME_MIN, normalizeNickname } from '@/lib/utils';
import type { ActionState } from '@/lib/action-state';

// 서버 액션은 누구나 호출할 수 있는 공개 엔드포인트라서, 모든 액션이 첫 줄에서 requireAdmin()을 호출하고
// 인자를 직접 검증한다 (proxy만 믿지 않음).

const idSchema = z.number().int().positive();

const novelSchema = z.object({
  title: z.string().trim().min(1, '제목을 입력해 주세요').max(100, '제목은 100자까지예요'),
  description: z.string().trim().max(2000, '소개는 2000자까지예요'),
  serialStatus: z.enum(['ongoing', 'completed', 'hiatus'], { error: '연재 상태를 골라 주세요' }),
  isPublished: z.boolean(),
});

function parseNovelForm(formData: FormData) {
  return novelSchema.safeParse({
    title: String(formData.get('title') ?? ''),
    description: String(formData.get('description') ?? ''),
    serialStatus: formData.get('serialStatus'),
    isPublished: formData.get('isPublished') === 'on',
  });
}

function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? '입력한 내용을 확인해 주세요';
}

// ─── 작품 ──────────────────────────────────────────────

export async function createNovel(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = parseNovelForm(formData);
  if (!parsed.success) return { status: 'error', message: firstIssue(parsed.error) };

  const [created] = await db.insert(novels).values(parsed.data).returning({ id: novels.id });
  redirect(`/admin/novels/${created.id}`);
}

export async function updateNovel(
  novelId: number,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  if (!idSchema.safeParse(novelId).success) return { status: 'error', message: '잘못된 요청이에요' };
  const parsed = parseNovelForm(formData);
  if (!parsed.success) return { status: 'error', message: firstIssue(parsed.error) };

  await db.update(novels).set(parsed.data).where(eq(novels.id, novelId));
  refresh();
  return { status: 'success', message: '저장했어요', at: Date.now() };
}

export async function deleteNovel(novelId: number, formData: FormData): Promise<void> {
  await requireAdmin();
  if (!idSchema.safeParse(novelId).success) return;
  const novel = await db.query.novels.findFirst({ where: eq(novels.id, novelId) });
  if (!novel) redirect('/admin');
  // 화면의 확인 입력을 우회한 요청도 막는다
  if (String(formData.get('confirmTitle') ?? '') !== novel.title) return;

  await db.delete(novels).where(eq(novels.id, novelId));
  redirect('/admin');
}

// ─── 회차 ──────────────────────────────────────────────

export async function createChapter(novelId: number): Promise<void> {
  await requireAdmin();
  if (!idSchema.safeParse(novelId).success) return;
  const novel = await db.query.novels.findFirst({ columns: { id: true }, where: eq(novels.id, novelId) });
  if (!novel) redirect('/admin');

  const [{ nextPosition }] = await db
    .select({ nextPosition: sql<number>`coalesce(max(${chapters.position}), 0)::int + 1` })
    .from(chapters)
    .where(eq(chapters.novelId, novelId));
  const [created] = await db
    .insert(chapters)
    .values({ novelId, position: nextPosition })
    .returning({ id: chapters.id });
  redirect(`/admin/novels/${novelId}/chapters/${created.id}`);
}

const chapterInputSchema = z.object({
  id: idSchema,
  title: z.string().trim().max(100, '회차 제목은 100자까지예요'),
  position: z
    .number({ error: '회차 번호를 숫자로 입력해 주세요' })
    .int('회차 번호는 정수로 입력해 주세요')
    .min(1, '회차 번호는 1 이상이에요')
    .max(9999, '회차 번호가 너무 커요'),
  contentHtml: z.string().max(2_000_000, '본문이 너무 길어요'),
});

export type SaveChapterResult = { ok: true; savedAt: string } | { ok: false; message: string };

/** 자동저장·수정 반영 공용. 에디터 화면을 다시 그리지 않도록 refresh는 하지 않는다 */
export async function saveChapter(input: z.input<typeof chapterInputSchema>): Promise<SaveChapterResult> {
  await requireAdmin();
  const parsed = chapterInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: firstIssue(parsed.error) };

  const { id, title, position, contentHtml } = parsed.data;
  const clean = sanitizeChapterHtml(contentHtml);
  const charCount = countCharacters(clean);
  // 에디터는 빈 문서도 <p></p>로 내보내므로, 글자도 장면 전환도 없으면 빈 본문으로 저장
  const stored = charCount === 0 && !clean.includes('<hr') ? '' : clean;
  const [saved] = await db
    .update(chapters)
    .set({ title, position, contentHtml: stored, charCount })
    .where(eq(chapters.id, id))
    .returning({ updatedAt: chapters.updatedAt });
  if (!saved) return { ok: false, message: '회차를 찾을 수 없어요. 삭제됐을 수 있어요' };
  return { ok: true, savedAt: saved.updatedAt.toISOString() };
}

export type ChapterStatusResult =
  | { ok: true; status: 'draft' | 'published' }
  | { ok: false; message: string };

export async function setChapterStatus(
  chapterId: number,
  status: 'draft' | 'published',
): Promise<ChapterStatusResult> {
  await requireAdmin();
  if (!idSchema.safeParse(chapterId).success || (status !== 'draft' && status !== 'published')) {
    return { ok: false, message: '잘못된 요청이에요' };
  }

  if (status === 'published') {
    const found = await db.transaction(async (tx) => {
      const [chapter] = await tx
        .update(chapters)
        .set({ status: 'published', publishedAt: sql`coalesce(${chapters.publishedAt}, now())` })
        .where(eq(chapters.id, chapterId))
        .returning({ novelId: chapters.novelId });
      if (!chapter) return false;
      await tx.update(novels).set({ lastPublishedAt: sql`now()` }).where(eq(novels.id, chapter.novelId));
      return true;
    });
    if (!found) return { ok: false, message: '회차를 찾을 수 없어요' };
  } else {
    await db.update(chapters).set({ status: 'draft' }).where(eq(chapters.id, chapterId));
  }

  refresh();
  return { ok: true, status };
}

export async function deleteChapter(novelId: number, chapterId: number): Promise<void> {
  await requireAdmin();
  if (!idSchema.safeParse(novelId).success || !idSchema.safeParse(chapterId).success) return;
  await db.delete(chapters).where(and(eq(chapters.id, chapterId), eq(chapters.novelId, novelId)));
  redirect(`/admin/novels/${novelId}`);
}

// ─── 길드원 ────────────────────────────────────────────

export async function renameReader(
  readerId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  if (!z.uuid().safeParse(readerId).success) return { status: 'error', message: '잘못된 요청이에요' };
  const nickname = normalizeNickname(String(formData.get('name') ?? ''));
  if (!nickname) {
    return { status: 'error', message: `이름은 ${NICKNAME_MIN}~${NICKNAME_MAX}자로 입력해 주세요` };
  }

  try {
    await db
      .update(readers)
      .set({ nickname: nickname.display, nicknameKey: nickname.key })
      .where(eq(readers.id, readerId));
  } catch (error) {
    if (isUniqueViolation(error)) return { status: 'error', message: '이미 있는 이름이에요' };
    throw error;
  }
  refresh();
  return { status: 'success', at: Date.now() };
}

/** 길드원 삭제. 그 길드원의 좋아요·열람 기록도 함께 지워지고, 쿠키는 바로 무효가 된다 */
export async function deleteReader(readerId: string): Promise<void> {
  await requireAdmin();
  if (!z.uuid().safeParse(readerId).success) return;
  await db.delete(readers).where(eq(readers.id, readerId));
  refresh();
}

// ─── 설정 ──────────────────────────────────────────────

const guildPasswordSchema = z
  .object({
    password: z.string().min(4, '비밀번호는 4자 이상으로 정해 주세요').max(64, '비밀번호는 64자까지예요'),
    confirm: z.string(),
  })
  .refine((value) => value.password === value.confirm, { message: '두 비밀번호가 달라요' });

/** 길드 열람 비밀번호 설정·변경. 버전이 올라가서 기존 길드원은 전부 다시 입장해야 한다 */
export async function updateGuildPassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = guildPasswordSchema.safeParse({
    password: String(formData.get('password') ?? ''),
    confirm: String(formData.get('confirm') ?? ''),
  });
  if (!parsed.success) return { status: 'error', message: firstIssue(parsed.error) };

  const hash = await hashPassword(parsed.data.password);
  await db
    .insert(settings)
    .values({ id: 1, guildPasswordHash: hash, guildPasswordVersion: 1 })
    .onConflictDoUpdate({
      target: settings.id,
      set: {
        guildPasswordHash: hash,
        guildPasswordVersion: sql`${settings.guildPasswordVersion} + 1`,
        updatedAt: sql`now()`,
      },
    });
  refresh();
  return { status: 'success', message: '열람 비밀번호를 바꿨어요', at: Date.now() };
}

export async function logoutAdmin(): Promise<void> {
  (await cookies()).delete(ADMIN_COOKIE);
  redirect('/admin/login');
}

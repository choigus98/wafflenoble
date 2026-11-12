'use server';

import { and, asc, eq, sql } from 'drizzle-orm';
import { refresh } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/guards';
import { hashPassword } from '@/lib/auth/password';
import { ADMIN_COOKIE } from '@/lib/auth/session';
import { copyTitle } from '@/lib/chapter-copy';
import { CHARACTERS_MAX_LENGTH } from '@/lib/characters';
import { MAX_POSITION, planChapterMove } from '@/lib/chapter-order';
import { countCharacters, sanitizeChapterHtml } from '@/lib/content';
import { COVER_COLOR_KEYS } from '@/lib/cover';
import { db } from '@/lib/db';
import { isUniqueViolation } from '@/lib/db/errors';
import { chapterRevisions, chapters, novels, readers, settings } from '@/lib/db/schema';
import { adminListRevisions, type RevisionItem } from '@/lib/queries/admin';
import { isVisibleChapter } from '@/lib/queries/visibility';
import { hasStoryBlocks } from '@/lib/story-blocks';
import { NICKNAME_MAX, NICKNAME_MIN, normalizeNickname } from '@/lib/utils';
import type { ActionState } from '@/lib/action-state';

// 서버 액션은 누구나 호출할 수 있는 공개 엔드포인트라서, 모든 액션이 첫 줄에서 requireAdmin()을 호출하고
// 인자를 직접 검증한다 (proxy만 믿지 않음).

const idSchema = z.number().int().positive();

const novelSchema = z.object({
  title: z.string().trim().min(1, '제목을 입력해 주세요').max(100, '제목은 100자까지예요'),
  description: z.string().trim().max(2000, '소개는 2000자까지예요'),
  scheduleNote: z.string().trim().max(60, '연재 일정은 60자까지예요'),
  characters: z.string().trim().max(CHARACTERS_MAX_LENGTH, `등장인물은 ${CHARACTERS_MAX_LENGTH.toLocaleString('ko-KR')}자까지예요`),
  serialStatus: z.enum(['ongoing', 'completed', 'hiatus'], { error: '연재 상태를 골라 주세요' }),
  isPublished: z.boolean(),
  // 정해진 색 이름만 받는다. null이면 작품 번호로 자동
  coverColor: z.enum(COVER_COLOR_KEYS, { error: '표지 색을 다시 골라 주세요' }).nullable(),
});

function parseNovelForm(formData: FormData) {
  return novelSchema.safeParse({
    title: String(formData.get('title') ?? ''),
    description: String(formData.get('description') ?? ''),
    scheduleNote: String(formData.get('scheduleNote') ?? ''),
    // 폼으로 보내면 줄바꿈이 \r\n이 되므로 \n으로 맞춰 저장
    characters: String(formData.get('characters') ?? '').replace(/\r\n?/g, '\n'),
    serialStatus: formData.get('serialStatus'),
    isPublished: formData.get('isPublished') === 'on',
    coverColor: String(formData.get('coverColor') ?? '') || null,
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

const positionSchema = z
  .number({ error: '회차 번호를 숫자로 입력해 주세요' })
  .int('회차 번호는 정수로 입력해 주세요')
  .min(1, '회차 번호는 1 이상이에요')
  .max(MAX_POSITION, '회차 번호가 너무 커요');

const chapterInputSchema = z.object({
  id: idSchema,
  title: z.string().trim().max(100, '회차 제목은 100자까지예요'),
  // 에디터에서 번호를 직접 고쳤을 때만 보낸다. 다른 탭에서 순서를 바꾼 뒤 열려 있던 에디터가 옛 번호로 되돌리지 않게
  position: positionSchema.optional(),
  contentHtml: z.string().max(2_000_000, '본문이 너무 길어요'),
  // 회차 끝 '작가의 말'. 이 칸을 모르는 예전 에디터가 저장해도 지워지지 않게 보낼 때만 바꾼다
  authorNote: z.string().trim().max(2000, '작가의 말은 2,000자까지예요').optional(),
});

export type SaveChapterResult = { ok: true; savedAt: string } | { ok: false; message: string };

/** 자동저장·수정 반영 공용. 에디터 화면을 다시 그리지 않도록 refresh는 하지 않는다 */
export async function saveChapter(input: z.input<typeof chapterInputSchema>): Promise<SaveChapterResult> {
  await requireAdmin();
  const parsed = chapterInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: firstIssue(parsed.error) };

  const { id, title, position, contentHtml, authorNote } = parsed.data;
  const clean = sanitizeChapterHtml(contentHtml);
  const charCount = countCharacters(clean);
  // 에디터는 빈 문서도 <p></p>로 내보내므로, 글자도 장면 전환도 템플릿도 없으면 빈 본문으로 저장
  const stored = charCount === 0 && !clean.includes('<hr') && !hasStoryBlocks(clean) ? '' : clean;
  const saved = await db.transaction(async (tx) => {
    // 길드원에게 보이는 회차의 본문이 바뀌면 바뀌기 전 본문을 발행본 기록에 남긴다
    const [current] = await tx
      .select({
        title: chapters.title,
        contentHtml: chapters.contentHtml,
        authorNote: chapters.authorNote,
        charCount: chapters.charCount,
        live: isVisibleChapter,
      })
      .from(chapters)
      .where(eq(chapters.id, id))
      .for('update');
    if (!current) return null;
    const changed =
      current.contentHtml !== stored || current.title !== title || (authorNote !== undefined && current.authorNote !== authorNote);
    if (current.live && changed) await keepRevision(tx, id, current);
    const [row] = await tx
      .update(chapters)
      .set({
        title,
        contentHtml: stored,
        charCount,
        ...(position === undefined ? {} : { position }),
        ...(authorNote === undefined ? {} : { authorNote }),
      })
      .where(eq(chapters.id, id))
      .returning({ updatedAt: chapters.updatedAt });
    return row ?? null;
  });
  if (!saved) return { ok: false, message: '회차를 찾을 수 없어요. 삭제됐을 수 있어요' };
  return { ok: true, savedAt: saved.updatedAt.toISOString() };
}

const REVISIONS_KEPT = 10;

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type RevisionContent = { title: string; contentHtml: string; authorNote: string; charCount: number };

/** 발행본 기록에 한 개 남기고, 회차마다 최근 10개만 둔다 */
async function keepRevision(tx: Tx, chapterId: number, content: RevisionContent) {
  await tx.insert(chapterRevisions).values({ chapterId, ...content });
  await tx.execute(sql`
    delete from ${chapterRevisions}
    where ${chapterRevisions.chapterId} = ${chapterId}
      and ${chapterRevisions.id} not in (
        select r.id from ${chapterRevisions} r where r.chapter_id = ${chapterId}
        order by r.created_at desc, r.id desc limit ${REVISIONS_KEPT}
      )
  `);
}

export type RestoreRevisionResult =
  | {
      ok: true;
      chapter: { title: string; contentHtml: string; authorNote: string; updatedAt: string };
      revisions: RevisionItem[];
    }
  | { ok: false; message: string };

/**
 * 이전 발행본으로 되돌리기. 지금 본문도 기록에 남겨서 되돌린 것을 다시 되돌릴 수 있다.
 * 길드원에게 보이는 회차면 되돌린 본문이 바로 보인다
 */
export async function restoreRevision(chapterId: number, revisionId: number): Promise<RestoreRevisionResult> {
  await requireAdmin();
  if (!idSchema.safeParse(chapterId).success || !idSchema.safeParse(revisionId).success) {
    return { ok: false, message: '잘못된 요청이에요' };
  }
  const restored = await db.transaction(async (tx) => {
    const [revision] = await tx
      .select()
      .from(chapterRevisions)
      .where(and(eq(chapterRevisions.id, revisionId), eq(chapterRevisions.chapterId, chapterId)));
    if (!revision) return null;
    const [current] = await tx
      .select({ title: chapters.title, contentHtml: chapters.contentHtml, authorNote: chapters.authorNote, charCount: chapters.charCount })
      .from(chapters)
      .where(eq(chapters.id, chapterId))
      .for('update');
    if (!current) return null;
    await keepRevision(tx, chapterId, current);
    const [row] = await tx
      .update(chapters)
      .set({
        title: revision.title,
        contentHtml: revision.contentHtml,
        authorNote: revision.authorNote,
        charCount: revision.charCount,
      })
      .where(eq(chapters.id, chapterId))
      .returning({ title: chapters.title, contentHtml: chapters.contentHtml, authorNote: chapters.authorNote, updatedAt: chapters.updatedAt });
    return row ?? null;
  });
  if (!restored) return { ok: false, message: '되돌릴 기록을 찾을 수 없어요' };
  return {
    ok: true,
    chapter: { ...restored, updatedAt: restored.updatedAt.toISOString() },
    revisions: await adminListRevisions(chapterId),
  };
}

/**
 * 관리자 회차 목록에서 한 칸 위/아래로 옮기기. 바로 옆 회차와 'N화' 번호를 맞바꾼다 (URL은 id라 링크는 그대로).
 * 순서만 바꾸는 일이라 회차의 '수정 시각'은 건드리지 않는다.
 */
export async function moveChapter(chapterId: number, direction: 'up' | 'down'): Promise<{ position: number } | null> {
  await requireAdmin();
  if (!idSchema.safeParse(chapterId).success || (direction !== 'up' && direction !== 'down')) return null;

  const moved = await db.transaction(async (tx) => {
    const [target] = await tx.select({ novelId: chapters.novelId }).from(chapters).where(eq(chapters.id, chapterId));
    if (!target) return null;
    const list = await tx
      .select({ id: chapters.id, position: chapters.position })
      .from(chapters)
      .where(eq(chapters.novelId, target.novelId))
      .orderBy(asc(chapters.position), asc(chapters.id))
      .for('update');
    const plan = planChapterMove(list, chapterId, direction);
    if (!plan) return null;
    for (const { id, position } of plan.updates) {
      await tx
        .update(chapters)
        .set({ position, updatedAt: sql`${chapters.updatedAt}` }) // 수정 시각은 그대로
        .where(eq(chapters.id, id));
    }
    return { position: plan.position };
  });
  if (moved) refresh();
  return moved;
}

export type ChapterStatusResult =
  | { ok: true; status: 'draft' | 'published'; publishedAt: string | null; scheduled: boolean }
  | { ok: false; message: string };

/** 지금 발행(published) 또는 임시저장으로 되돌리기(draft). 예약된 회차를 '지금 발행'하면 예약 시각 대신 지금 공개 */
export async function setChapterStatus(
  chapterId: number,
  status: 'draft' | 'published',
): Promise<ChapterStatusResult> {
  await requireAdmin();
  if (!idSchema.safeParse(chapterId).success || (status !== 'draft' && status !== 'published')) {
    return { ok: false, message: '잘못된 요청이에요' };
  }

  let publishedAt: Date | null = null;
  if (status === 'published') {
    const updated = await db.transaction(async (tx) => {
      const [chapter] = await tx
        .update(chapters)
        .set({
          status: 'published',
          // 처음 발행이거나 예약 시각이 아직 안 왔으면 지금으로, 예전에 발행했던 회차면 원래 발행일 유지
          publishedAt: sql`case when ${chapters.publishedAt} is null or ${chapters.publishedAt} > now() then now() else ${chapters.publishedAt} end`,
        })
        .where(eq(chapters.id, chapterId))
        .returning({ novelId: chapters.novelId, publishedAt: chapters.publishedAt });
      if (!chapter) return null;
      await tx.update(novels).set({ lastPublishedAt: sql`now()` }).where(eq(novels.id, chapter.novelId));
      return chapter;
    });
    if (!updated) return { ok: false, message: '회차를 찾을 수 없어요' };
    publishedAt = updated.publishedAt;
  } else {
    const [updated] = await db
      .update(chapters)
      .set({ status: 'draft' })
      .where(eq(chapters.id, chapterId))
      .returning({ publishedAt: chapters.publishedAt });
    if (!updated) return { ok: false, message: '회차를 찾을 수 없어요' };
    publishedAt = updated.publishedAt;
  }

  refresh();
  return { ok: true, status, publishedAt: publishedAt?.toISOString() ?? null, scheduled: false };
}

const SCHEDULE_MIN_LEAD_MS = 60 * 1000; // 최소 1분 뒤
const SCHEDULE_MAX_LEAD_MS = 366 * 24 * 60 * 60 * 1000; // 최대 1년 뒤

/** 예약 발행: 정한 시각이 되면 길드원에게 보인다 (그 전까지는 관리자만 봄). 다시 부르면 예약 시각 변경 */
export async function scheduleChapter(chapterId: number, publishAt: string): Promise<ChapterStatusResult> {
  await requireAdmin();
  if (!idSchema.safeParse(chapterId).success || typeof publishAt !== 'string') {
    return { ok: false, message: '잘못된 요청이에요' };
  }
  const when = new Date(publishAt);
  if (Number.isNaN(when.getTime())) return { ok: false, message: '예약 시각을 다시 골라 주세요' };
  const lead = when.getTime() - Date.now();
  if (lead < SCHEDULE_MIN_LEAD_MS) return { ok: false, message: '예약 시각은 지금보다 1분 이상 뒤로 정해 주세요' };
  if (lead > SCHEDULE_MAX_LEAD_MS) return { ok: false, message: '예약은 1년 안으로만 할 수 있어요' };

  const [updated] = await db
    .update(chapters)
    .set({ status: 'published', publishedAt: when })
    .where(eq(chapters.id, chapterId))
    .returning({ publishedAt: chapters.publishedAt });
  if (!updated) return { ok: false, message: '회차를 찾을 수 없어요' };

  refresh();
  return { ok: true, status: 'published', publishedAt: updated.publishedAt?.toISOString() ?? null, scheduled: true };
}

/**
 * 회차 복제: 제목·본문(템플릿 포함)·작가의 말을 그대로 새 임시저장 회차로 만들어 목록 맨 뒤에 둔다.
 * 좋아요·열람 기록·발행본 기록은 복사하지 않는다. 만든 뒤 새 회차 에디터로 이동
 */
export async function duplicateChapter(novelId: number, chapterId: number): Promise<void> {
  await requireAdmin();
  if (!idSchema.safeParse(novelId).success || !idSchema.safeParse(chapterId).success) return;
  const source = await db.query.chapters.findFirst({ where: and(eq(chapters.id, chapterId), eq(chapters.novelId, novelId)) });
  if (!source) redirect(`/admin/novels/${novelId}`);

  const [{ nextPosition }] = await db
    .select({ nextPosition: sql<number>`coalesce(max(${chapters.position}), 0)::int + 1` })
    .from(chapters)
    .where(eq(chapters.novelId, novelId));
  const [created] = await db
    .insert(chapters)
    .values({
      novelId,
      position: Math.min(nextPosition, MAX_POSITION),
      title: copyTitle(source.title, source.position),
      contentHtml: source.contentHtml,
      authorNote: source.authorNote,
      charCount: source.charCount,
    })
    .returning({ id: chapters.id });
  redirect(`/admin/novels/${novelId}/chapters/${created.id}`);
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

import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

export const serialStatus = pgEnum('serial_status', ['ongoing', 'completed', 'hiatus']); // 연재중 / 완결 / 휴재
export const chapterStatus = pgEnum('chapter_status', ['draft', 'published']);

// 단일 행 (id = 1). 행이 없으면 '미설정'으로 취급하고 저장할 때 upsert
export const settings = pgTable('settings', {
  id: integer('id').primaryKey().default(1),
  guildPasswordHash: text('guild_password_hash'), // null이면 아직 입장 불가
  guildPasswordVersion: integer('guild_password_version').notNull().default(1), // 바꿀 때마다 +1 → 기존 길드원 쿠키 무효
  updatedAt: updatedAt(),
});

export const readers = pgTable('readers', {
  id: uuid('id').primaryKey().defaultRandom(),
  nickname: varchar('nickname', { length: 12 }).notNull(), // 표시용
  nicknameKey: varchar('nickname_key', { length: 12 }).notNull().unique(), // 공백 정리 + 소문자. 같은 이름 = 같은 길드원
  createdAt: createdAt(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
});

export const novels = pgTable('novels', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 100 }).notNull(),
  description: text('description').notNull().default(''),
  serialStatus: serialStatus('serial_status').notNull().default('ongoing'),
  isPublished: boolean('is_published').notNull().default(false), // 작품 자체 공개 여부
  lastPublishedAt: timestamp('last_published_at', { withTimezone: true }), // 최근 회차 발행 시각 (목록 정렬용)
  coverColor: varchar('cover_color', { length: 20 }), // 표지 색 이름 (lib/cover.ts). 비어 있으면 작품 번호로 자동
  scheduleNote: varchar('schedule_note', { length: 60 }).notNull().default(''), // '매주 금요일 저녁 8시' 같은 연재 일정. 비면 안 보임
  characters: text('characters').notNull().default(''), // 등장인물 소개. 한 줄에 한 명 '이름: 소개' (lib/characters.ts). 비면 안 보임
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const chapters = pgTable(
  'chapters',
  {
    id: serial('id').primaryKey(),
    novelId: integer('novel_id')
      .notNull()
      .references(() => novels.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(), // 'N화' 표시·정렬용. URL은 id라 번호를 바꿔도 링크가 유지됨
    title: varchar('title', { length: 100 }).notNull().default(''),
    contentHtml: text('content_html').notNull().default(''), // 저장할 때 sanitize
    authorNote: text('author_note').notNull().default(''), // 회차 끝 '작가의 말' (서식 없는 글). 비면 안 보임
    charCount: integer('char_count').notNull().default(0), // 공백 포함 글자수
    status: chapterStatus('status').notNull().default('draft'),
    publishedAt: timestamp('published_at', { withTimezone: true }), // 최초 발행 시각
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('chapters_novel_position_idx').on(t.novelId, t.position)],
);

/**
 * 발행본 기록: 길드원에게 보이는 회차를 '수정 반영'(또는 되돌리기)하기 직전의 본문을 보관한다.
 * 회차마다 최근 10개만 남긴다. 임시저장·예약 회차의 자동저장은 기록하지 않는다
 */
export const chapterRevisions = pgTable(
  'chapter_revisions',
  {
    id: serial('id').primaryKey(),
    chapterId: integer('chapter_id')
      .notNull()
      .references(() => chapters.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 100 }).notNull().default(''),
    contentHtml: text('content_html').notNull().default(''),
    authorNote: text('author_note').notNull().default(''),
    charCount: integer('char_count').notNull().default(0),
    createdAt: createdAt(), // 이 본문이 바뀐(밀려난) 시각
  },
  (t) => [index('chapter_revisions_chapter_idx').on(t.chapterId, t.createdAt)],
);

/**
 * 작가만 보는 회차 메모 (플롯·복선·다음 화 계획). 0006 마이그레이션.
 * 길드원 화면의 조회는 이 표를 쓰지 않는다 — 새어 나갈 길을 처음부터 두지 않으려고 회차 표와 따로 둔다. 메모가 비면 줄을 지운다
 */
export const chapterNotes = pgTable('chapter_notes', {
  chapterId: integer('chapter_id')
    .primaryKey()
    .references(() => chapters.id, { onDelete: 'cascade' }),
  body: text('body').notNull().default(''),
  updatedAt: updatedAt(),
});

export const chapterLikes = pgTable(
  'chapter_likes',
  {
    chapterId: integer('chapter_id')
      .notNull()
      .references(() => chapters.id, { onDelete: 'cascade' }),
    readerId: uuid('reader_id')
      .notNull()
      .references(() => readers.id, { onDelete: 'cascade' }),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.chapterId, t.readerId] }), // 1인 1좋아요
    index('chapter_likes_reader_idx').on(t.readerId),
  ],
);

export const chapterViews = pgTable(
  'chapter_views',
  {
    chapterId: integer('chapter_id')
      .notNull()
      .references(() => chapters.id, { onDelete: 'cascade' }),
    readerId: uuid('reader_id')
      .notNull()
      .references(() => readers.id, { onDelete: 'cascade' }),
    viewCount: integer('view_count').notNull().default(1), // 이 길드원이 연 횟수 (30분 안 재방문은 제외)
    firstViewedAt: timestamp('first_viewed_at', { withTimezone: true }).notNull().defaultNow(),
    lastViewedAt: timestamp('last_viewed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.chapterId, t.readerId] }),
    index('chapter_views_reader_idx').on(t.readerId, t.lastViewedAt),
  ],
);

// 로그인·입장 실패 기록 (rate limit용). 원본 IP는 저장하지 않음
export const loginAttempts = pgTable(
  'login_attempts',
  {
    id: serial('id').primaryKey(),
    scope: varchar('scope', { length: 10 }).notNull(), // 'admin' | 'guild'
    ipHash: varchar('ip_hash', { length: 64 }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index('login_attempts_lookup_idx').on(t.scope, t.ipHash, t.createdAt)],
);

export type SerialStatus = (typeof serialStatus.enumValues)[number];
export type ChapterStatus = (typeof chapterStatus.enumValues)[number];
export type Novel = typeof novels.$inferSelect;
export type Chapter = typeof chapters.$inferSelect;

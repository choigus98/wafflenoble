# 와플노블 — 구현 계획서

> 참고 문서: 없음 (대화에서 정한 기획 내용 기반)
> 레포: `choigus98/wafflenoble` — 빈 레포에서 시작. 아래 파일은 전부 신규 생성
> 진행 상황 (2026-11-12): 0~7단계 로컬 구현·브라우저 확인 완료, 1-10 이야기 속 화면 템플릿 추가. 남은 것은 1-9 배포(Vercel·Neon 연결)

## 기획 요약

- 작가 1명이 쓴 소설을 길드원에게 가볍게 공유하는 플랫폼
- 회원가입 없음
  - **관리자**: 관리자 비밀번호로 로그인 → 작품·회차 작성 / 수정 / 발행
  - **길드원**: 길드 공용 열람 비밀번호 + 이름 입력 → 열람, 좋아요
- 반응: 회차별 좋아요(누른 사람 이름 표시), 조회수(읽은 인원 수만 공개, 누가 읽었는지는 관리자만)
- 표지 이미지 없음 — 제목으로 만든 텍스트 표지만 사용
- 링크 미리보기: 디스코드·카톡 등 어디에 올려도 "와플노블"만 표시
- 도메인: Vercel 기본 주소 (`*.vercel.app`)

---

## 브랜치

| 레포 | 브랜치 |
|------|--------|
| wafflenoble | `main` (1인 작업, 브랜치 없이 직접 커밋) |

> main push = Vercel 프로덕션 배포. 작업 순서 단계별로 커밋을 끊는다.

---

## 변경 요약

| 레포 | 변경 범위 |
|------|----------|
| `wafflenoble` | Next.js 16 앱 신규 구축 — 관리자 인증, 길드 입장 게이트, 작품/회차 관리, 에디터, 열람 화면, 좋아요·조회수, Vercel + Neon 배포 |

---

## 1. wafflenoble — Next.js 16 (App Router) · Tailwind 4 · Drizzle · Neon Postgres · Vercel

### 1-1. 프로젝트 셋업

**파일**: `package.json`, `next.config.ts`, `postcss.config.mjs`, `compose.yaml`, `drizzle.config.ts`, `.env.example`, `src/app/layout.tsx`, `src/app/globals.css`, `src/app/robots.ts`, `src/app/icon.svg`

- `pnpm create next-app@latest . --ts --tailwind --eslint --app --src-dir --use-pnpm`
- 추가 패키지

| 용도 | 패키지 |
|------|--------|
| DB | `drizzle-orm`, `pg`, `@vercel/functions`(유휴 커넥션 정리), `drizzle-kit`(dev) |
| 세션 | `jose` (JWT 서명/검증) |
| 에디터 | `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/extensions`(placeholder) |
| 본문 정제 | `sanitize-html` |
| 입력 검증 | `zod` |
| 글꼴 | `pretendard` (한글 다이내믹 서브셋 CSS) |
| 스타일 | `tailwindcss` + `@tailwindcss/postcss` |

- Tailwind는 PostCSS 플러그인으로 연결. create-next-app 16.4 기본값인 `@tailwindcss/turbopack` 로더는 개발 서버에서 CSS 수정이 반영되지 않는 경우가 있어서 교체함 (되돌리기 수정이 캐시 때문에 안 보임)
- 스크립트: `db:up` (로컬 Docker Postgres), `db:generate`, `db:migrate`, `typecheck`
- 로컬 DB: `compose.yaml`의 Postgres 17 (포트 54329). 배포 DB(Neon)와 같은 `pg` 드라이버로 붙는다
- `drizzle.config.ts`: drizzle-kit은 `.env.local`을 자동으로 안 읽음 → 파일이 있을 때만 `process.loadEnvFile('.env.local')` (Vercel 빌드에는 파일이 없으므로 존재 여부 체크 필수). 마이그레이션 연결은 unpooled URL 사용
- `.env.example`

```bash
DATABASE_URL=     # Neon. Vercel 통합 연결 시 자동 주입, 로컬은 `vercel env pull .env.local`
ADMIN_PASSWORD=   # 관리자 비밀번호. 바꾸면 기존 관리자 세션 전부 만료
SESSION_SECRET=   # `openssl rand -base64 32`
```

- 길드 열람 비밀번호는 env가 아니라 DB(`settings`)에 저장 → 길드원이 빠지는 등 비번을 바꿔야 할 때 재배포 없이 관리자 화면에서 변경
- `layout.tsx`
  - `metadata`: `title: { default: '와플노블', template: '%s · 와플노블' }`, `openGraph: { title: '와플노블', siteName: '와플노블' }`, `robots: { index: false, follow: false }`
  - description과 OG 이미지는 넣지 않음 → 링크 미리보기엔 항상 "와플노블"만 뜸 (1-3 proxy 참고)
  - 폰트: Pretendard는 npm 패키지의 다이내믹 서브셋 CSS(화면에 쓰인 글자 묶음만 내려받음), 명조 옵션용 Noto Serif KR은 `next/font/google`
  - `<html suppressHydrationWarning>` + 리더 설정 초기화 인라인 스크립트 (1-6 참고)
- `robots.ts`: 전체 disallow
- Next 16 주의: page의 `params`·`searchParams`, `cookies()` 전부 async → `await` 필요
- **Cache Components 켜짐** (16.4 기본값이고 다음 메이저부터는 항상 켜짐): 세션·DB·`params`·`usePathname()`을 읽는 부분은 반드시 `<Suspense>` 안에 둔다. 레이아웃 최상단에서 세션을 읽지 않는다 → 정적 뼈대를 먼저 보내고 동적 부분은 스트리밍

### 1-2. DB 스키마

**파일**: `src/lib/db/schema.ts`, `src/lib/db/index.ts`, `drizzle/` (마이그레이션 산출물)

- `index.ts`: `drizzle-orm/node-postgres` + `pg` Pool. 로컬 Docker와 Neon에 같은 코드로 붙고 `db.transaction()`도 쓸 수 있다. Vercel에서는 `attachDatabasePool`로 유휴 커넥션을 정리

```ts
export const serialStatus = pgEnum('serial_status', ['ongoing', 'completed', 'hiatus']); // 연재중 / 완결 / 휴재
export const chapterStatus = pgEnum('chapter_status', ['draft', 'published']);

// 단일 행 (id = 1). 행이 없으면 '미설정'으로 취급, 저장 시 upsert
export const settings = pgTable('settings', {
  id: integer('id').primaryKey().default(1),
  guildPasswordHash: text('guild_password_hash'),                               // null = 미설정 → 입장 불가 안내
  guildPasswordVersion: integer('guild_password_version').notNull().default(1), // 비번 변경 시 +1 → 기존 길드원 쿠키 무효
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const readers = pgTable('readers', {
  id: uuid('id').primaryKey().defaultRandom(),
  nickname: varchar('nickname', { length: 12 }).notNull(),                 // 표시용
  nicknameKey: varchar('nickname_key', { length: 12 }).notNull().unique(), // trim + 연속 공백 정리 + 소문자
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
});

export const novels = pgTable('novels', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 100 }).notNull(),
  description: text('description').notNull().default(''),
  serialStatus: serialStatus('serial_status').notNull().default('ongoing'),
  isPublished: boolean('is_published').notNull().default(false),             // 작품 자체 공개 여부
  lastPublishedAt: timestamp('last_published_at', { withTimezone: true }),   // 최근 회차 발행 시각 (목록 정렬용)
  coverColor: varchar('cover_color', { length: 20 }),                        // 표지 색 이름 (lib/cover.ts). 비면 작품 번호로 자동 — 0001 마이그레이션
  scheduleNote: varchar('schedule_note', { length: 60 }).notNull().default(''), // 연재 일정 문구 — 0003 마이그레이션
  characters: text('characters').notNull().default(''),                      // 등장인물 소개 '이름: 소개' 한 줄씩 — 0005 마이그레이션
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// 발행본 기록 (0004 마이그레이션): 길드원에게 보이는 회차를 수정 반영·되돌리기하기 직전 본문, 회차마다 최근 10개
// chapter_revisions(id, chapter_id → chapters 삭제 시 함께 삭제, title, content_html, author_note, char_count, created_at)

export const chapters = pgTable('chapters', {
  id: serial('id').primaryKey(),
  novelId: integer('novel_id').notNull().references(() => novels.id, { onDelete: 'cascade' }),
  position: integer('position').notNull(),                  // 'N화' 표시·정렬용. URL은 id라 번호 바꿔도 링크 유지
  title: varchar('title', { length: 100 }).notNull().default(''),
  contentHtml: text('content_html').notNull().default(''),
  authorNote: text('author_note').notNull().default(''),        // 회차 끝 '작가의 말' (서식 없는 글) — 0002 마이그레이션  // sanitize 후 저장
  charCount: integer('char_count').notNull().default(0),    // 공백 포함 글자수
  status: chapterStatus('status').notNull().default('draft'),
  publishedAt: timestamp('published_at', { withTimezone: true }), // 최초 발행 시각
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('chapters_novel_position_idx').on(t.novelId, t.position)]);

export const chapterLikes = pgTable('chapter_likes', {
  chapterId: integer('chapter_id').notNull().references(() => chapters.id, { onDelete: 'cascade' }),
  readerId: uuid('reader_id').notNull().references(() => readers.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.chapterId, t.readerId] })]); // 1인 1좋아요

export const chapterViews = pgTable('chapter_views', {
  chapterId: integer('chapter_id').notNull().references(() => chapters.id, { onDelete: 'cascade' }),
  readerId: uuid('reader_id').notNull().references(() => readers.id, { onDelete: 'cascade' }),
  viewCount: integer('view_count').notNull().default(1),     // 이 길드원이 연 횟수
  firstViewedAt: timestamp('first_viewed_at', { withTimezone: true }).notNull().defaultNow(),
  lastViewedAt: timestamp('last_viewed_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.chapterId, t.readerId] })]);

// 로그인/입장 실패 기록 (rate limit용)
export const loginAttempts = pgTable('login_attempts', {
  id: serial('id').primaryKey(),
  scope: varchar('scope', { length: 10 }).notNull(),     // 'admin' | 'guild'
  ipHash: varchar('ip_hash', { length: 64 }).notNull(),  // sha256(ip + SESSION_SECRET). 원본 IP는 저장 안 함
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('login_attempts_lookup_idx').on(t.scope, t.ipHash, t.createdAt)]);
```

- 좋아요 수·읽은 인원은 카운터 컬럼 없이 `count(*)`로 계산 (길드 규모면 충분하고, 카운터 동기화 버그가 생길 여지가 없음)

### 1-3. 인증 — 관리자 & 길드 입장

**파일**: `src/lib/auth/session.ts`, `src/lib/auth/password.ts`, `src/lib/auth/rate-limit.ts`, `src/lib/auth/guards.ts`, `src/proxy.ts`

쿠키 2종 — 모두 `httpOnly`, `secure`(프로덕션), `sameSite: 'lax'`, `path: '/'`, `jose` HS256 서명

| 쿠키 | payload | 만료 | 무효화 조건 |
|------|---------|------|------------|
| `wn_admin` | `{ role: 'admin', pv }` — `pv` = HMAC(SESSION_SECRET, ADMIN_PASSWORD) 앞 16자 | 30일 | env `ADMIN_PASSWORD` 변경 |
| `wn_reader` | `{ rid, name, gv }` — `gv` = `settings.guildPasswordVersion` | 180일 | 길드 비번 변경(버전 +1), 관리자가 해당 길드원 삭제 |

- `password.ts`
  - 관리자: `timingSafeEqual(sha256(input), sha256(ADMIN_PASSWORD))`
  - 길드: `node:crypto` scrypt + 랜덤 salt로 해시(`salt:hash`) 저장·검증 — 추가 의존성 없음
- `rate-limit.ts`: scope + ipHash 기준 최근 15분 실패 5회 이상이면 차단 ("잠시 후 다시 시도해 주세요"). 성공하면 해당 기록 삭제, 1일 지난 기록은 시도할 때 같이 정리. IP는 `x-forwarded-for` 첫 값
- `guards.ts` — 데이터 접근 직전에 항상 호출 (proxy만 믿지 않음)
  - `getViewer()` → `{ kind: 'admin' } | { kind: 'reader', reader } | null`
  - `requireAdmin()`: `wn_admin` 서명 + `pv` 일치 확인. 실패 시 `/admin/login` redirect
  - `requireReader()`: 관리자면 통과. 아니면 `wn_reader` 서명 + `gv` == 현재 버전 + reader 행 존재 확인. 실패 시 `/enter?next=` redirect
- `proxy.ts` (Next 16에서 `middleware.ts` → `proxy.ts`로 이름 변경): 쿠키 **서명만** 보는 1차 검사, DB 조회 없음
  - `/admin/*` (`/admin/login` 제외): `wn_admin` 없거나 서명 불일치 → `/admin/login`
  - 그 외 페이지 (`/enter`, `/_next/*`, `/favicon.ico`, `/icon*`, `robots.txt` 제외): `wn_admin`·`wn_reader` 둘 다 없음 → `/enter?next={원래 경로}`
  - 실제 권한 판단은 `guards.ts`에서 다시 함 (proxy 우회 취약점 대비)
- **링크 미리보기**: 디스코드·카톡 미리보기 봇은 쿠키가 없어서 어떤 링크든 `/enter`로 리다이렉트되고, `/enter`의 기본 메타("와플노블")만 읽음. 봇 예외 처리는 하지 않음 → 작품 제목·소개·본문이 미리보기로 새지 않음
  - `/enter` 페이지와 에러 페이지는 `metadata`를 따로 지정하지 않음 (루트 기본값 유지)

**관리자 로그인** — `src/app/admin/login/page.tsx`, `src/app/admin/login/actions.ts`

- `loginAdmin(formData)`: rate limit → 비번 검증 → `wn_admin` 발급 → `/admin`
- `logoutAdmin()`: 쿠키 삭제 → `/admin/login`

**길드 입장** — `src/app/enter/page.tsx`, `src/app/enter/actions.ts`

- 입력: 열람 비밀번호 + 이름 (2–12자, 앞뒤 공백 제거)
- `enterGuild(formData)`
  1. rate limit (`scope: 'guild'`)
  2. `settings.guildPasswordHash`가 null → "아직 열람이 열리지 않았어요" 안내
  3. 비번 불일치 → 실패 기록 + 에러
  4. `nicknameKey`로 readers 조회 → 있으면 그 길드원으로 입장, 없으면 새로 생성
  5. `wn_reader` 발급 → `next`로 이동 (`/`로 시작하는 내부 경로만 허용 — 오픈 리다이렉트 방지)
- **같은 이름 = 같은 길드원**: 다른 기기에서 같은 이름을 넣으면 좋아요·읽음 기록이 이어짐. 이미 있는 이름이면 "이미 있는 이름이에요. 본인이면 그대로 입장하세요" 확인을 한 번 거침
- 비번 변경으로 다시 입장할 때는 기존 쿠키의 `name`(서명은 유효하고 버전만 다름)으로 이름 칸을 미리 채움

### 1-4. 관리자 — 작품·회차 관리

**파일**: `src/app/admin/(panel)/layout.tsx`, `src/app/admin/(panel)/page.tsx`, `src/app/admin/(panel)/novels/new/page.tsx`, `src/app/admin/(panel)/novels/[novelId]/page.tsx`, `src/app/admin/actions.ts`, `src/components/admin/admin-nav.tsx`, `src/components/admin/novel-form.tsx`, `src/components/admin/delete-novel-form.tsx`, `src/lib/queries/admin.ts`

- `(panel)` 라우트 그룹으로 묶어서 `/admin/login`만 레이아웃 밖에 둠. 레이아웃: 상단 내비 (작품 / 길드원 / 설정 / 열람 화면 보기 / 로그아웃)
  - 레이아웃은 클라이언트 이동 때 다시 렌더되지 않을 수 있어서, 각 page와 Server Action에서 `requireAdmin()`을 따로 호출
- `/admin`: 작품 표 — 제목, 공개 여부, 연재 상태, 회차 수(발행/전체), 최근 수정일 + "새 작품"
- `/admin/novels/new` → `createNovel` → 생성 후 작품 편집 화면으로 이동
- `/admin/novels/[novelId]`
  - `NovelForm`: 제목, 표지 색(자동 + 10가지, 미리보기), 소개, 연재 상태, 공개 여부 → `updateNovel`
  - `ChapterTable`: N화, 제목, 상태, 글자수, 발행일, 읽은 인원, ♥ 수, [편집]
    - 위/아래 버튼(`chapter-move-buttons.tsx` → `moveChapter`): 바로 옆 회차와 'N화' 번호를 맞바꾼다. 번호가 겹친 곳만 앞 번호 + 1로 밀어 순서를 만든다 (`lib/chapter-order.ts`). 회차 수정 시각은 그대로
    - 에디터는 번호를 직접 고쳤을 때만 번호를 저장한다 (다른 탭에서 순서를 바꾼 뒤 열려 있던 에디터가 옛 번호로 되돌리지 않게)
  - "새 회차" → `createChapter(novelId)`: `position = max(position) + 1`, draft로 생성 → 에디터로 이동
  - 작품 삭제: 제목을 직접 입력해야 버튼 활성화 (cascade로 회차·반응까지 전부 삭제)
- `actions.ts`의 모든 action: 첫 줄 `requireAdmin()` → zod 검증 → 쿼리 → `revalidatePath`

### 1-5. 관리자 — 회차 에디터

**파일**: `src/app/admin/(panel)/novels/[novelId]/chapters/[chapterId]/page.tsx`, `src/components/admin/chapter-editor.tsx` (툴바 포함), `src/components/admin/chapter-editor-loader.tsx` (브라우저 전용 로딩), `src/lib/content.ts` (정제·글자수)

- Tiptap `useEditor({ immediatelyRender: false, ... })` — SSR 하이드레이션 불일치 방지 (Next에서 필수)
- 툴바: 굵게 · 기울임 · 취소선 · 장면 전환(구분선) · 인용 / placeholder "여기에 본문을 써 주세요"
- 상단: 제목, 회차 번호(position), 글자수(공백 포함 / 제외), 저장 상태 ("저장됨 14:02" / "저장 중…" / "저장 안 됨")
- 저장 방식 — **발행된 회차는 고치는 도중 내용이 독자에게 보이면 안 되므로** 상태별로 다르게 처리

| 회차 상태 | 자동저장 위치 | 서버 반영 |
|----------|-------------|----------|
| draft | 입력 멈추고 2초 뒤 → `saveChapter` | 자동 |
| published | localStorage `wn:edit:{chapterId}` | "수정 반영" 버튼 |

- 진입 시 localStorage 사본이 서버본보다 최신이면 "저장 안 된 수정본이 있어요 — 복구 / 버리기" 배너
- 저장 안 된 변경이 있으면 `beforeunload` 경고
- `saveChapter({ id, title, position, contentHtml })`: `sanitize.ts`로 정제 (허용 태그 `p, br, strong, em, s, hr, blockquote`) → `text.ts`로 글자수 계산 → 저장
- `setChapterStatus(id, 'published')`: `status = 'published'`, `publishedAt`이 null일 때만 now(), `novels.lastPublishedAt = now()` → `db.transaction`으로 묶음
- `setChapterStatus(id, 'draft')`: draft로 되돌림 (publishedAt은 유지)
- `deleteChapter(id)`: 확인 모달 후 삭제
- "미리보기": 열람 화면을 새 탭으로 엶 (관리자는 draft도 열람 가능)
- 사이드 패널: 이 회차 반응 — 읽은 사람 이름과 횟수, 좋아요 누른 사람 이름

- 찾기·바꾸기 (`find-replace.tsx`, `lib/find.ts`): 툴바 돋보기·Cmd+F, 본문 문단만 찾고(템플릿 제외) 모두 바꾸기는 되돌리기 한 번으로 복구

### 1-6. 열람 화면 (길드원)

**파일**: `src/app/(reader)/layout.tsx`, `src/app/(reader)/page.tsx`, `src/app/(reader)/novels/[novelId]/page.tsx`, `src/app/(reader)/novels/[novelId]/[chapterId]/page.tsx`, `src/components/novel-cover.tsx`, `src/components/reader/reader-settings.tsx`, `src/components/reader/nickname-menu.tsx`, `src/lib/queries/reader.ts`

- 모든 쿼리 함수 첫 줄에서 `requireReader()`. 길드원에게는 `isPublished = true` 작품의 `status = 'published'` 회차만, 관리자에게는 전부 노출 (draft엔 "미리보기" 뱃지)
- 쿠키 확인 때문에 전부 동적 렌더링 — 길드 규모라 캐시는 생략
- `layout.tsx`: 헤더 — 로고(와플노블), "{이름}님", 이름 바꾸기 / 나가기
  - `changeNickname`: 아무도 안 쓰는 이름일 때만 변경 (이미 있으면 에러), 쿠키 재발급
  - `leaveGuild`: `wn_reader` 삭제 → `/enter`
- `/` 작품 목록: `NovelCard` — 텍스트 표지(제목 + 작품 id로 고정 팔레트에서 고른 배경색, CSS만으로 그림), 연재 상태 뱃지, 회차 수, 최근 업데이트. `lastPublishedAt desc` 정렬
- `/novels/[novelId]` 작품 상세
  - 제목, 소개, 상태, "첫 화 보기" / "이어 읽기 (N화)" — 이 길드원의 `chapter_views` 중 `lastViewedAt`이 가장 최근인 회차
  - 회차 목록: N화 · 제목 · 발행일 · ♥ 수 · 읽음 ✓ (이 길드원 기준)
- `/novels/[novelId]/[chapterId]` 회차 뷰어 (chapterId가 해당 novelId 소속인지 같이 확인)
  - `ChapterContent`: 저장 때 정제한 HTML을 `dangerouslySetInnerHTML`로 렌더. 본문 폭 `max-w-[680px]`, 모바일 우선
  - 하단: `LikeButton`(♥ N · 누른 사람 이름), "N명 읽음", `ChapterNav`(이전 화 / 목록 / 다음 화 — 같은 작품 발행 회차 중 position 기준)
  - `ReaderSettings`: 글자 크기 4단계, 줄 간격 3단계, 고딕 / 명조, 라이트 / 다크 → localStorage `wn:reader-settings`
    - 깜빡임 방지: 루트 `layout.tsx`의 `<head>` 인라인 스크립트가 localStorage 값을 `<html data-*>`에 먼저 반영하고, CSS 변수로 적용
  - `ViewTracker` 포함 (1-7)

### 1-7. 좋아요·조회수

**파일**: `src/app/(reader)/actions.ts`, `src/components/reader/like-button.tsx`, `src/components/reader/view-tracker.tsx`, `src/lib/queries/reactions.ts`, `src/app/admin/(panel)/readers/page.tsx`, `src/components/admin/reader-row.tsx`

- `toggleLike(chapterId)`: `requireReader()` (관리자에겐 버튼 숨김) → 이미 눌렀으면 delete, 아니면 `insert ... on conflict do nothing` → 새 count와 이름 목록 반환. `LikeButton`은 `useOptimistic`으로 즉시 반영
- `recordView(chapterId)`: `ViewTracker`(클라이언트 컴포넌트)가 마운트될 때 호출. 렌더 중에 기록하면 Link 프리페치까지 조회로 잡혀서 이렇게 함. 관리자면 무시

```sql
insert into chapter_views (chapter_id, reader_id) values ($1, $2)
on conflict (chapter_id, reader_id) do update
  set view_count = chapter_views.view_count + 1, last_viewed_at = now()
  where chapter_views.last_viewed_at < now() - interval '30 minutes';
```

- → 30분 안에 다시 열면 횟수가 안 올라감 (새로고침 중복 방지). 같이 `readers.lastSeenAt` 갱신
- 공개 범위
  - 좋아요: 수 + 누른 사람 이름 공개
  - 조회: 길드원에게는 "N명 읽음"(고유 인원)만. **누가 읽었는지는 관리자 화면에서만** 보이고, 열람 화면 쿼리는 이름을 아예 조회하지 않음
- `/admin/readers`: 이름, 처음 입장, 마지막 접속, 읽은 회차 수, 좋아요 수 / 이름 수정 · 삭제 (삭제하면 그 길드원 반응 cascade 삭제 + 쿠키 즉시 무효)

### 1-8. 관리자 설정·백업

**파일**: `src/app/admin/(panel)/settings/page.tsx`, `src/components/admin/guild-password-form.tsx`, `src/app/admin/export/route.ts`

- 길드 열람 비밀번호 설정·변경 → `updateGuildPassword`: scrypt 해시 저장 + `guildPasswordVersion + 1` → 길드원 전원 다시 입장 (이름은 미리 채워짐)
- 백업 다운로드: `GET /admin/export` (route 안에서도 `requireAdmin()`) → 작품·회차 전체 JSON, `Content-Disposition: attachment; filename=wafflenoble-backup-{YYYYMMDD}.json`
  - Neon 무료 티어는 복구 가능한 기간이 짧아서, 원고 보호용으로 주기적으로 받아두기

### 1-9. 배포

- Vercel은 **choigus98 GitHub 계정**으로 로그인·연결 (레포 소유 계정이어야 import 목록에 레포가 보임)
- 프로젝트 이름 `wafflenoble` → 기본 주소 `wafflenoble.vercel.app`. 이미 쓰이는 이름이면 Vercel이 다른 주소를 붙이니 첫 배포 후 Domains 탭에서 확인
- Storage → Neon 연결 → `DATABASE_URL` 자동 주입. `ADMIN_PASSWORD`, `SESSION_SECRET`은 직접 등록
- 함수 리전과 Neon 리전을 가깝게 맞춤 (예: 싱가포르 `sin1` + AWS `ap-southeast-1`). 기본값(미국 동부)으로 두면 쿼리마다 왕복 지연이 큼
- Build Command를 `pnpm db:migrate && pnpm build`로 지정 → 마이그레이션이 실패하면 빌드도 실패하고 기존 배포가 유지됨
- Vercel Hobby 플랜은 비상업 개인 용도 → 길드 공유 용도면 해당

### 1-10. 이야기 속 화면 템플릿 (추가 기능)

**파일**: `src/lib/story-blocks.ts` (데이터 형식·검증·저장/읽기), `src/components/story-block-view.tsx` (카드 화면, 열람·에디터 공용), `src/components/admin/story-block/story-block-node.tsx` (Tiptap 노드), `src/components/admin/story-block/block-editor.tsx` (편집 폼), `src/components/admin/story-block/template-menu.tsx` (툴바 메뉴), `src/components/reader/chapter-body.tsx` (열람 화면)

- 종류: 카톡 1:1 대화, 카톡 단체방, 라이브 방송창, 실시간 채팅창, 후원 알림, 커뮤니티 게시글, 시스템 창(퀘스트·상태창), 뉴스 기사, 전화 화면(걸려 오는 전화·통화 중), 쪽지·메모, SNS 게시물
  - 새 종류는 스키마 끝에 덧붙이기만 한다 (이미 저장된 블록의 종류·필드는 바꾸지 않음)
- 저장 형식: 본문 HTML 안에 `<div data-wn-block="종류" data-wn-data="JSON"></div>` 한 줄
  - 저장할 때 서버가 zod 스키마로 다시 검증하고, 형식이 틀린 블록은 지운다. 모르는 필드는 버린다
  - 닉네임 색은 정해진 팔레트 키만 저장 (임의의 CSS 값이 들어갈 수 없음)
- 열람 화면: 본문을 일반 HTML 조각과 블록으로 나누고, 블록은 React 컴포넌트로 그린다. 블록 안의 글은 전부 텍스트로 출력되므로 HTML이 끼어들 수 없다
- 디자인: 사이트 테마(밝게/어둡게)를 따라간다. 색은 `globals.css`의 `--wn-*` 토큰
  - 어두운 화면은 기기 화면 느낌 그대로, 밝은 화면은 흰 카드 · 카톡은 하늘색 배경에 흰 말풍선 (내 말풍선은 둘 다 분홍)
  - 글자 크기 15px 고정 (읽기 설정의 영향을 받지 않음)
- 편집 — 쓰는 사람이 폼을 채우지 않아도 되게
  - 방송창·후원 알림·뉴스 기사: 본문 속 카드의 글자를 눌러 그 자리에서 바로 고친다 (편집 창 없음). 뉴스 본문은 빈 줄로 문단을 나눈다
  - 전화 화면: 카드 위에서 이름·문구를 고치고, 카드 위 '걸려 오는 전화 / 통화 중'으로 모드 전환 (안 고친 기본 문구는 휴대전화 ↔ 00:12로 같이 바뀜)
  - 카톡·채팅창: 카드를 누르면 '대본' 칸 + 미리보기가 나란히 열린다. 대본은 평소 대사 쓰듯
    - `이름: 대사` 한 줄에 하나 / `나: …`는 오른쪽 말풍선 / 이름 없이 쓴 줄은 앞사람이 이어서 / 줄 끝 `[오후 8:14]`는 시간 / `--- 10월 5일 ---`은 가운데 날짜·안내
    - 등장인물 칩: 이름을 한 번에 바꾸기(대본의 그 사람 줄 전부), 오른쪽 말풍선 정하기, 채팅창 닉네임 색 바꾸기
  - 커뮤니티 게시글: 카드를 누르면 게시판·글쓴이·시각·조회·추천·댓글 수 칸, 제목·본문, '댓글 대본' + 미리보기가 열린다
    - 댓글 대본: `닉네임: 댓글` / `ㄴ 닉네임: …`은 답글 (ㄴ 뒤 띄어쓰기 필요, `└`·`↳`도 됨) / `글쓴이: …`는 글쓴이 닉네임 + '글쓴이' 표시 / 이름 없이 쓴 줄은 앞 댓글에 줄바꿈 / 줄 끝 `[20:31]`·`[11.12 20:31]`·`[3분 전]`·`[방금]`은 시간 (대괄호만) / `--- 삭제된 댓글입니다 ---`는 회색 줄
    - 제목 옆 `[댓글 수]`와 '댓글 N'은 댓글 수 칸이 비면 실제 댓글 개수 (회색 줄은 세지 않음)
  - 시스템 창: 제목 칸 + 대본. `힘: 15`는 능력치 줄, `「…」`·`[…]`로 감싼 줄은 가운데 굵게, `--- 보상 ---`은 구분선, 나머지는 안내 문장
  - 입력은 0.3초 모았다가 문서에 반영하고, 그 변경이 회차 자동저장으로 이어진다. 블록 안 글자 변경은 문서 되돌리기 기록에 넣지 않는다 (각 입력칸의 되돌리기로 처리). 카드 입력칸은 벗어나는 순간 바로 반영
  - 템플릿은 한 번에 하나만 편집: 다른 템플릿을 열거나 카드를 고치기 시작하면 열려 있던 대본 창은 저장하고 닫힌다 (편집 상태는 회차 에디터마다 따로 관리)
  - 템플릿 편집 중에는 '발행하기'와 발행된 회차의 '수정 반영'(Cmd+S 포함)을 막고, 툴바에 '템플릿 편집 마치기'를 보여 준다
- 글자수: 템플릿 안의 글은 회차 글자수에 세지 않는다
- 구현하며 찾은 함정
  - 템플릿을 넣으면 그 블록이 선택된 상태가 되어, 바로 다음 템플릿을 넣으면 앞 블록을 덮어썼다 → 넣은 뒤 커서를 블록 뒤로 옮기고, 블록이 선택돼 있으면 그 뒤에 넣는다
  - ProseMirror가 노드 뷰를 같은 종류의 다른 블록에 재사용할 수 있다 → 블록마다 에디터 전용 uid를 붙여 편집 상태를 분리하고, 반영할 때 uid가 다르면 쓰지 않는다
  - 템플릿을 넣을 때 `focus()` 명령을 쓰면 Tiptap이 한 박자 늦게 본문에 포커스를 잡아서, 새 템플릿 입력칸의 포커스를 빼앗는다 → 넣을 때는 `focus()`를 쓰지 않는다

---

## 작업 순서

```
0. 레포 준비 — 완료 (SSH로 clone, 레포 로컬 git 작성자를 choigus98 + GitHub noreply 이메일로 설정)
1. 셋업 (1-1) — create-next-app + 패키지. Vercel·Neon 연결까지 먼저 해서 빈 화면이라도 배포되는지 확인
2. DB 스키마 (1-2) — 이후 모든 기능의 기반. db:generate → db:migrate
3. 인증 (1-3) — 관리자 로그인 + 길드 입장 + proxy/guards. 관리자 화면과 열람 화면 둘 다 이게 먼저 필요
4. 관리자 작품·회차 관리 (1-4) → 에디터 (1-5) → 길드 비번 설정 (1-8 일부)
   — 열람 화면을 확인하려면 발행된 회차와 길드 비번이 있어야 해서 관리자 쪽을 먼저
5. 열람 화면 (1-6) — 목록 → 상세 → 뷰어 → 리더 설정
6. 좋아요·조회수 (1-7) + 관리자 길드원 화면
7. 마무리 — 백업 다운로드 (1-8), 404·에러 화면, 모바일 실기기 점검, 디스코드·카톡 링크 미리보기 확인
```

> main 직접 커밋이라 push가 곧 프로덕션 배포. 단계 하나가 끝날 때마다 로컬(`pnpm dev`)에서 확인하고 커밋·push.
> 3단계를 push하기 전에 `ADMIN_PASSWORD`·`SESSION_SECRET`을 Vercel에 등록해 둘 것 (없으면 로그인 자체가 안 됨).

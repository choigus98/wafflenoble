# 와플노블

길드원에게 소설을 가볍게 공유하는 서재예요. 작가 한 명이 쓰고, 길드원은 공용 열람 비밀번호와 이름으로 들어와서 읽어요.

- 관리자(작가): 관리자 비밀번호로 로그인 → 작품·회차 작성, 발행, 길드원 관리
- 길드원: 열람 비밀번호 + 이름으로 입장 → 열람, 좋아요 (회원가입 없음)
- 자세한 설계는 [docs/plan.md](docs/plan.md)

## 로컬 개발

준비물: Node 22+, pnpm, Docker

```bash
pnpm install
cp .env.example .env.local   # ADMIN_PASSWORD, SESSION_SECRET 채우기
pnpm db:up                   # Docker로 Postgres 실행 (포트 54329)
pnpm db:migrate
pnpm dev
```

1. http://localhost:3000/admin/login 에서 관리자 비밀번호로 로그인
2. 설정에서 길드 열람 비밀번호 정하기
3. 작품을 만들고 회차를 써서 발행
4. 다른 브라우저(또는 로그아웃 후) http://localhost:3000 에서 길드원으로 입장

## 스크립트

| 명령 | 설명 |
| --- | --- |
| `pnpm dev` | 개발 서버 |
| `pnpm build` | 프로덕션 빌드 |
| `pnpm typecheck` | 라우트 타입 생성 + TypeScript 검사 |
| `pnpm lint` | ESLint |
| `pnpm db:up` / `pnpm db:down` | 로컬 Postgres 켜기 / 끄기 |
| `pnpm db:generate` | 스키마(`src/lib/db/schema.ts`)를 바꾼 뒤 마이그레이션 SQL 생성 |
| `pnpm db:migrate` | 마이그레이션 적용 |

## 배포 (Vercel + Neon)

1. Vercel에서 이 GitHub 레포를 import
2. Storage → Neon 연결 (`DATABASE_URL` 자동 등록)
3. 환경변수 `ADMIN_PASSWORD`, `SESSION_SECRET`(`openssl rand -base64 32`) 등록
4. Settings → Build and Deployment → Build Command를 `pnpm db:migrate && pnpm build`로 변경
5. Settings → Functions → 리전을 Neon DB 리전과 가까운 곳으로 (예: `sin1`)

main에 push하면 바로 프로덕션에 배포돼요.

import { existsSync } from 'node:fs';
import { defineConfig } from 'drizzle-kit';

// drizzle-kit은 .env.local을 자동으로 읽지 않는다. Vercel 빌드에는 파일이 없으므로 있을 때만 로드
if (existsSync('.env.local')) process.loadEnvFile('.env.local');

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  // 마이그레이션은 커넥션 풀러를 거치지 않는 직접 연결 사용 (Neon 통합이 같이 넣어주는 값)
  dbCredentials: { url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? '' },
  strict: true,
  verbose: true,
});

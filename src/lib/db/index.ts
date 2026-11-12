import 'server-only';
import { attachDatabasePool } from '@vercel/functions';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

// 개발 중 HMR로 모듈이 다시 로드돼도 커넥션 풀은 하나만 유지
const globalForDb = globalThis as unknown as { wafflePool?: Pool };

function createPool() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 10_000,
  });
  // Vercel 함수가 쉬기 전에 유휴 커넥션을 정리 (Vercel 밖에서는 아무것도 안 함)
  attachDatabasePool(pool);
  return pool;
}

const pool = globalForDb.wafflePool ?? createPool();
if (process.env.NODE_ENV !== 'production') globalForDb.wafflePool = pool;

export const db = drizzle(pool, { schema });

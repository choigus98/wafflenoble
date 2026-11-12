/** Postgres unique 제약 위반(23505)인지. drizzle이 원본 에러를 cause로 감싸는 경우까지 확인 */
export function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 3 && current && typeof current === 'object'; depth++) {
    if ((current as { code?: unknown }).code === '23505') return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

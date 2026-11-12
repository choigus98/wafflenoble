// 회차를 어디까지 읽었는지 (이 기기의 localStorage에만, 회차마다 { ratio: 0~1, at })
// 회차 화면(읽기 진행 막대·이어서 읽기)과 작품 목차('40%까지 읽음')가 같이 쓴다

export const RESUME_MIN = 0.05; // 이보다 앞이면 처음부터 읽는 것과 같다
export const RESUME_MAX = 0.95; // 이보다 뒤면 다 읽은 것으로 본다

export const positionKey = (chapterId: number) => `wn:pos:${chapterId}`;

export function readSavedRatio(chapterId: number): number | null {
  try {
    const value = JSON.parse(localStorage.getItem(positionKey(chapterId)) ?? 'null');
    return typeof value?.ratio === 'number' && Number.isFinite(value.ratio) ? Math.min(1, Math.max(0, value.ratio)) : null;
  } catch {
    return null;
  }
}

/** 읽다 만 회차인지 (조금이라도 읽었고 끝까지는 안 감) */
export function isPartlyRead(ratio: number | null): ratio is number {
  return ratio !== null && ratio >= RESUME_MIN && ratio < RESUME_MAX;
}

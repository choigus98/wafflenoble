/** 기기 설정에서 '동작 줄이기'를 켠 사람에게는 부드러운 스크롤 대신 바로 이동한다 */
export function scrollBehavior(): ScrollBehavior {
  if (typeof window === 'undefined' || !window.matchMedia) return 'auto';
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}

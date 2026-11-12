/** 기기 설정에서 '동작 줄이기'를 켠 사람에게는 부드러운 스크롤 대신 바로 이동한다 */
export function scrollBehavior(): ScrollBehavior {
  if (typeof window === 'undefined' || !window.matchMedia) return 'auto';
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}

/**
 * 화면 위에 붙어 있는 막대(에디터 도구 막대 + 그 아래 창)에 가리지 않게 element가 보이도록 스크롤한다.
 * start: 막대 바로 아래, center: 막대 아래 남은 칸의 가운데. 막대는 위에 붙은 뒤의 높이(offsetHeight)로 잰다
 */
export function scrollBelowBar(element: Element, bar: HTMLElement | null, align: 'start' | 'center') {
  const barHeight = bar?.offsetHeight ?? 0;
  const rect = element.getBoundingClientRect();
  const room = window.innerHeight - barHeight;
  const gap = align === 'start' ? 12 : Math.max(12, (room - rect.height) / 2);
  window.scrollTo({ top: Math.max(0, window.scrollY + rect.top - barHeight - gap), behavior: scrollBehavior() });
}


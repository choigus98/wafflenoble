/** 기기 설정에서 '동작 줄이기'를 켠 사람에게는 부드러운 스크롤 대신 바로 이동한다 */
export function scrollBehavior(): ScrollBehavior {
  if (typeof window === 'undefined' || !window.matchMedia) return 'auto';
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}

/**
 * 화면 위에 붙어 있는 막대(에디터 도구 막대 + 그 아래 창)에 가리지 않게 element가 보이도록 스크롤한다.
 * start: 막대 바로 아래, center: 막대 아래 남은 칸의 가운데. 막대는 위에 붙은 뒤의 높이(offsetHeight)로 잰다. 가려는 스크롤 위치를 돌려준다
 */
export function scrollBelowBar(element: Element, bar: HTMLElement | null, align: 'start' | 'center'): number {
  const barHeight = bar?.offsetHeight ?? 0;
  const rect = element.getBoundingClientRect();
  const room = window.innerHeight - barHeight;
  const gap = align === 'start' ? 12 : Math.max(12, (room - rect.height) / 2);
  const top = Math.max(0, window.scrollY + rect.top - barHeight - gap);
  window.scrollTo({ top, behavior: scrollBehavior() });
  return top;
}


/**
 * window.scrollTo(top) 뒤에 스크롤이 멈추면 done (멈춘 뒤에 칠해야 칠한 게 보인다).
 * 이미 그 자리면(움직일 게 없거나 '동작 줄이기'라 바로 옮겨졌으면) 곧바로. 부드럽게 가는 중이면 'scrollend'를 아는 브라우저는 그걸로,
 * 모르는 브라우저는 스크롤 값이 세 프레임 그대로일 때, 길어도 maxMs 뒤에는 부른다. 돌려주는 함수로 취소
 */
export function afterScroll(top: number, done: () => void, maxMs = 2000): () => void {
  const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  if (Math.abs(window.scrollY - Math.min(Math.max(0, top), max)) < 1) {
    done();
    return () => {};
  }
  let finished = false;
  let frame = 0;
  let timer = 0;
  let last = window.scrollY;
  let still = 0;
  const stop = () => {
    finished = true;
    window.clearTimeout(timer);
    window.removeEventListener('scrollend', finish);
    if (frame) window.cancelAnimationFrame(frame);
    frame = 0;
  };
  function finish() {
    if (finished) return;
    stop();
    done();
  }
  const tick = () => {
    const now = window.scrollY;
    still = now === last ? still + 1 : 0;
    last = now;
    if (still >= 3) {
      frame = 0;
      finish();
    } else frame = window.requestAnimationFrame(tick);
  };
  timer = window.setTimeout(finish, maxMs);
  window.addEventListener('scrollend', finish);
  frame = window.requestAnimationFrame(tick);
  return stop;
}

// 화면에는 안 보이고 화면 낭독기만 읽는 짧은 알림 ('템플릿을 위로 옮겼어요' 같은 것).
// 알림 칸은 처음 쓸 때 body 끝에 하나 만들어 두고 계속 쓴다 (React 밖이라 다시 그려져도 사라지지 않음)

let region: HTMLElement | null = null;

export function announce(message: string) {
  if (typeof document === 'undefined') return;
  if (!region || !region.isConnected) {
    region = document.createElement('div');
    region.setAttribute('role', 'status');
    region.setAttribute('aria-live', 'polite');
    region.className = 'sr-only';
    document.body.append(region);
  }
  const target = region;
  // 같은 말을 연달아 해도 다시 읽히도록 비웠다가 한 박자 뒤에 쓴다
  target.textContent = '';
  window.setTimeout(() => {
    target.textContent = message;
  }, 60);
}

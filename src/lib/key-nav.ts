// 회차 화면 '키보드로 넘기기'(components/reader/chapter-key-nav.tsx)의 판단: ←/→로 이전 · 다음 화.
// 화면(DOM)에서 읽은 값만 받아서 정하므로 브라우저 없이 테스트할 수 있다.

export type KeyNavEvent = {
  key: string;
  /** 누르고 있어서 거듭 오는 입력 (여러 화를 한꺼번에 건너뛰지 않게 첫 번만) */
  repeat: boolean;
  /** 한글 입력 중 */
  composing: boolean;
  /** Alt · Ctrl · ⌘ · Shift를 같이 누름 (브라우저 뒤로 가기 · 고른 글 늘리기와 겹치지 않게) */
  modified: boolean;
  /** 다른 곳에서 이미 쓴 키 (preventDefault — 목차 목록 등) */
  handled: boolean;
  /** 입력칸 · 고칠 수 있는 글에 포커스 */
  typing: boolean;
  /** 화살표를 스스로 쓰는 곳 안 (메뉴 · 목록 · 대화상자 · 슬라이더 · 탭, 옆으로 스크롤되는 칸) */
  arrowsOwned: boolean;
  /** 팝오버 · 메뉴가 열려 있음 (읽기 설정 · 목차 · 화면 모드 · 이름 메뉴) */
  popupOpen: boolean;
  /** 본문 글을 고른 채 (출처와 함께 복사하려는 중) */
  selecting: boolean;
};

/** 넘어갈 쪽 (넘기지 않으면 null) */
export function keyNavTarget(event: KeyNavEvent): 'prev' | 'next' | null {
  const direction = event.key === 'ArrowLeft' ? 'prev' : event.key === 'ArrowRight' ? 'next' : null;
  if (!direction) return null;
  const busy =
    event.repeat || event.composing || event.modified || event.handled || event.typing || event.arrowsOwned || event.popupOpen || event.selecting;
  return busy ? null : direction;
}

/** 회차 끝 줄의 작은 안내: 누를 키와 글 ('← → 키로도 이전 · 다음 화로 넘어가요'). 갈 곳이 없으면 null */
export function keyNavHint(hasPrev: boolean, hasNext: boolean): { keys: string[]; text: string } | null {
  if (hasPrev && hasNext) return { keys: ['←', '→'], text: '키로도 이전 · 다음 화로 넘어가요' };
  if (hasNext) return { keys: ['→'], text: '키로도 다음 화로 넘어가요' };
  if (hasPrev) return { keys: ['←'], text: '키로도 이전 화로 넘어가요' };
  return null;
}

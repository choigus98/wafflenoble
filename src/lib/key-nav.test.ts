import { describe, expect, it } from 'vitest';
import { keyNavHint, keyNavTarget, type KeyNavEvent } from '@/lib/key-nav';

const plain: KeyNavEvent = {
  key: 'ArrowRight',
  repeat: false,
  composing: false,
  modified: false,
  handled: false,
  typing: false,
  arrowsOwned: false,
  popupOpen: false,
  selecting: false,
};

describe('키보드로 넘기기', () => {
  it('← 이전 화, → 다음 화, 다른 키는 그대로', () => {
    expect(keyNavTarget({ ...plain, key: 'ArrowLeft' })).toBe('prev');
    expect(keyNavTarget(plain)).toBe('next');
    for (const key of ['ArrowUp', 'ArrowDown', 'Enter', ' ', 'j']) expect(keyNavTarget({ ...plain, key }), key).toBeNull();
  });

  it('누르고 있거나 · 한글 입력 중 · 보조 키 · 이미 쓴 키 · 입력칸 · 화살표를 쓰는 곳 · 열린 팝오버 · 글을 고른 채면 넘기지 않음', () => {
    const flags = ['repeat', 'composing', 'modified', 'handled', 'typing', 'arrowsOwned', 'popupOpen', 'selecting'] as const;
    for (const flag of flags) {
      expect(keyNavTarget({ ...plain, [flag]: true }), flag).toBeNull();
      expect(keyNavTarget({ ...plain, key: 'ArrowLeft', [flag]: true }), flag).toBeNull();
    }
  });

  it('회차 끝 줄 안내: 갈 수 있는 쪽만, 갈 곳이 없으면 없음', () => {
    expect(keyNavHint(true, true)).toEqual({ keys: ['←', '→'], text: '키로도 이전 · 다음 화로 넘어가요' });
    expect(keyNavHint(false, true)).toEqual({ keys: ['→'], text: '키로도 다음 화로 넘어가요' });
    expect(keyNavHint(true, false)).toEqual({ keys: ['←'], text: '키로도 이전 화로 넘어가요' });
    expect(keyNavHint(false, false)).toBeNull();
  });
});

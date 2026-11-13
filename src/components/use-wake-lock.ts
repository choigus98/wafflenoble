'use client';

import { useEffect } from 'react';

/**
 * active인 동안 휴대폰 화면이 어두워지거나 잠기지 않게 잡아 둔다 (Screen Wake Lock).
 * 지원하지 않는 브라우저이거나 거절되면(배터리 절약 모드 등) 조용히 넘어간다.
 * 탭을 숨기면 브라우저가 알아서 풀어 버리므로, 다시 보일 때 아직 active면 다시 잡는다. active가 꺼지면 바로 푼다
 */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;
    let pending = false;

    const acquire = async () => {
      if (pending || document.visibilityState !== 'visible' || (sentinel && !sentinel.released)) return;
      pending = true;
      try {
        const lock = await navigator.wakeLock.request('screen');
        if (cancelled) {
          void lock.release();
          return;
        }
        sentinel = lock;
      } catch {
        // 지원은 하지만 지금은 못 잡는 경우 (권한 · 배터리 절약 모드 등)
      } finally {
        pending = false;
      }
    };

    void acquire();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void acquire();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      if (sentinel && !sentinel.released) void sentinel.release().catch(() => {});
      sentinel = null;
    };
  }, [active]);
}

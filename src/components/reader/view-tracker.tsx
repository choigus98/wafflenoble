'use client';

import { useEffect } from 'react';
import { recordView } from '@/app/(reader)/actions';

/**
 * 회차를 실제로 열었을 때만 열람을 기록한다.
 * 서버 렌더 중에 기록하면 Link 프리페치까지 조회수로 잡히기 때문에 마운트 시점에 보낸다.
 */
export function ViewTracker({ chapterId }: { chapterId: number }) {
  useEffect(() => {
    recordView(chapterId).catch(() => {
      // 조회 기록은 실패해도 읽기에 지장이 없으므로 조용히 넘어간다
    });
  }, [chapterId]);
  return null;
}

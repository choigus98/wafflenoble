import type { CSSProperties, ReactNode } from 'react';
import { BLOCK_SIZE } from '@/lib/story-blocks';

/**
 * 템플릿 크기 (원래 크기의 %, 에디터에서 모서리를 끌어 정한 값). 열람 화면과 에디터가 같이 쓴다 (globals.css의 .wn-size).
 * 열람 화면은 원래 크기면 감싸지 않고, 에디터는 끄는 동안 100%를 지나가도 안의 입력칸이 다시 그려지지 않게 늘 감싼다(always)
 */
export function StoryBlockSize({ size, always = false, children }: { size: number; always?: boolean; children: ReactNode }) {
  if (size === BLOCK_SIZE.normal && !always) return children;
  return (
    <div
      className="wn-size"
      data-up={size > BLOCK_SIZE.normal ? '' : undefined}
      style={{ '--wn-size': String(size / 100) } as CSSProperties}
    >
      <div className="wn-size-zoom">{children}</div>
    </div>
  );
}

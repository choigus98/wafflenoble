'use client';

import { useEffect, useRef, useState } from 'react';
import { shareText } from '@/lib/share-text';

type CopyState = 'idle' | 'copied' | 'failed';

/** 텍스트 칸을 잠깐 만들어 복사 (클립보드 API를 못 쓰는 브라우저용) */
function legacyCopy(text: string): boolean {
  const field = document.createElement('textarea');
  field.value = text;
  field.setAttribute('readonly', '');
  field.style.position = 'fixed';
  field.style.opacity = '0';
  document.body.append(field);
  field.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  field.remove();
  return ok;
}

/**
 * 작품 화면 '링크 복사': 단톡방에 붙여 넣기 좋게 『제목』과 링크를 복사한다.
 * 입장 전인 길드원이 링크를 누르면 입장 화면을 거쳐 이 작품으로 온다 (proxy의 next)
 */
export function CopyLinkButton({ path, title }: { path: string; title: string }) {
  const [state, setState] = useState<CopyState>('idle');
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  async function copy() {
    const url = new URL(path, window.location.origin).toString();
    const text = shareText(title, url);
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      ok = legacyCopy(text);
    }
    if (!ok) {
      // 그래도 안 되면 직접 복사할 수 있게 링크를 보여 준다
      window.prompt('아래 링크를 길게 눌러 복사해 주세요', url);
    }
    setState(ok ? 'copied' : 'failed');
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setState('idle'), 2500);
  }

  return (
    <>
      <button
        type="button"
        onClick={copy}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 text-[13px] font-semibold transition hover:bg-surface-2"
      >
        {state === 'copied' ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-4 text-accent">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-4">
            <path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1" />
            <path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1" />
          </svg>
        )}
        {state === 'copied' ? '복사했어요' : '링크 복사'}
      </button>
      {/* 화면 낭독기 알림 (칸은 늘 두고 글자만 바꾼다) */}
      <span role="status" className="sr-only">
        {state === 'copied' ? '작품 링크를 복사했어요. 단톡방에 붙여 넣으면 돼요' : state === 'failed' ? '자동으로 복사하지 못했어요' : ''}
      </span>
    </>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { saveChapterNote } from '@/app/admin/actions';
import { cn } from '@/lib/utils';

type NoteState = 'saved' | 'dirty' | 'saving' | 'error';

const SAVE_DELAY_MS = 800;

/**
 * 작가 메모 (나만 보기): 플롯·복선·다음 화 계획. 길드원 화면에는 절대 나가지 않는다 (따로 된 표, 관리자 조회만).
 * 적다가 멈추면 0.8초 뒤, 칸에서 벗어나면 바로 저장. 본문 저장·발행과는 따로라 발행된 회차도 '수정 반영' 없이 저장된다
 */
export function PrivateNote({ chapterId, initial }: { chapterId: number; initial: string }) {
  const [body, setBody] = useState(initial);
  const [state, setState] = useState<NoteState>('saved');
  const latestRef = useRef(initial);
  const savedRef = useRef(initial);
  const timerRef = useRef<number | null>(null);
  // 저장 요청은 한 줄로 세워 보낸다 (늦게 도착한 옛 내용이 새 내용을 덮지 않게)
  const queueRef = useRef<Promise<void>>(Promise.resolve());

  function flush() {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    queueRef.current = queueRef.current.then(async () => {
      const value = latestRef.current;
      if (value === savedRef.current) return;
      setState('saving');
      const result = await saveChapterNote({ chapterId, body: value }).catch(() => ({ ok: false as const, message: '' }));
      if (result.ok) {
        savedRef.current = value;
        setState(latestRef.current === value ? 'saved' : 'dirty');
      } else {
        setState('error');
      }
    });
  }

  function onChange(value: string) {
    latestRef.current = value;
    setBody(value);
    setState('dirty');
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(flush, SAVE_DELAY_MS);
  }

  // '작가 메모 모아 보기'의 '메모 고치기'(주소 끝 #private-note)로 왔으면 메모 칸으로 내려가서 포커스.
  // 에디터는 브라우저에서만 늦게 그려져서 브라우저가 알아서 그 자리로 가지 못하고, 본문이 뒤늦게 그려지면 칸이 아래로 밀린다
  // → 그려지는 동안(1.5초) 화면 크기가 바뀔 때마다 다시 맞추고, 직접 스크롤 · 입력하면 바로 그만
  useEffect(() => {
    if (window.location.hash !== '#private-note') return;
    const field = document.getElementById('private-note');
    if (!field) return;
    const place = () => field.scrollIntoView({ block: 'center' });
    place();
    field.focus({ preventScroll: true });
    const observer = new ResizeObserver(place);
    observer.observe(document.body);
    const stopEvents = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const;
    const stop = () => {
      observer.disconnect();
      for (const name of stopEvents) window.removeEventListener(name, stop);
    };
    for (const name of stopEvents) window.addEventListener(name, stop, { passive: true });
    const timer = window.setTimeout(stop, 1500);
    return () => {
      window.clearTimeout(timer);
      stop();
    };
  }, []);

  // 화면을 떠날 때 아직 안 보낸 메모가 있으면 보낸다
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) flush();
    };
    // flush는 ref만 읽는다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const status =
    state === 'error'
      ? '메모를 저장하지 못했어요. 인터넷 연결을 확인해 주세요'
      : state === 'saving' || state === 'dirty'
        ? '저장하는 중…'
        : body.trim()
          ? '메모 저장됨'
          : '';

  return (
    <section aria-labelledby="private-note-label" className="mt-8 rounded-2xl border border-dashed border-line px-4 pt-3.5 pb-4">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <label id="private-note-label" htmlFor="private-note" className="flex items-center gap-1.5 text-sm font-semibold">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-4 text-muted">
            <rect x="5" y="11" width="14" height="9" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </svg>
          작가 메모 <span className="font-normal text-muted">(나만 보기)</span>
        </label>
        <span aria-live="polite" className={cn('text-xs', state === 'error' ? 'text-danger' : 'text-muted')}>
          {status}
        </span>
      </div>
      <p id="private-note-hint" className="mt-1 text-xs text-muted">
        길드원 화면에는 나오지 않아요. 플롯·복선·다음 화 계획을 적어 두세요. 적으면 바로 저장돼요.
      </p>
      <textarea
        id="private-note"
        aria-describedby="private-note-hint"
        value={body}
        onChange={(event) => onChange(event.target.value)}
        onBlur={flush}
        maxLength={5000}
        placeholder="예: 3화에서 할머니가 우산을 알아본 이유 → 7화에서 밝히기"
        className="mt-2.5 min-h-24 w-full resize-y rounded-xl border border-line bg-surface px-4 py-3 text-base leading-relaxed field-sizing-content placeholder:text-muted/70 focus:border-accent focus:ring-3 focus:ring-accent/20 focus:outline-none"
      />
    </section>
  );
}

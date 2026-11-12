'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { announce } from '@/lib/announce';
import { scrollBehavior } from '@/lib/motion';
import { listenText } from '@/lib/speech';
import { LISTEN_START_EVENT, saveRate, savedRate, SPEECH_RATES, speakText, speechEngine } from '@/lib/speech-engine';
import { cn } from '@/lib/utils';

// 회차 화면 '소리 내어 듣기': 브라우저에 들어 있는 목소리로 지금 읽는 문단(위쪽 바 바로 아래 첫 문단)부터 회차 끝까지 한 덩어리씩 (외부 서비스 없음).
// - 덩어리는 책갈피와 같은 기준(문단·인용·템플릿, 장면 전환은 건너뜀). 템플릿은 카드 대신 텍스트로 내보내기와 같은 글(data-speech)을 읽는다
// - 읽는 덩어리는 칠하고, 화면 밖이면 가운데로 옮겨 보여 준다
// - 멈추면 그 덩어리를 기억했다가 '이어 듣기'로 그 덩어리 처음부터. 그만두거나 다른 화면으로 가면 바로 그친다
// - 머리의 단추로 켜고 끈다. 머리는 회차 맨 위에만 있어서, 읽어 내려가면 오른쪽 아래(책갈피 단추 위)에도 듣기 단추가 뜬다
//   (머리까지 올라가서 누르면 '지금 읽는 문단'이 맨 위로 바뀌어 버리므로)
// - 듣는 동안은 화면 아래(오른쪽 단추들을 피해서)에 작은 막대

const CONTENT_ID = 'chapter-content';
// 이만큼 내려가면 오른쪽 아래 듣기 단추가 뜬다 (책갈피 단추와 같게)
const SHOW_AFTER_PX = 80;
const CURRENT = 'wn-speak-current';
// 아래 막대에 가리지 않게 화면 아래쪽 여유
const PLAYER_SPACE = 88;

type Unit = { element: HTMLElement; text: string };
type Status = 'idle' | 'playing' | 'paused';

function barBottom(): number {
  return document.querySelector('header')?.getBoundingClientRect().bottom ?? 0;
}

function readableUnits(): Unit[] {
  const content = document.getElementById(CONTENT_ID);
  if (!content) return [];
  return [...content.querySelectorAll<HTMLElement>(':scope > .contents > *, :scope > :not(.contents)')].flatMap((element) => {
    const text = listenText(element.dataset.speech ?? (element.tagName === 'HR' ? '' : element.innerText));
    return text ? [{ element, text }] : [];
  });
}

/**
 * 읽는 덩어리가 보이게: 위쪽 바에 조금 걸쳤으면 그만큼만 내리고(시작할 때 '지금 읽는 문단'이 바에 걸친 경우),
 * 아래 막대 뒤로 가거나 화면 밖이면 남은 칸의 위에서 1/3쯤에 오게 (덩어리가 화면보다 길면 위 끝을 바 아래로)
 */
function reveal(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const top = barBottom() + 8;
  const bottom = window.innerHeight - PLAYER_SPACE;
  if (rect.top >= top && rect.bottom <= bottom) return;
  const room = bottom - top;
  const peeking = rect.top < top && rect.bottom > top;
  const shift = peeking || rect.height >= room ? rect.top - top : rect.top - top - room / 3;
  window.scrollTo({ top: Math.max(0, window.scrollY + shift), behavior: scrollBehavior() });
}

// 이 브라우저에 음성 읽기가 있는지 (바뀌지 않는 값이라 구독할 것 없음, 서버에서는 없다고 보고 그린 뒤에 확인)
const subscribeNothing = () => () => {};

function clearMarks() {
  document.querySelectorAll(`#${CONTENT_ID} .${CURRENT}`).forEach((element) => element.classList.remove(CURRENT));
}

export function ChapterListen() {
  const supported = useSyncExternalStore(subscribeNothing, () => speechEngine() !== null, () => false);
  const [status, setStatus] = useState<Status>('idle');
  const [place, setPlace] = useState({ index: 0, total: 0 });
  const [rate, setRate] = useState(1);
  const unitsRef = useRef<Unit[]>([]);
  const indexRef = useRef(0);
  // 새로 시작하거나 멈출 때마다 올려서, 그친 문장의 '끝났음' 신호로 다음 덩어리를 읽지 않게
  const runRef = useRef(0);
  const rateRef = useRef(1);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const floatRef = useRef<HTMLButtonElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  // 아래 막대가 닫힐 때 포커스가 막대 안에 있었으면, 다시 그린 뒤 듣기 단추로 돌려준다
  const refocusRef = useRef(false);
  // 떠 있는 듣기 단추로 시작하면 그 단추가 사라지므로, 막대가 뜬 뒤 막대의 멈춤 단추로
  const focusPlayerRef = useRef(false);
  const mainRef = useRef<HTMLButtonElement>(null);
  const [scrolled, setScrolled] = useState(false);

  // 본문을 읽어 내려가면 오른쪽 아래 듣기 단추를 띄운다
  useEffect(() => {
    let frame = 0;
    const check = () => {
      frame = 0;
      setScrolled(window.scrollY > SHOW_AFTER_PX);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(check);
    };
    check();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  // 막대가 닫힌 뒤: 읽던 자리면 오른쪽 아래 듣기 단추, 맨 위면 머리의 듣기 단추로 (화면은 그대로 두고).
  // 떠 있는 단추로 시작했으면 막대의 멈춤 단추로
  useEffect(() => {
    if (status === 'idle' && refocusRef.current) {
      refocusRef.current = false;
      (floatRef.current ?? toggleRef.current)?.focus({ preventScroll: true });
    } else if (status !== 'idle' && focusPlayerRef.current) {
      focusPlayerRef.current = false;
      mainRef.current?.focus({ preventScroll: true });
    }
  }, [status]);

  /** 막대를 닫기 전에: 포커스가 막대 안에 있으면 닫힌 뒤 돌려줄 자리를 잡아 둔다 */
  function closePlayer() {
    refocusRef.current = Boolean(playerRef.current?.contains(document.activeElement));
    clearMarks();
    setStatus('idle');
  }

  useEffect(() => {
    return () => {
      runRef.current += 1;
      speechEngine()?.cancel();
      clearMarks();
      // 다른 화면에 갔다가 돌아왔을 때(화면이 숨겨졌다 다시 보일 때) 듣는 중으로 남아 있지 않게
      setStatus('idle');
    };
  }, []);

  function speakAt(index: number) {
    const engine = speechEngine();
    const units = unitsRef.current;
    if (!engine) return;
    if (index >= units.length) {
      closePlayer();
      announce('회차 끝까지 다 읽었어요');
      return;
    }
    const run = runRef.current;
    indexRef.current = index;
    setPlace({ index, total: units.length });
    clearMarks();
    units[index].element.classList.add(CURRENT);
    reveal(units[index].element);
    speakText(
      engine,
      units[index].text,
      rateRef.current,
      () => {
        if (runRef.current === run) speakAt(index + 1);
      },
      () => {
        // 막히면(브라우저가 거절 등) 멈춘 상태로 두어 '이어 듣기'로 다시 시도할 수 있게
        if (runRef.current === run) setStatus('paused');
      },
    );
  }

  /** fromFloat: 떠 있는 듣기 단추로 시작(그 단추가 사라지므로 포커스를 막대로) */
  function start(fromFloat: boolean) {
    const engine = speechEngine();
    const units = readableUnits();
    if (!engine || units.length === 0) return;
    unitsRef.current = units;
    // 빠르기는 이 기기에 기억한 값 (에디터 소리 내어 읽기와 같이 씀)
    const value = savedRate();
    setRate(value);
    rateRef.current = value;
    const top = barBottom() + 8;
    focusPlayerRef.current = fromFloat;
    window.dispatchEvent(new Event(LISTEN_START_EVENT));
    runRef.current += 1;
    engine.cancel();
    setStatus('playing');
    speakAt(Math.max(0, units.findIndex((unit) => unit.element.getBoundingClientRect().bottom > top)));
  }

  function pause() {
    runRef.current += 1;
    speechEngine()?.cancel();
    setStatus('paused');
  }

  function resume() {
    runRef.current += 1;
    speechEngine()?.cancel();
    setStatus('playing');
    speakAt(indexRef.current);
  }

  function stop() {
    runRef.current += 1;
    speechEngine()?.cancel();
    closePlayer();
  }

  function cycleRate() {
    const values = SPEECH_RATES.map((item) => item.value as number);
    const next = values[(values.indexOf(rate) + 1) % values.length];
    setRate(next);
    rateRef.current = next;
    saveRate(next);
  }

  if (!supported) return null;
  const rateLabel = SPEECH_RATES.find((item) => item.value === rate)?.label ?? '보통';
  const nextRateLabel = SPEECH_RATES[(SPEECH_RATES.findIndex((item) => item.value === rate) + 1) % SPEECH_RATES.length].label;

  return (
    <>
      <button
        ref={toggleRef}
        type="button"
        aria-pressed={status !== 'idle'}
        aria-label="소리 내어 듣기"
        title={status === 'idle' ? '지금 읽는 문단부터 소리 내어 듣기' : '그만 듣기'}
        onClick={status === 'idle' ? () => start(false) : stop}
        className={cn(
          'grid size-10 place-items-center rounded-xl border bg-surface transition hover:bg-surface-2',
          status === 'idle' ? 'border-line' : 'border-accent text-accent',
        )}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-[18px]">
          <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
          <rect x="3" y="14" width="5" height="7" rx="2" />
          <rect x="16" y="14" width="5" height="7" rx="2" />
        </svg>
      </button>
      {status === 'idle' && scrolled ? (
        // 읽던 자리에서 바로: 책갈피 단추 위 (듣는 동안은 아래 막대로 다루므로 숨김)
        <button
          ref={floatRef}
          type="button"
          onClick={() => start(true)}
          aria-label="지금 읽는 곳부터 소리 내어 듣기"
          title="지금 읽는 곳부터 소리 내어 듣기"
          data-print-hide=""
          className="fixed right-4 bottom-[calc(max(1rem,env(safe-area-inset-bottom))+6.5rem)] z-30 grid size-11 place-items-center rounded-full border border-line bg-surface/95 text-fg shadow-lg shadow-black/10 backdrop-blur transition hover:bg-surface-2 sm:right-6 sm:bottom-32"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-5">
            <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
            <rect x="3" y="14" width="5" height="7" rx="2" />
            <rect x="16" y="14" width="5" height="7" rx="2" />
          </svg>
        </button>
      ) : null}
      {status !== 'idle' ? (
        // 오른쪽 아래 책갈피·맨 위로 단추를 피해 왼쪽에. 키보드로는 머리의 듣기 단추 바로 다음
        <div
          ref={playerRef}
          role="group"
          aria-label="소리 내어 듣기"
          data-print-hide=""
          className="fixed right-[4.5rem] bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 z-40 mx-auto flex max-w-sm items-center gap-1 rounded-2xl border border-line bg-surface p-1.5 shadow-lg shadow-black/15 sm:right-[5.5rem] sm:bottom-6"
        >
          <button
            ref={mainRef}
            type="button"
            onClick={status === 'playing' ? pause : resume}
            aria-label={status === 'playing' ? '멈춤' : '이어 듣기'}
            className={cn(
              'grid size-10 shrink-0 place-items-center rounded-xl transition hover:brightness-95',
              status === 'playing' ? 'bg-accent-soft text-accent' : 'bg-accent text-accent-fg',
            )}
          >
            {status === 'playing' ? (
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="size-4">
                <rect x="6.5" y="5" width="4" height="14" rx="1" />
                <rect x="13.5" y="5" width="4" height="14" rx="1" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="size-4">
                <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" />
              </svg>
            )}
          </button>
          <p className="min-w-0 flex-1 px-1.5 leading-tight">
            <span className="block truncate text-[13px] font-semibold">{status === 'playing' ? '듣는 중' : '멈춤'}</span>
            <span className="block text-xs text-muted tabular-nums">
              {place.index + 1} / {place.total}
            </span>
          </p>
          <button
            type="button"
            onClick={cycleRate}
            aria-label={`읽는 빠르기 ${rateLabel}, 누르면 ${nextRateLabel}`}
            title="빠르기는 다음 문단부터 바뀌어요"
            className="h-10 shrink-0 rounded-xl px-2.5 text-xs font-semibold text-muted transition hover:bg-surface-2 hover:text-fg"
          >
            {rateLabel}
          </button>
          <button
            type="button"
            onClick={stop}
            aria-label="그만 듣기"
            className="grid size-10 shrink-0 place-items-center rounded-xl text-muted transition hover:bg-surface-2 hover:text-fg"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" className="size-4">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      ) : null}
    </>
  );
}

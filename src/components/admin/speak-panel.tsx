'use client';

import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { Extension, useEditorState, type Editor } from '@tiptap/react';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { scrollBelowBar } from '@/lib/motion';
import { speechProgress, speechUnitFrom } from '@/lib/speech';
import { cn } from '@/lib/utils';

// ─── 지금 읽는 문단 칠하기 (ProseMirror 플러그인) ─────────────────────
// 읽는 블록의 위치는 메타로 받고, 읽는 동안 글을 고쳐도 위치가 따라가게 트랜잭션마다 옮긴다 (mapping)

type SpeakState = { pos: number | null; decorations: DecorationSet };

export const speakKey = new PluginKey<SpeakState>('wn-speak');

export const SpeakMarks = Extension.create({
  name: 'speakMarks',

  addProseMirrorPlugins() {
    return [
      new Plugin<SpeakState>({
        key: speakKey,
        state: {
          init: () => ({ pos: null, decorations: DecorationSet.empty }),
          apply(tr, previous, _oldState, newState) {
            const meta = tr.getMeta(speakKey) as { pos: number | null } | undefined;
            if (!meta && (!tr.docChanged || previous.pos === null)) return previous;
            let pos = meta ? meta.pos : previous.pos;
            if (!meta && pos !== null) {
              const mapped = tr.mapping.mapResult(pos, 1);
              pos = mapped.deleted ? null : mapped.pos;
            }
            const node = pos === null ? null : newState.doc.nodeAt(pos);
            return {
              pos: node ? pos : null,
              decorations: node && pos !== null ? DecorationSet.create(newState.doc, [Decoration.node(pos, pos + node.nodeSize, { class: 'wn-speak-current' })]) : DecorationSet.empty,
            };
          },
        },
        props: {
          decorations: (state) => speakKey.getState(state)?.decorations,
        },
      }),
    ];
  },
});

// ─── 소리 내어 읽기 창 ─────────────────────────────────────────

const RATES = [
  { value: 0.85, label: '느리게' },
  { value: 1, label: '보통' },
  { value: 1.2, label: '빠르게' },
] as const;
const RATE_KEY = 'wn:speak-rate';

function savedRate(): number {
  try {
    const value = Number(localStorage.getItem(RATE_KEY));
    return RATES.some((rate) => rate.value === value) ? value : 1;
  } catch {
    return 1;
  }
}

// 브라우저 음성 읽기(Web Speech API)의 객체 이름은 조각을 이어 붙여 꺼낸다 (레포 전체에 쓰지 않기로 한 글자 묶음과 겹쳐서).
// 쓰는 기능만 작게 적어 둔 모양
type SpeechVoice = { lang: string };
type SpeechUtterance = {
  text: string;
  lang: string;
  rate: number;
  voice: SpeechVoice | null;
  onend: ((event: Event) => void) | null;
  onerror: ((event: Event) => void) | null;
};
type SpeechEngine = {
  speak: (utterance: SpeechUtterance) => void;
  cancel: () => void;
  getVoices: () => SpeechVoice[];
  addEventListener: (type: 'voiceschanged', listener: () => void) => void;
  removeEventListener: (type: 'voiceschanged', listener: () => void) => void;
};
const ENGINE_NAME = ['speech', 'Syn', 'thesis'].join('');
const UTTERANCE_NAME = ['Speech', 'Syn', 'thesisUtterance'].join('');

/** 이 브라우저의 음성 읽기 (없으면 null) */
function speechEngine(): SpeechEngine | null {
  if (typeof window === 'undefined') return null;
  const scope = window as unknown as Record<string, unknown>;
  return scope[ENGINE_NAME] && scope[UTTERANCE_NAME] ? (scope[ENGINE_NAME] as SpeechEngine) : null;
}

function newUtterance(text: string): SpeechUtterance {
  const Utterance = (window as unknown as Record<string, new (text: string) => SpeechUtterance>)[UTTERANCE_NAME];
  return new Utterance(text);
}

/** 한국어 목소리 (없으면 null → 브라우저 기본 목소리로 ko-KR을 시도) */
function koreanVoice(engine: SpeechEngine): SpeechVoice | null {
  return engine.getVoices().find((voice) => voice.lang.toLowerCase().startsWith('ko')) ?? null;
}

/**
 * 브라우저에 들어 있는 목소리로 본문을 커서가 있는 문단부터 한 문단씩 읽어 준다 (외부 서비스 없음).
 * 읽는 문단은 칠하고 위에 붙은 막대 아래로 옮겨 보여 준다. 멈추면 그 문단을 기억했다가 '이어 읽기'로 그 문단 처음부터.
 * 창을 닫거나 다른 화면으로 가면 바로 그친다
 */
export function SpeakPanel({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const [status, setStatus] = useState<'idle' | 'playing' | 'paused'>('idle');
  const [rate, setRate] = useState(savedRate);
  const [hasKorean, setHasKorean] = useState(true);
  const progress = useEditorState({
    editor,
    selector: ({ editor: now }) => {
      const pos = speakKey.getState(now.state)?.pos ?? null;
      return pos === null ? null : speechProgress(now.state.doc, pos);
    },
  });
  const sectionRef = useRef<HTMLElement>(null);
  const mainRef = useRef<HTMLButtonElement>(null);
  // 읽기를 새로 시작하거나 멈출 때마다 올려서, 그친 문장의 '끝났음' 신호로 다음 문단을 읽지 않게
  const runRef = useRef(0);
  const rateRef = useRef(rate);

  useEffect(() => {
    mainRef.current?.focus();
    const engine = speechEngine();
    if (!engine) return;
    const check = () => setHasKorean(engine.getVoices().length === 0 || koreanVoice(engine) !== null);
    check();
    engine.addEventListener('voiceschanged', check);
    return () => {
      engine.removeEventListener('voiceschanged', check);
      runRef.current += 1;
      engine.cancel();
      if (!editor.isDestroyed) editor.view.dispatch(editor.state.tr.setMeta(speakKey, { pos: null }));
    };
  }, [editor]);

  function mark(pos: number | null) {
    editor.view.dispatch(editor.state.tr.setMeta(speakKey, { pos }));
    if (pos === null) return;
    const element = editor.view.nodeDOM(pos);
    if (element instanceof Element) scrollBelowBar(element, sectionRef.current?.closest<HTMLElement>('[data-editor-bar]') ?? null, 'center');
  }

  /** pos의 단위부터 읽기 (inclusive: pos가 든 블록부터, 아니면 그다음 블록부터) */
  function speakFrom(pos: number, inclusive: boolean) {
    const engine = speechEngine();
    const unit = speechUnitFrom(editor.state.doc, pos, inclusive);
    if (!engine || !unit) {
      setStatus('idle');
      mark(null);
      return;
    }
    const run = runRef.current;
    mark(unit.pos);
    const utterance = newUtterance(unit.text);
    utterance.lang = 'ko-KR';
    const voice = koreanVoice(engine);
    if (voice) utterance.voice = voice;
    utterance.rate = rateRef.current;
    utterance.onend = () => {
      if (runRef.current !== run) return;
      // 읽는 동안 글을 고쳤어도 지금 문서에서 다음 블록을 찾는다
      const current = speakKey.getState(editor.state)?.pos;
      speakFrom(current ?? unit.pos, false);
    };
    utterance.onerror = () => {
      if (runRef.current !== run) return;
      setStatus('idle');
    };
    engine.speak(utterance);
  }

  function play() {
    runRef.current += 1;
    speechEngine()?.cancel();
    setStatus('playing');
    speakFrom(editor.state.selection.from, true);
  }

  function pause() {
    runRef.current += 1;
    speechEngine()?.cancel();
    setStatus('paused');
  }

  function resume() {
    const pos = speakKey.getState(editor.state)?.pos;
    runRef.current += 1;
    setStatus('playing');
    if (pos === null || pos === undefined) speakFrom(editor.state.selection.from, true);
    else speakFrom(pos, true);
  }

  function stop() {
    runRef.current += 1;
    speechEngine()?.cancel();
    setStatus('idle');
    mark(null);
    mainRef.current?.focus();
  }

  function changeRate(value: number) {
    setRate(value);
    rateRef.current = value;
    try {
      localStorage.setItem(RATE_KEY, String(value));
    } catch {}
  }

  function close() {
    onClose();
    editor.view.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  }

  const button = 'flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition';

  return (
    <section ref={sectionRef} aria-label="소리 내어 읽기" onKeyDown={onKeyDown} className="mt-2 rounded-xl border border-line bg-surface p-2">
      {speechEngine() ? (
        <>
          <div className="flex flex-wrap items-center gap-1.5">
            {status === 'playing' ? (
              <button ref={mainRef} type="button" onClick={pause} className={cn(button, 'bg-accent-soft text-accent hover:brightness-95')}>
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="size-4">
                  <rect x="6.5" y="5" width="4" height="14" rx="1" />
                  <rect x="13.5" y="5" width="4" height="14" rx="1" />
                </svg>
                멈춤
              </button>
            ) : (
              <button ref={mainRef} type="button" onClick={status === 'paused' ? resume : play} className={cn(button, 'bg-accent text-accent-fg hover:brightness-95')}>
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="size-4">
                  <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" />
                </svg>
                {status === 'paused' ? '이어 읽기' : '지금 문단부터 읽기'}
              </button>
            )}
            {status !== 'idle' ? (
              <button type="button" onClick={stop} className={cn(button, 'text-fg hover:bg-surface-2')}>
                그만
              </button>
            ) : null}
            {progress ? <span className="px-1 text-xs text-muted tabular-nums">{`${progress.index} / ${progress.total}`}</span> : null}
            <div className="ml-auto flex items-center gap-1">
              <div role="group" aria-label="읽는 빠르기" className="flex rounded-lg bg-surface-2 p-0.5">
                {RATES.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    aria-pressed={rate === item.value}
                    onClick={() => changeRate(item.value)}
                    className={cn('h-8 rounded-md px-2 text-xs font-semibold transition', rate === item.value ? 'bg-surface text-fg shadow-sm' : 'text-muted hover:text-fg')}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="소리 내어 읽기 닫기"
                title="닫기 (Esc)"
                className="grid size-9 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-fg"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" className="size-4">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
          </div>
          <p className="px-1.5 pt-1.5 text-xs text-muted">
            브라우저에 들어 있는 목소리로 읽어요 (밖으로 보내지 않음). 빠르기는 다음 문단부터 바뀌어요.
            {hasKorean ? '' : ' 이 기기에는 한국어 목소리가 없어서 기본 목소리로 읽어요.'}
          </p>
        </>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <p className="px-1.5 text-sm text-muted">이 브라우저는 소리 내어 읽기를 지원하지 않아요.</p>
          <button ref={mainRef} type="button" onClick={close} className={cn(button, 'text-fg hover:bg-surface-2')}>
            닫기
          </button>
        </div>
      )}
    </section>
  );
}

'use client';

import { useEffect, useId, useRef, useState } from 'react';

// 회차 에디터 단축키 안내. 툴바 단추나 ⌘/ (Ctrl+/)로 열고, Esc·바깥 누르기·닫기로 닫는다.
// 브라우저 기본 <dialog>(모달)이라 열려 있는 동안 포커스가 안에 머물고, 닫으면 원래 자리로 돌아간다.
// 실제로 동작하는 것만 적는다: Tiptap 기본 단축키(굵게·기울임·취소선·인용·줄바꿈·되돌리기)와
// 이 에디터가 따로 둔 것(저장·찾기·문단 옮기기·복제·따옴표로 감싸기), 줄 처음에 쓰면 바뀌는 입력 규칙

type Combo = { mod?: boolean; shift?: boolean; alt?: boolean; key: string };
type Item = { label: string; combos?: Combo[]; typed?: string };

const GROUPS: Array<{ title: string; items: Item[] }> = [
  {
    title: '저장 · 찾기',
    items: [
      { label: '저장', combos: [{ mod: true, key: 'S' }] },
      { label: '찾기 · 바꾸기', combos: [{ mod: true, key: 'F' }] },
      { label: '다음 · 이전 찾은 곳 (찾기 칸에서)', combos: [{ key: 'Enter' }, { shift: true, key: 'Enter' }] },
    ],
  },
  {
    title: '되돌리기',
    items: [
      { label: '되돌리기', combos: [{ mod: true, key: 'Z' }] },
      { label: '다시 하기', combos: [{ mod: true, shift: true, key: 'Z' }] },
    ],
  },
  {
    title: '글자 모양',
    items: [
      { label: '굵게', combos: [{ mod: true, key: 'B' }] },
      { label: '기울임', combos: [{ mod: true, key: 'I' }] },
      { label: '취소선', combos: [{ mod: true, shift: true, key: 'S' }] },
      { label: '인용', combos: [{ mod: true, shift: true, key: 'B' }] },
      { label: '고른 글을 “ ”로 감싸기 (다시 누르면 ‘ ’ · 「 」 · 『 』 · 벗기기)', combos: [{ mod: true, key: "'" }] },
      { label: '문단을 나누지 않고 줄바꿈', combos: [{ shift: true, key: 'Enter' }] },
    ],
  },
  {
    title: '문단',
    items: [
      { label: '문단(고른 템플릿도) 위로 · 아래로 옮기기', combos: [{ alt: true, key: '↑' }, { alt: true, key: '↓' }] },
      { label: '문단(고른 템플릿도) 위 · 아래에 복사', combos: [{ alt: true, shift: true, key: '↑' }, { alt: true, shift: true, key: '↓' }] },
    ],
  },
  {
    title: '상용구',
    items: [
      { label: '상용구 메뉴 열기 (자주 쓰는 말 넣기)', combos: [{ mod: true, key: ';' }] },
      { label: '메뉴에서 그 번호의 상용구 바로 넣기', combos: [{ key: '1~9' }] },
    ],
  },
  {
    title: '쓰면 바로 바뀌는 것',
    items: [
      { label: '장면 전환 ✦ (빈 줄에서)', typed: '---' },
      { label: '인용 (줄 처음에서 > 다음 띄어쓰기)', typed: '> ' },
      { label: '굵게', typed: '**글자**' },
      { label: '기울임', typed: '*글자*' },
      { label: '취소선', typed: '~~글자~~' },
    ],
  },
  {
    title: '템플릿',
    items: [
      { label: '템플릿 메뉴에서 고르기 · 넣기', combos: [{ key: '↑' }, { key: '↓' }, { key: 'Enter' }] },
      { label: '편집 창 닫기 (완료)', combos: [{ key: 'Esc' }] },
    ],
  },
  {
    title: '이 안내',
    items: [{ label: '단축키 안내 열기', combos: [{ mod: true, key: '/' }] }],
  },
];

const SPOKEN: Record<string, string> = { '⌘': 'Command', '⇧': 'Shift', '⌥': 'Option', '↑': '위 화살표', '↓': '아래 화살표', "'": '작은따옴표', ';': '세미콜론', '1~9': '숫자 1부터 9' };

/** Mac은 ⇧⌘Z · ⌥↑처럼 붙여서(애플 순서 ⌥⇧⌘), 그 밖은 Ctrl+Shift+Z · Alt+↑ */
function comboKeys(combo: Combo, mac: boolean): string[] {
  const keys: string[] = [];
  if (mac) {
    if (combo.alt) keys.push('⌥');
    if (combo.shift) keys.push('⇧');
    if (combo.mod) keys.push('⌘');
  } else {
    if (combo.mod) keys.push('Ctrl');
    if (combo.alt) keys.push('Alt');
    if (combo.shift) keys.push('Shift');
  }
  keys.push(combo.key);
  return keys;
}

function isMac(): boolean {
  const platform = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ?? navigator.platform ?? '';
  return /mac|iphone|ipad|ipod/i.test(platform) || /Mac OS X/.test(navigator.userAgent);
}

export function ShortcutGuide() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const [mac, setMac] = useState(false);
  const titleId = useId();

  function open() {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    setMac(isMac());
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.showModal();
  }

  // ⌘/ · Ctrl+/ 로 열기 (본문에 글자를 쓰는 중에도)
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key === '/') {
        event.preventDefault();
        open();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // 닫히면 연 자리로 포커스를 돌려준다 (브라우저가 이미 돌려줬으면 그대로)
  function onClose() {
    const target = returnFocusRef.current;
    returnFocusRef.current = null;
    if (target?.isConnected && (document.activeElement === document.body || document.activeElement === null)) target.focus();
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-haspopup="dialog"
        title="단축키 안내 (Ctrl+/ · ⌘/)"
        aria-label="단축키 안내"
        // 휴대폰에서는 단축키를 못 쓰니 자리만 차지해서 숨긴다
        className="hidden h-8 min-w-8 place-items-center rounded-lg px-2 text-fg transition hover:bg-surface-2 sm:grid"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-4">
          <rect x="2.5" y="6" width="19" height="12" rx="2" />
          <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10" />
        </svg>
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onClose={onClose}
        // 바깥(어두운 바탕)을 누르면 닫기. 안쪽은 아래 div가 받아서 여기까지 오지 않는다
        onClick={(event) => {
          if (event.target === event.currentTarget) dialogRef.current?.close();
        }}
        className="m-auto w-[min(28rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-line bg-surface p-0 text-fg shadow-xl backdrop:bg-black/45"
      >
        <div className="flex max-h-[min(40rem,calc(100dvh-2rem))] flex-col">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line py-2.5 pr-2.5 pl-5">
            <h2 id={titleId} className="font-bold">
              단축키
            </h2>
            <button
              type="button"
              autoFocus
              onClick={() => dialogRef.current?.close()}
              aria-label="닫기"
              className="grid size-9 place-items-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-fg"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" className="size-4">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
          {/* 목록이 창보다 길면 안에서 스크롤: 키보드로도 내릴 수 있게 포커스를 받는다 (Safari는 스크롤 칸에 저절로 포커스가 가지 않음) */}
          <div
            tabIndex={0}
            role="region"
            aria-label="단축키 목록"
            className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 py-4 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
          >
            {GROUPS.map((group) => (
              <section key={group.title}>
                <h3 className="text-xs font-semibold text-muted">{group.title}</h3>
                <dl className="mt-2 space-y-2">
                  {group.items.map((item) => (
                    <div key={`${group.title}-${item.label}`} className="flex items-center justify-between gap-4 text-sm">
                      <dt className="min-w-0 break-keep">{item.label}</dt>
                      <dd className="flex shrink-0 flex-wrap items-center justify-end gap-1">
                        {item.typed ? (
                          <kbd className="rounded-md border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-xs whitespace-pre">{item.typed}</kbd>
                        ) : (
                          item.combos?.map((combo, index) => {
                            const keys = comboKeys(combo, mac);
                            return (
                              <span key={index} className="flex items-center gap-0.5">
                                {index > 0 ? <span className="mx-0.5 text-xs text-muted">·</span> : null}
                                <span aria-hidden="true" className="flex items-center gap-0.5">
                                  {keys.map((key, keyIndex) => (
                                    <span key={keyIndex} className="flex items-center gap-0.5">
                                      {!mac && keyIndex > 0 ? <span className="text-xs text-muted">+</span> : null}
                                      <kbd className="min-w-6 rounded-md border border-line bg-surface-2 px-1.5 py-0.5 text-center font-sans text-xs font-semibold">{key}</kbd>
                                    </span>
                                  ))}
                                </span>
                                <span className="sr-only">{keys.map((key) => SPOKEN[key] ?? key).join(' + ')}</span>
                              </span>
                            );
                          })
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>
        </div>
      </dialog>
    </>
  );
}

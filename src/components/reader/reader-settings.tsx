'use client';

import { useId, useRef, useState, useSyncExternalStore } from 'react';
import { useDismiss } from '@/components/use-dismiss';
import { parseReaderPrefs, readReaderPrefsRaw, saveReaderPrefs, subscribeReaderPrefs, type ReaderPrefs } from '@/lib/reader-prefs';
import { cn } from '@/lib/utils';

type Settings = ReaderPrefs;

export function ReaderSettings() {
  // 서버에서는 null → 기본값으로 그리고, 브라우저에서 저장값으로 바꾼다 (하이드레이션 불일치 없음)
  const raw = useSyncExternalStore(subscribeReaderPrefs, readReaderPrefsRaw, () => null);
  const settings = parseReaderPrefs(raw);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  useDismiss({ open, onClose: () => setOpen(false), rootRef, triggerRef });

  const update = (patch: Settings) => saveReaderPrefs({ ...settings, ...patch });

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label="읽기 설정"
        className="grid size-10 place-items-center rounded-xl border border-line bg-surface font-serif text-[17px] font-bold transition hover:bg-surface-2"
      >
        가
      </button>
      {open ? (
        <div className="absolute top-12 right-0 z-40 w-[17.5rem] space-y-4 rounded-2xl border border-line bg-surface p-4 shadow-lg shadow-black/5">
          <Option
            label="글자 크기"
            options={['작게', '보통', '크게', '아주 크게']}
            selected={settings.size ?? 1}
            onSelect={(index) => update({ size: index })}
          />
          <Option
            label="줄 간격"
            options={['좁게', '보통', '넓게']}
            selected={settings.leading ?? 1}
            onSelect={(index) => update({ leading: index })}
          />
          <Option
            label="글꼴"
            options={['고딕', '명조']}
            selected={settings.font === 'serif' ? 1 : 0}
            onSelect={(index) => update({ font: index === 1 ? 'serif' : 'sans' })}
          />
          <Option
            label="화면"
            options={['자동', '밝게', '어둡게']}
            selected={settings.theme === 'light' ? 1 : settings.theme === 'dark' ? 2 : 0}
            onSelect={(index) => update({ theme: index === 1 ? 'light' : index === 2 ? 'dark' : undefined })}
          />
          {/* 인쇄·PDF로 저장: 머리 메뉴·단추는 빠지고 제목·본문·작가의 말만 (globals.css의 인쇄 모양) */}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              window.print();
            }}
            className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-line text-[13px] font-semibold transition hover:bg-surface-2"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-4">
              <path d="M7 9V3h10v6M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2" />
              <path d="M7 14h10v7H7z" />
            </svg>
            인쇄 · PDF로 저장
          </button>
        </div>
      ) : null}
    </div>
  );
}

function Option({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: string[];
  selected: number;
  onSelect: (index: number) => void;
}) {
  // 화면 낭독기가 '보통'만이 아니라 '글자 크기, 보통'으로 읽도록 버튼 묶음에 이름을 붙인다
  const labelId = useId();
  return (
    <div className="space-y-1.5">
      <p id={labelId} className="text-xs font-semibold text-muted">
        {label}
      </p>
      <div role="group" aria-labelledby={labelId} className="flex rounded-xl bg-surface-2 p-1">
        {options.map((option, index) => (
          <button
            key={option}
            type="button"
            onClick={() => onSelect(index)}
            aria-pressed={selected === index}
            className={cn(
              'h-8 flex-1 rounded-lg text-[13px] font-semibold transition',
              selected === index ? 'bg-surface text-fg shadow-sm' : 'text-muted hover:text-fg',
            )}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

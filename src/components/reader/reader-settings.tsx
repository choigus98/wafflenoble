'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { cn } from '@/lib/utils';

type Settings = {
  size?: number; // 0~3
  leading?: number; // 0~2
  font?: 'sans' | 'serif';
  theme?: 'light' | 'dark'; // 없으면 기기 설정을 따름
};

const STORAGE_KEY = 'wn:reader-settings';
const CHANGE_EVENT = 'wn:reader-settings';
const KEYS = ['theme', 'size', 'leading', 'font'] as const;

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

function readRaw(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? '{}';
  } catch {
    return '{}';
  }
}

function parse(raw: string | null): Settings {
  if (!raw) return {};
  try {
    const value = JSON.parse(raw);
    return value && typeof value === 'object' ? (value as Settings) : {};
  } catch {
    return {};
  }
}

function save(settings: Settings) {
  const root = document.documentElement;
  for (const key of KEYS) {
    const value = settings[key];
    if (value === undefined) delete root.dataset[key];
    else root.dataset[key] = String(value);
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // 사파리 비공개 모드 등에서는 저장이 안 될 수 있다. 화면에는 이번 방문 동안만 적용
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function ReaderSettings() {
  // 서버에서는 null → 기본값으로 그리고, 브라우저에서 저장값으로 바꾼다 (하이드레이션 불일치 없음)
  const raw = useSyncExternalStore(subscribe, readRaw, () => null);
  const settings = parse(raw);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === 'Escape' : !rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  const update = (patch: Settings) => save({ ...settings, ...patch });

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
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
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold text-muted">{label}</p>
      <div className="flex rounded-xl bg-surface-2 p-1">
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

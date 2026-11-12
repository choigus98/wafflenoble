'use client';

import { useId, useRef, useState, useSyncExternalStore } from 'react';
import { CopyLinkButton } from '@/components/reader/copy-link-button';
import { useDismiss } from '@/components/use-dismiss';
import { announce } from '@/lib/announce';
import {
  isDefaultReading,
  parseReaderPrefs,
  readReaderPrefsRaw,
  resetReadingPrefs,
  saveReaderPrefs,
  subscribeReaderPrefs,
  type ReaderPrefs,
} from '@/lib/reader-prefs';
import { cn } from '@/lib/utils';

type Settings = ReaderPrefs;

/** share: 길드원이 들어올 수 있는 회차일 때만 넘긴다 (임시저장·예약·비공개 작품이면 링크 복사를 안 보여 줌) */
export function ReaderSettings({ share }: { share?: { path: string; title: string; chapterLabel: string } }) {
  // 서버에서는 null → 기본값으로 그리고, 브라우저에서 저장값으로 바꾼다 (하이드레이션 불일치 없음)
  const raw = useSyncExternalStore(subscribeReaderPrefs, readReaderPrefsRaw, () => null);
  const settings = parseReaderPrefs(raw);
  const atDefault = isDefaultReading(settings);
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
            label="문단 간격"
            options={['좁게', '보통', '넓게']}
            selected={settings.gap ?? 1}
            onSelect={(index) => update({ gap: index === 1 ? undefined : index })}
          />
          <Option
            label="문단 정렬"
            options={['왼쪽', '양쪽 맞춤']}
            selected={settings.align === 'justify' ? 1 : 0}
            onSelect={(index) => update({ align: index === 1 ? 'justify' : undefined })}
          />
          <Option
            label="글꼴"
            options={['고딕', '명조']}
            selected={settings.font === 'serif' ? 1 : 0}
            onSelect={(index) => update({ font: index === 1 ? 'serif' : 'sans' })}
          />
          {/* 본문 폭은 넓은 화면에서만 차이가 나서, 좁은 화면(태블릿 세로보다 좁으면)에서는 감춘다 */}
          <div className="hidden md:block">
            <Option
              label="본문 폭"
              options={['좁게', '보통', '넓게']}
              selected={settings.width ?? 1}
              onSelect={(index) => update({ width: index === 1 ? undefined : index })}
            />
          </div>
          <Option
            label="화면"
            options={['자동', '밝게', '어둡게']}
            selected={settings.theme === 'light' ? 1 : settings.theme === 'dark' ? 2 : 0}
            onSelect={(index) => update({ theme: index === 1 ? 'light' : index === 2 ? 'dark' : undefined })}
          />
          {/* 종이 바탕은 밝은 화면에서만 (어두운 화면에서는 골라 둬도 그대로) */}
          <Option
            label="바탕 (밝은 화면)"
            options={['보통', '종이']}
            selected={settings.bg === 'paper' ? 1 : 0}
            onSelect={(index) => update({ bg: index === 1 ? 'paper' : undefined })}
          />
          {/* 글자·간격·정렬·바탕만 처음대로 (화면 모드는 그대로). 이미 기본값이면 눌러도 바뀌는 게 없다고 알려 주되,
              disabled로 막으면 누른 직후 포커스가 사라져서 aria-disabled로 */}
          <div className="flex justify-end">
            <button
              type="button"
              aria-disabled={atDefault}
              onClick={() => {
                if (atDefault) return;
                saveReaderPrefs(resetReadingPrefs(settings));
                announce('글자 크기와 간격, 정렬, 바탕을 처음대로 되돌렸어요');
              }}
              className={cn(
                'h-8 rounded-lg px-2 text-xs font-semibold text-muted transition',
                atDefault ? 'cursor-default opacity-50' : 'hover:bg-surface-2 hover:text-fg',
              )}
            >
              글자·간격·정렬·바탕 처음대로
            </button>
          </div>
          {share ? <CopyLinkButton path={share.path} title={share.title} chapterLabel={share.chapterLabel} variant="block" label="이 회차 링크 복사" /> : null}
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

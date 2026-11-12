'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { Character } from '@/lib/characters';
import { scrollBehavior } from '@/lib/motion';
import { cn } from '@/lib/utils';

// 처음에 보이는 이름 수. 이보다 두 명 넘게 많으면 나머지는 '+N명 더 보기'로 접어 둔다
// (인물이 많은 회차에서 칸이 화면 몇 개를 차지하고, 위쪽 이름을 눌렀을 때 소개가 멀리 아래에 뜨지 않게)
const SHOWN = 10;

/**
 * 회차 끝 '이 회차 등장인물': 이 회차에 나온 인물 이름(작품 정보의 등장인물 중, 적은 순서대로).
 * 소개가 있는 이름은 누르면 아래에 소개 한 줄이 펼쳐진다 (한 번에 하나, 다시 누르면 접힘). 소개가 없는 이름은 그냥 글자.
 * 펼친 소개가 화면 밖이면 보이는 곳까지만 스크롤. 앞으로 나올 인물은 안 보이므로 미리 알려 주지 않는다
 */
export function ChapterCharacters({ characters }: { characters: Character[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const [all, setAll] = useState(false);
  const titleId = useId();
  const detailId = useId();
  const detailRef = useRef<HTMLDivElement>(null);
  const folds = characters.length > SHOWN + 2;
  const shown = folds && !all ? characters.slice(0, SHOWN) : characters;
  const selected = open === null ? null : characters[open];

  useEffect(() => {
    if (open !== null) detailRef.current?.scrollIntoView({ block: 'nearest', behavior: scrollBehavior() });
  }, [open]);

  return (
    <section aria-labelledby={titleId} data-print-hide="" className="mb-10">
      <h2 id={titleId} className="text-xs font-semibold text-muted">
        이 회차 등장인물 <span className="font-normal">{characters.length}명</span>
      </h2>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {shown.map((character, index) =>
          character.description ? (
            <li key={character.name}>
              <button
                type="button"
                aria-expanded={open === index}
                aria-controls={detailId}
                onClick={() => setOpen((current) => (current === index ? null : index))}
                className={cn(
                  'inline-flex min-h-9 items-center gap-1 rounded-full border px-3 text-sm font-semibold break-keep transition',
                  open === index ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-surface hover:bg-surface-2',
                )}
              >
                {character.name}
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className={cn('size-3.5 shrink-0 text-muted transition', open === index && 'rotate-180 text-accent')}
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
            </li>
          ) : (
            <li key={character.name} className="inline-flex min-h-9 items-center rounded-full border border-dashed border-line px-3 text-sm break-keep text-muted">
              {character.name}
            </li>
          ),
        )}
        {folds ? (
          <li>
            <button
              type="button"
              aria-expanded={all}
              onClick={() => {
                // 접을 때 숨는 이름의 소개가 열려 있으면 같이 닫는다
                if (all && open !== null && open >= SHOWN) setOpen(null);
                setAll(!all);
              }}
              className="inline-flex min-h-9 items-center rounded-full px-3 text-sm font-semibold text-accent transition hover:bg-surface-2"
            >
              {all ? '접기' : `+${characters.length - SHOWN}명 더 보기`}
            </button>
          </li>
        ) : null}
      </ul>
      {/* 고른 인물 소개 (낭독기는 펼쳐질 때 읽어 준다) */}
      <div ref={detailRef} id={detailId} aria-live="polite" className="scroll-mb-24">
        {selected ? (
          <p className="mt-2 rounded-xl bg-surface-2 px-4 py-2.5 text-sm leading-relaxed break-keep">
            <span className="font-semibold">{selected.name}</span>
            <span aria-hidden="true" className="mx-1.5 text-muted">
              ·
            </span>
            <span className="sr-only">, </span>
            {selected.description}
          </p>
        ) : null}
      </div>
    </section>
  );
}

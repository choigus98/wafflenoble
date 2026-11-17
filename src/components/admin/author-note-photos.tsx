'use client';

import { useRef, useState, useTransition, type RefObject } from 'react';
import { uploadImage } from '@/app/admin/actions';
import { Button } from '@/components/ui';
import { imageFormData, prepareImage } from '@/lib/image-prepare';
import { NOTE_IMAGE_LIMIT, insertNoteImage, noteImageIds, removeNoteImage } from '@/lib/images';

/**
 * '작가의 말' 사진: 올리면 커서 자리에 '[사진:…]' 한 줄을 넣는다. 그 줄 자리에 길드원 화면에서 사진이 보인다.
 * 글과 같은 저장 흐름(자동저장 · 수정 반영)을 그대로 타도록 사진도 글 안의 한 줄로 둔다 (lib/images.ts)
 */
export function AuthorNotePhotos({
  value,
  onChange,
  textarea,
}: {
  value: string;
  onChange: (value: string) => void;
  textarea: RefObject<HTMLTextAreaElement | null>;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const savedCaret = useRef<number | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const ids = noteImageIds(value);
  const full = ids.length >= NOTE_IMAGE_LIMIT;

  function upload(file: File) {
    setError(null);
    // 파일 고르는 창이 뜨기 전 커서 자리
    const field = textarea.current;
    const caret = field && document.activeElement === field ? field.selectionStart : savedCaret.current;
    savedCaret.current = null;
    startTransition(async () => {
      try {
        const prepared = await prepareImage(file, 'note');
        const result = await uploadImage(imageFormData(prepared, 'note'));
        if ('error' in result) {
          setError(result.error);
          return;
        }
        const next = insertNoteImage(textarea.current?.value ?? value, result.id, caret);
        if (next.value.length > 2000) {
          setError('작가의 말이 2,000자를 넘어서 사진을 넣지 못했어요');
          return;
        }
        onChange(next.value);
        requestAnimationFrame(() => {
          const element = textarea.current;
          if (!element) return;
          element.focus();
          element.setSelectionRange(next.caret, next.caret);
        });
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : '사진을 올리지 못했어요');
      }
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/*"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) upload(file);
          }}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={pending || full}
          onMouseDown={() => {
            // 단추를 누르면 입력칸 포커스가 풀리므로 커서 자리를 기억해 둔다
            const field = textarea.current;
            savedCaret.current = field && document.activeElement === field ? field.selectionStart : null;
          }}
          onClick={() => fileInput.current?.click()}
        >
          {pending ? '사진 올리는 중…' : '사진 넣기'}
        </Button>
        <span className="text-xs text-muted">
          {full ? `사진은 ${NOTE_IMAGE_LIMIT}장까지예요` : `커서 자리에 들어가요 · ${NOTE_IMAGE_LIMIT}장까지 · 긴 쪽 1600px로 줄여서 올려요`}
        </span>
      </div>
      {error ? (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : null}
      {ids.length > 0 ? (
        <ul className="flex flex-wrap gap-2" aria-label="넣은 사진">
          {ids.map((id, index) => (
            <li key={`${id}-${index}`} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/img/${id}`} alt={`사진 ${index + 1}`} className="size-20 rounded-lg bg-surface-2 object-cover ring-1 ring-line" />
              <button
                type="button"
                onClick={() => onChange(removeNoteImage(textarea.current?.value ?? value, id))}
                aria-label={`사진 ${index + 1} 빼기`}
                className="absolute -top-1.5 -right-1.5 grid size-6 place-items-center rounded-full bg-fg text-xs font-bold text-bg shadow focus-visible:outline-2 focus-visible:outline-accent"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

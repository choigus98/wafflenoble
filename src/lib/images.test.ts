import { describe, expect, it } from 'vitest';
import { authorNoteAsText, insertNoteImage, noteImageIds, parseAuthorNote, removeNoteImage, sniffImageMime } from '@/lib/images';

const A = '11111111-2222-4333-8444-555555555555';
const B = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';

describe('sniffImageMime', () => {
  it('앞 바이트로 형식을 알아본다', () => {
    expect(sniffImageMime(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg');
    expect(sniffImageMime(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe('image/png');
    expect(sniffImageMime(new TextEncoder().encode('RIFF\0\0\0\0WEBPVP8 '))).toBe('image/webp');
    expect(sniffImageMime(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg">'))).toBeNull();
  });
});

describe('작가의 말 사진', () => {
  it('사진 줄을 나누고 글은 그대로', () => {
    const note = `고마워요!\n\n[사진:${A}]\n다음 화도\n [사진:${B}] `;
    expect(parseAuthorNote(note)).toEqual([
      { type: 'text', text: '고마워요!' },
      { type: 'image', id: A },
      { type: 'text', text: '다음 화도' },
      { type: 'image', id: B },
    ]);
    expect(noteImageIds(note)).toEqual([A, B]);
    expect(authorNoteAsText(note)).toBe('고마워요!\n\n(사진)\n\n다음 화도\n\n(사진)');
  });

  it('글 중간의 사진 표기는 사진으로 보지 않는다', () => {
    expect(parseAuthorNote(`앞 [사진:${A}] 뒤`)).toEqual([{ type: 'text', text: `앞 [사진:${A}] 뒤` }]);
  });

  it('커서 자리에 한 줄로 넣고, 빼면 그 줄이 사라진다', () => {
    const { value, caret } = insertNoteImage('첫 줄둘째', A, 3);
    expect(value).toBe(`첫 줄\n[사진:${A}]\n둘째`);
    expect(value.slice(0, caret)).toBe(`첫 줄\n[사진:${A}]\n`);
    expect(insertNoteImage('', A, null).value).toBe(`[사진:${A}]`);
    expect(removeNoteImage(value, A)).toBe('첫 줄\n둘째');
  });
});

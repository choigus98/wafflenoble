// 사진(표지 · 작가의 말) 공통 규칙. 서버·브라우저 양쪽에서 쓴다

/** 올릴 수 있는 크기 (브라우저에서 줄인 뒤). 서버 액션 요청 한도(1MB) 안에 들어가게 */
export const IMAGE_MAX_BYTES = 950_000;

/** 표지: 세로 3:4. 이 크기로 가운데를 잘라 맞춘다. 이보다 작으면 흐릿하게 보일 수 있다 */
export const COVER_WIDTH = 900;
export const COVER_HEIGHT = 1200;
export const COVER_MIN_WIDTH = 600;
export const COVER_MIN_HEIGHT = 800;

/** 작가의 말 사진: 긴 쪽을 이 크기까지 줄인다. 한 회차에 최대 개수 */
export const NOTE_IMAGE_MAX_SIDE = 1600;
export const NOTE_IMAGE_LIMIT = 5;

export type ImageMime = 'image/jpeg' | 'image/png' | 'image/webp';

/** 파일 앞 바이트로 형식을 확인한다 (확장자·브라우저가 보낸 형식은 믿지 않음). SVG처럼 스크립트가 들어갈 수 있는 형식은 받지 않는다 */
export function sniffImageMime(bytes: Uint8Array): ImageMime | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) => bytes[index] === value)) return 'image/png';
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const NOTE_IMAGE_LINE = new RegExp(`^\\[사진:(${UUID})\\]$`);

export function isImageId(value: unknown): value is string {
  return typeof value === 'string' && new RegExp(`^${UUID}$`).test(value);
}

/** 작가의 말 안의 사진 자리. 한 줄에 '[사진:id]'만 있으면 그 자리에 사진이 보인다 */
export function noteImageToken(id: string): string {
  return `[사진:${id}]`;
}

export type NotePart = { type: 'text'; text: string } | { type: 'image'; id: string };

/** 작가의 말을 글 덩어리와 사진으로 나눈다. 빈 글 덩어리는 버린다 */
export function parseAuthorNote(note: string): NotePart[] {
  const parts: NotePart[] = [];
  let buffer: string[] = [];
  const flush = () => {
    const text = buffer.join('\n').trim();
    if (text) parts.push({ type: 'text', text });
    buffer = [];
  };
  for (const line of note.split('\n')) {
    const match = NOTE_IMAGE_LINE.exec(line.trim());
    if (match) {
      flush();
      parts.push({ type: 'image', id: match[1] });
    } else {
      buffer.push(line);
    }
  }
  flush();
  return parts;
}

/** 작가의 말에 들어 있는 사진 id들 (순서대로) */
export function noteImageIds(note: string): string[] {
  return parseAuthorNote(note).flatMap((part) => (part.type === 'image' ? [part.id] : []));
}

/** 글 파일로 내보낼 때: 사진 자리는 '(사진)'으로 */
export function authorNoteAsText(note: string): string {
  return parseAuthorNote(note)
    .map((part) => (part.type === 'text' ? part.text : '(사진)'))
    .join('\n\n');
}

/** 작가의 말에서 사진 한 장 빼기 (그 줄을 지운다) */
export function removeNoteImage(note: string, id: string): string {
  return note
    .split('\n')
    .filter((line) => line.trim() !== noteImageToken(id))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');
}

/** 커서 자리(없으면 끝)에 사진 줄 넣기. 앞뒤가 글이면 줄을 바꿔 사진이 한 줄을 차지하게 한다 */
export function insertNoteImage(note: string, id: string, at: number | null): { value: string; caret: number } {
  const position = at === null ? note.length : Math.max(0, Math.min(at, note.length));
  const before = note.slice(0, position);
  const after = note.slice(position);
  const lead = before === '' || before.endsWith('\n') ? '' : '\n';
  const tail = after === '' || after.startsWith('\n') ? '' : '\n';
  const inserted = `${lead}${noteImageToken(id)}${tail}`;
  return { value: before + inserted + after, caret: before.length + inserted.length };
}

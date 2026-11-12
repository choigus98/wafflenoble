import 'server-only';
import sanitizeHtml from 'sanitize-html';

// 에디터 툴바에서 만들 수 있는 것만 허용 (문단, 줄바꿈, 굵게, 기울임, 취소선, 장면 전환, 인용)
const ALLOWED_TAGS = ['p', 'br', 'strong', 'em', 's', 'hr', 'blockquote'];

export function sanitizeChapterHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {},
    disallowedTagsMode: 'discard',
  });
}

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': ' ',
};

/** 공백 포함 글자수. 에디터의 doc.textContent 기준과 맞춘다 (문단 사이 줄바꿈은 세지 않음) */
export function countCharacters(html: string): number {
  const text = sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} }).replace(
    /&(amp|lt|gt|quot|#39|nbsp);/g,
    (entity) => ENTITIES[entity] ?? entity,
  );
  return [...text].length;
}

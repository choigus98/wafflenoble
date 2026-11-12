import 'server-only';
import sanitizeHtml from 'sanitize-html';
import { normalizeStoryBlocks } from '@/lib/story-blocks';

// 에디터에서 만들 수 있는 것만 허용 (문단, 줄바꿈, 굵게, 기울임, 취소선, 장면 전환, 인용, 템플릿 블록)
const ALLOWED_TAGS = ['p', 'br', 'strong', 'em', 's', 'hr', 'blockquote', 'div'];

export function sanitizeChapterHtml(html: string): string {
  const clean = sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    // div는 템플릿 블록용 속성 두 개만 허용. 블록 내용(JSON)은 아래에서 스키마로 다시 검증한다
    allowedAttributes: { div: ['data-wn-block', 'data-wn-data'] },
    disallowedTagsMode: 'discard',
  });
  return normalizeStoryBlocks(clean);
}

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': ' ',
};

/**
 * 공백 포함 글자수. 에디터의 doc.textContent 기준과 맞춘다 (문단 사이 줄바꿈은 세지 않음).
 * 템플릿 블록 안의 글자는 속성에 들어 있어서 세지 않는다
 */
export function countCharacters(html: string): number {
  const text = sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} }).replace(
    /&(amp|lt|gt|quot|#39|nbsp);/g,
    (entity) => ENTITIES[entity] ?? entity,
  );
  return [...text].length;
}

/** 목록에 보여 줄 본문 첫머리 (문단 사이는 띄어쓰기, 템플릿 블록 내용은 빠짐) */
export function htmlExcerpt(html: string, max = 60): string {
  const text = sanitizeHtml(html.replace(/<\/(p|blockquote)>|<br\s*\/?>/g, ' '), { allowedTags: [], allowedAttributes: {} })
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (entity) => ENTITIES[entity] ?? entity)
    .replace(/\s+/g, ' ')
    .trim();
  const chars = [...text];
  return chars.length > max ? `${chars.slice(0, max).join('')}…` : text;
}

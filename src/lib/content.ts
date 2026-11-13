import 'server-only';
import sanitizeHtml from 'sanitize-html';
import { storyBlockToText } from '@/lib/chapter-text';
import { firstSentence } from '@/lib/opening';
import { BLOCK_SIZE, normalizeBlockSize, normalizeStoryBlocks, splitStoryContent } from '@/lib/story-blocks';

// 에디터에서 만들 수 있는 것만 허용 (문단, 줄바꿈, 굵게, 기울임, 취소선, 장면 전환, 인용, 템플릿 블록)
const ALLOWED_TAGS = ['p', 'br', 'strong', 'em', 's', 'hr', 'blockquote', 'div'];

export function sanitizeChapterHtml(html: string): string {
  const clean = sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    // div는 템플릿 블록용 속성(종류·내용·크기)만 허용. 블록 내용(JSON)과 크기는 아래에서 다시 검증한다
    allowedAttributes: { div: ['data-wn-block', 'data-wn-data', 'data-wn-size'] },
    // 속성 순서를 종류 → 내용 → 크기로 맞춘다 (lib/story-blocks.ts의 BLOCK_PATTERN이 이 순서만 알아본다).
    // 크기는 여기서 숫자로 고르고 원래 크기면 뺀다 (빈 값은 값 없는 속성으로 나와서 블록을 못 알아보게 되므로)
    transformTags: {
      div: (tagName, attribs) => {
        const size = normalizeBlockSize(attribs['data-wn-size']);
        return {
          tagName,
          attribs: {
            ...('data-wn-block' in attribs ? { 'data-wn-block': attribs['data-wn-block'] } : {}),
            ...('data-wn-data' in attribs ? { 'data-wn-data': attribs['data-wn-data'] } : {}),
            ...(size === BLOCK_SIZE.normal ? {} : { 'data-wn-size': String(size) }),
          },
        };
      },
    },
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

/**
 * 열람 화면 '이 회차 등장인물'용: 본문 글(문단마다 줄을 바꿔서, 문단 끝과 다음 문단 첫머리가 이어 붙지 않게)과
 * 템플릿을 텍스트로 내보내기와 같은 글로 푼 것들
 */
export function chapterTexts(html: string): string[] {
  return splitStoryContent(html).map((segment) => (segment.type === 'block' ? storyBlockToText(segment.block) : proseText(segment.html)));
}

/** 템플릿이 아닌 HTML 조각의 글 (문단·줄바꿈·장면 전환마다 줄을 바꿈) */
function proseText(html: string): string {
  return sanitizeHtml(html.replace(/<\/(p|blockquote)>|<br\s*\/?>|<hr\s*\/?>/g, '\n'), { allowedTags: [], allowedAttributes: {} }).replace(
    /&(amp|lt|gt|quot|#39|nbsp);/g,
    (entity) => ENTITIES[entity] ?? entity,
  );
}

/** 열람 '다음 화 미리 보기': 본문 첫 글 줄(템플릿·장면 전환·빈 문단은 건너뜀)의 첫 문장. 글 문단이 없으면 '' */
export function chapterOpening(html: string): string {
  for (const segment of splitStoryContent(html)) {
    if (segment.type === 'block') continue;
    const line = proseText(segment.html)
      .split('\n')
      .find((part) => part.trim());
    if (line) return firstSentence(line);
  }
  return '';
}

// 저장된 회차 HTML을 에디터 문서 모양(ProseMirror JSON 비슷한 DocNode)으로 바꾼다. 서버에서 작품 전체를 글로 내보낼 때 쓴다.
// 저장 HTML은 lib/content.ts의 정리를 거쳐 p · br · strong · em · s · hr · blockquote · 템플릿 div만 남아 있어서
// 무거운 HTML 해석기 없이 태그 단위로 읽는다. 템플릿은 story-blocks의 splitStoryContent가 따로 꺼내 준다

import type { DocNode } from '@/lib/chapter-text';
import { splitStoryContent } from '@/lib/story-blocks';

const NAMED: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, body: string) => {
    if (body[0] === '#') {
      const code = body[1] === 'x' || body[1] === 'X' ? Number.parseInt(body.slice(2), 16) : Number(body.slice(1));
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : entity;
    }
    return NAMED[body.toLowerCase()] ?? entity;
  });
}

const TOKEN = /<(\/?)([a-z0-9]+)\b[^>]*>|([^<]+)/gi;

/** 템플릿이 아닌 HTML 조각을 블록 노드들로 */
function htmlBlocks(html: string): DocNode[] {
  const blocks: DocNode[] = [];
  let quote: DocNode | null = null; // 열려 있는 인용
  let paragraph: DocNode | null = null; // 열려 있는 문단
  const container = () => (quote ? (quote.content ??= []) : blocks);
  const openParagraph = () => {
    if (!paragraph) {
      paragraph = { type: 'paragraph', content: [] };
      container().push(paragraph);
    }
    return paragraph;
  };

  for (const match of html.matchAll(TOKEN)) {
    const [, closing, rawName, text] = match;
    if (text !== undefined) {
      // 문단 사이 줄바꿈·공백만 있는 조각은 건너뛴다
      if (!paragraph && !text.trim()) continue;
      const node = openParagraph();
      (node.content ??= []).push({ type: 'text', text: decodeEntities(text) });
      continue;
    }
    const name = rawName.toLowerCase();
    if (name === 'p') {
      if (closing) paragraph = null;
      else {
        paragraph = null;
        openParagraph();
      }
    } else if (name === 'br' && !closing) {
      (openParagraph().content ??= []).push({ type: 'hardBreak' });
    } else if (name === 'hr' && !closing) {
      paragraph = null;
      container().push({ type: 'horizontalRule' });
    } else if (name === 'blockquote') {
      paragraph = null;
      if (closing) quote = null;
      else {
        quote = { type: 'blockquote', content: [] };
        blocks.push(quote);
      }
    }
    // strong · em · s 같은 글자 모양 태그는 글자만 남긴다
  }
  return blocks;
}

export function htmlToDoc(html: string): DocNode {
  const content: DocNode[] = [];
  for (const segment of splitStoryContent(html)) {
    if (segment.type === 'block') content.push({ type: 'storyBlock', attrs: { kind: segment.block.kind, data: segment.block.data } });
    else content.push(...htmlBlocks(segment.html));
  }
  return { type: 'doc', content };
}

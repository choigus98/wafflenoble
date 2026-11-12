import { StoryBlockView } from '@/components/story-block-view';
import { splitStoryContent, templateLabel } from '@/lib/story-blocks';

/** 회차 본문. 일반 문단은 저장된(정제된) HTML 그대로, 템플릿 블록은 카드 컴포넌트로 그린다 */
export function ChapterBody({ html }: { html: string }) {
  const segments = splitStoryContent(html);
  return (
    <div id="chapter-content" className="novel-body py-9">
      {segments.map((segment, index) =>
        segment.type === 'html' ? (
          <div key={index} className="contents" dangerouslySetInnerHTML={{ __html: segment.html }} />
        ) : (
          // data-template: 책갈피 첫머리에 템플릿 이름을 달 때 쓴다 (reader/chapter-bookmark.tsx)
          <div key={index} data-template={templateLabel(segment.block)} className="my-8">
            <StoryBlockView block={segment.block} />
          </div>
        ),
      )}
    </div>
  );
}

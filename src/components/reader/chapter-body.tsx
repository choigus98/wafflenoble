import { StoryBlockSize } from '@/components/story-block-size';
import { StoryBlockView } from '@/components/story-block-view';
import { templateSpeech } from '@/lib/speech';
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
          // data-speech: '소리 내어 듣기'가 카드 대신 읽을 글 (텍스트로 내보내기와 같은 글, reader/chapter-listen.tsx)
          <div key={index} data-template={templateLabel(segment.block)} data-speech={templateSpeech(segment.block)} className="my-8">
            <StoryBlockSize size={segment.size}>
              <StoryBlockView block={segment.block} />
            </StoryBlockSize>
          </div>
        ),
      )}
    </div>
  );
}

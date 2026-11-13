import { describe, expect, it } from 'vitest';
import { novelFileName, novelToText } from '@/lib/chapter-text';
import { decodeEntities, htmlToDoc } from '@/lib/html-doc';
import { createTemplate, serializeStoryBlock } from '@/lib/story-blocks';

describe('저장 HTML → 문서', () => {
  it('문단 · 줄바꿈 · 빈 문단 · 장면 전환 · 인용 · 글자 모양 · 특수 문자', () => {
    const doc = htmlToDoc(
      '<p>&quot;어디 가?&quot; <strong>그녀</strong>가 <em>물었다</em> &amp; <s>웃었다</s>.</p><p></p><p>첫 줄<br>둘째 줄</p><hr><blockquote><p>편지 &lt;1&gt;</p></blockquote><p>끝 &#39;진짜&#39; &#x1F600;</p>',
    );
    expect(doc.content?.map((node) => node.type)).toEqual(['paragraph', 'paragraph', 'paragraph', 'horizontalRule', 'blockquote', 'paragraph']);
    const text = (index: number) =>
      (doc.content?.[index].content ?? []).map((child) => (child.type === 'hardBreak' ? '\n' : child.text)).join('');
    expect(text(0)).toBe('"어디 가?" 그녀가 물었다 & 웃었다.');
    expect(text(1)).toBe('');
    expect(text(2)).toBe('첫 줄\n둘째 줄');
    expect(doc.content?.[4].content?.[0].content?.[0].text).toBe('편지 <1>');
    expect(text(5)).toBe("끝 '진짜' 😀");
  });

  it('템플릿은 그대로 템플릿 노드로', () => {
    const kakao = createTemplate('kakao-dm');
    const doc = htmlToDoc(`<p>앞</p>${serializeStoryBlock(kakao)}<p>뒤</p>`);
    expect(doc.content?.map((node) => node.type)).toEqual(['paragraph', 'storyBlock', 'paragraph']);
    expect(doc.content?.[1].attrs).toEqual({ kind: kakao.kind, data: kakao.data });
    // 크기를 바꾼 템플릿은 크기도 (에디터 문서처럼)
    expect(htmlToDoc(serializeStoryBlock(kakao, 80)).content?.[0].attrs).toEqual({ kind: kakao.kind, data: kakao.data, size: 80 });
  });

  it('특수 문자 풀기: 이름 · 숫자 · 16진수, 모르는 것은 그대로', () => {
    expect(decodeEntities('&lt;b&gt; &amp;amp; &nbsp;| &#65;&#x42; &unknown;')).toBe('<b> &amp; \u00a0| AB &unknown;');
  });
});

describe('작품 전체 텍스트', () => {
  it('맨 위 작품 이름·소개, 회차마다 구분선 · N화 제목 · 본문 · 작가의 말', () => {
    const text = novelToText({
      title: '달빛 와플 가게의 비밀',
      description: '자정에만 여는 와플 가게 이야기',
      chapters: [
        { position: 1, title: '자정의 손님', doc: htmlToDoc('<p>첫 문단</p><p>둘째 문단</p>'), authorNote: '읽어 주셔서 고마워요' },
        { position: 2, title: '', doc: htmlToDoc(''), authorNote: '' },
      ],
    });
    expect(text).toBe(
      [
        '『달빛 와플 가게의 비밀』',
        '',
        '자정에만 여는 와플 가게 이야기',
        '',
        '──────────',
        '',
        '1화 자정의 손님',
        '',
        '첫 문단',
        '둘째 문단',
        '',
        '[작가의 말]',
        '읽어 주셔서 고마워요',
        '',
        '──────────',
        '',
        '2화',
        '',
      ].join('\n'),
    );
  });

  it('내보낼 회차가 없으면 안내 한 줄, 파일 이름은 범위를 붙여서', () => {
    expect(novelToText({ title: '작품', description: '', chapters: [] })).toBe('『작품』\n\n(내보낼 회차가 없어요)\n');
    expect(novelFileName('달빛 와플 가게의 비밀', 'published')).toBe('달빛 와플 가게의 비밀 (발행 회차).txt');
    expect(novelFileName('a/b: "c"', 'all')).toBe('ab c (전체 회차).txt');
  });
});

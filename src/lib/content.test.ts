import { describe, expect, it } from 'vitest';
import { chapterTexts, countCharacters, htmlExcerpt, sanitizeChapterHtml } from '@/lib/content';
import { createTemplate } from '@/lib/story-blocks';

describe('본문 정제', () => {
  it('에디터에서 만들 수 있는 태그만 남긴다 (빈 태그는 <br /> 형태로 저장)', () => {
    const html =
      '<p>문단 <strong>굵게</strong> <em>기울임</em> <s>취소</s><br></p><hr><blockquote><p>인용</p></blockquote>';
    expect(sanitizeChapterHtml(html)).toBe(
      '<p>문단 <strong>굵게</strong> <em>기울임</em> <s>취소</s><br /></p><hr /><blockquote><p>인용</p></blockquote>',
    );
  });

  it('스크립트·이벤트·스타일·링크는 걷어낸다', () => {
    const dirty =
      '<p style="color:red" onclick="alert(1)">글</p><script>alert(1)</script><a href="javascript:alert(1)">링크</a><img src=x onerror=alert(1)>';
    const clean = sanitizeChapterHtml(dirty);
    expect(clean).toBe('<p>글</p>링크');
  });

  it('일반 div에는 속성을 남기지 않는다', () => {
    expect(sanitizeChapterHtml('<div class="x" data-foo="1">a</div>')).toBe('<div>a</div>');
  });
});

describe('글자수', () => {
  it('공백 포함으로 세고, 문단 사이 줄바꿈은 세지 않는다', () => {
    expect(countCharacters('<p>가나 다</p><p>라</p>')).toBe(5);
  });

  it('특수문자 이스케이프는 한 글자로 센다', () => {
    expect(countCharacters('<p>A &amp; B &lt;3</p>')).toBe(8);
  });

  it('템플릿 블록 안의 글은 세지 않는다', () => {
    expect(countCharacters('<p>본문</p><div data-wn-block="live" data-wn-data="{&quot;title&quot;:&quot;제목&quot;}"></div>')).toBe(2);
  });
});

describe('본문 첫머리 (발행본 목록용)', () => {
  it('문단 사이는 띄어쓰고 태그·템플릿 내용은 뺀다', () => {
    const html =
      '<p>문이 열린 건 &amp; 자정이었다.</p><div data-wn-block="kakao" data-wn-data="{&quot;script&quot;:&quot;비밀&quot;}"></div><p>종소리<br />대신</p>';
    expect(htmlExcerpt(html)).toBe('문이 열린 건 & 자정이었다. 종소리 대신');
  });

  it('길면 자르고 말줄임표', () => {
    expect(htmlExcerpt(`<p>${'가'.repeat(80)}</p>`, 10)).toBe(`${'가'.repeat(10)}…`);
    expect(htmlExcerpt('')).toBe('');
  });
});

describe("열람 화면 '이 회차 등장인물'용 글", () => {
  it('본문은 문단마다 줄을 바꾸고(글자 칸 기호 풀기), 템플릿은 텍스트로 내보내기와 같은 글로', () => {
    const memo = createTemplate('note');
    if (memo.kind !== 'note') throw new Error('쪽지 템플릿이 아니에요');
    const data = JSON.stringify({ ...memo.data, to: '지은에게', body: '고마워', from: '수진' }).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    const texts = chapterTexts(`<p>지은 &amp; 수진</p><p>둘째<br />줄</p><div data-wn-block="note" data-wn-data="${data}"></div><p>끝</p>`);
    expect(texts).toHaveLength(3);
    expect(texts[0]).toBe('지은 & 수진\n둘째\n줄\n');
    expect(texts[1].split('\n')).toEqual(['[쪽지 · 메모]', '지은에게', '고마워', '수진']);
    expect(texts[2]).toBe('끝\n');
  });
});
